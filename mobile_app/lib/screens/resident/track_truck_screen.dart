import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../models/pickup_request.dart';
import '../../services/firestore_service.dart';
import '../../services/location_service.dart';
import '../../services/road_route_service.dart';
import '../../widgets/map_recenter_button.dart';

// Same fallback used by Flag Placement / the driver map when GPS isn't
// available yet — keeps the map showing something sensible immediately.
const _defaultCenter = LatLng(6.9069, 79.9723);

class TrackTruckScreen extends StatefulWidget {
  // Null when opened from "Track Trucks Nearby" (no specific pickup to
  // center on or flag) rather than from one resident's own request card.
  final PickupRequest? request;
  const TrackTruckScreen({super.key, this.request});

  @override
  State<TrackTruckScreen> createState() => _TrackTruckScreenState();
}

class _TrackTruckScreenState extends State<TrackTruckScreen> {
  final _fs = FirestoreService();
  final _roadRouteService = RoadRouteService();
  final _mapController = MapController();
  StreamSubscription<List<Map<String, dynamic>>>? _driverLocationsSub;
  Timer? _staleCheckTimer;

  List<Map<String, dynamic>> _allDrivers = [];
  LatLng _ownCenter = _defaultCenter;

  // Which driver's route is currently drawn to the pickup point — only
  // meaningful when widget.request != null. Re-evaluated continuously as
  // positions update, not decided once.
  String? _trackedDriverId;
  List<LatLng> _roadPoints = [];
  bool _loadingRoute = false;
  DateTime? _lastRouteActionAt;

  // A driver's last-known position is hidden once it's older than this — a
  // safety net for trips that end abnormally (crash, closed tab) without
  // ever deleting their Firestore doc.
  static const _staleAfter = Duration(seconds: 60);

  // A different truck only takes over the tracked route if it's closer by
  // more than this, and only after this cooldown — otherwise two trucks at
  // similar distances would flicker the route back and forth between them.
  static const _switchMarginM = 100;
  static const _routeActionCooldown = Duration(seconds: 15);
  static const _offRouteThresholdM = 150;

  @override
  void initState() {
    super.initState();
    _driverLocationsSub = _fs.watchPickupModeDriverLocations().listen((drivers) {
      if (!mounted) return;
      setState(() => _allDrivers = drivers);
      _updateTracking();
    });
    // Re-check staleness periodically even when no new Firestore data
    // arrives, so an abandoned truck marker (and its route) still fades
    // away on its own.
    _staleCheckTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!mounted) return;
      setState(() {});
      _updateTracking();
    });
    if (widget.request == null) _loadOwnLocation();
  }

  @override
  void dispose() {
    _driverLocationsSub?.cancel();
    _staleCheckTimer?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  // Only needed in "Trucks Nearby" mode, to center the map on the resident
  // instead of a specific pickup point.
  Future<void> _loadOwnLocation() async {
    final pos = await LocationService().getCurrentPosition();
    if (!mounted || pos == null) return;
    final loc = LatLng(pos.latitude, pos.longitude);
    setState(() => _ownCenter = loc);
    _mapController.move(loc, 15);
  }

  List<Map<String, dynamic>> get _liveDrivers {
    final cutoff = DateTime.now().subtract(_staleAfter);
    return _allDrivers.where((d) {
      final updatedAt = d['updatedAt'] as DateTime?;
      return updatedAt != null && updatedAt.isAfter(cutoff);
    }).toList();
  }

  double _haversine(LatLng a, LatLng b) {
    const r = 6371000.0;
    final dLat = (b.latitude - a.latitude) * pi / 180;
    final dLng = (b.longitude - a.longitude) * pi / 180;
    final x = sin(dLat / 2) * sin(dLat / 2) +
        cos(a.latitude * pi / 180) *
            cos(b.latitude * pi / 180) *
            sin(dLng / 2) *
            sin(dLng / 2);
    return r * 2 * atan2(sqrt(x), sqrt(1 - x));
  }

  double _minDistanceToRoute(LatLng point, List<LatLng> route) {
    double minDist = double.infinity;
    for (final p in route) {
      final d = _haversine(point, p);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  Map<String, dynamic>? _driverById(String id) {
    for (final d in _liveDrivers) {
      if (d['driverId'] == id) return d;
    }
    return null;
  }

  bool get _cooldownElapsed =>
      _lastRouteActionAt == null ||
      DateTime.now().difference(_lastRouteActionAt!) >= _routeActionCooldown;

  void _updateTracking() {
    final req = widget.request;
    if (req == null) return; // no fixed destination to route to

    final pickupPoint = LatLng(req.lat, req.lng);
    final drivers = _liveDrivers;

    if (drivers.isEmpty) {
      if (_trackedDriverId != null) {
        setState(() {
          _trackedDriverId = null;
          _roadPoints = [];
        });
      }
      return;
    }

    String nearestId = drivers.first['driverId'] as String;
    double nearestDist = _haversine(
        pickupPoint, LatLng(drivers.first['lat'], drivers.first['lng']));
    for (final d in drivers.skip(1)) {
      final dist = _haversine(pickupPoint, LatLng(d['lat'], d['lng']));
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestId = d['driverId'] as String;
      }
    }

    if (_trackedDriverId == null) {
      _switchTrackedDriver(nearestId, pickupPoint);
      return;
    }

    if (nearestId == _trackedDriverId) {
      _checkOffRouteForTracked(pickupPoint);
      return;
    }

    final trackedDriver = _driverById(_trackedDriverId!);
    if (trackedDriver == null) {
      // Previously-tracked truck isn't live anymore — switch immediately,
      // no margin/cooldown needed since there's nothing to flicker against.
      _switchTrackedDriver(nearestId, pickupPoint);
      return;
    }

    final trackedDist = _haversine(
        pickupPoint, LatLng(trackedDriver['lat'], trackedDriver['lng']));
    final closerByMargin = (trackedDist - nearestDist) > _switchMarginM;
    if (closerByMargin && _cooldownElapsed) {
      _switchTrackedDriver(nearestId, pickupPoint);
    } else {
      _checkOffRouteForTracked(pickupPoint);
    }
  }

  Future<void> _switchTrackedDriver(String driverId, LatLng pickupPoint) async {
    _lastRouteActionAt = DateTime.now();
    setState(() {
      _trackedDriverId = driverId;
      _loadingRoute = true;
    });
    final driver = _driverById(driverId);
    if (driver == null) {
      if (mounted) setState(() => _loadingRoute = false);
      return;
    }
    final from = LatLng(driver['lat'], driver['lng']);
    final road = await _roadRouteService.getRoadRoute([from, pickupPoint]);
    if (mounted) {
      setState(() {
        _roadPoints = road;
        _loadingRoute = false;
      });
    }
  }

  void _checkOffRouteForTracked(LatLng pickupPoint) {
    if (_roadPoints.isEmpty || _trackedDriverId == null || !_cooldownElapsed) {
      return;
    }
    final driver = _driverById(_trackedDriverId!);
    if (driver == null) return;
    final driverPos = LatLng(driver['lat'], driver['lng']);
    if (_minDistanceToRoute(driverPos, _roadPoints) > _offRouteThresholdM) {
      _switchTrackedDriver(_trackedDriverId!, pickupPoint);
    }
  }

  // Trims the already-driven portion off the front of the route so only the
  // remaining path ahead of the tracked truck is drawn/measured.
  List<LatLng> _visibleRoutePoints(LatLng driverPos) {
    if (_roadPoints.isEmpty) return _roadPoints;
    int nearestIndex = 0;
    double nearestDist = double.infinity;
    for (int i = 0; i < _roadPoints.length; i++) {
      final d = _haversine(driverPos, _roadPoints[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIndex = i;
      }
    }
    return _roadPoints.sublist(nearestIndex);
  }

  double _remainingDistanceM(List<LatLng> visibleRoute, LatLng driverPos, LatLng destination) {
    if (visibleRoute.length < 2) return _haversine(driverPos, destination);
    double total = 0;
    for (int i = 0; i < visibleRoute.length - 1; i++) {
      total += _haversine(visibleRoute[i], visibleRoute[i + 1]);
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final request = widget.request;
    final pickupPoint =
        request != null ? LatLng(request.lat, request.lng) : _ownCenter;
    final drivers = _liveDrivers;

    final trackedDriver =
        _trackedDriverId != null ? _driverById(_trackedDriverId!) : null;
    List<LatLng> visibleRoute = [];
    double? remainingM;
    if (request != null && trackedDriver != null && _roadPoints.isNotEmpty) {
      final driverPos = LatLng(trackedDriver['lat'], trackedDriver['lng']);
      visibleRoute = _visibleRoutePoints(driverPos);
      remainingM = _remainingDistanceM(visibleRoute, driverPos, pickupPoint);
    }

    final markers = <Marker>[
      if (request != null)
        Marker(
          point: pickupPoint,
          width: 40,
          height: 40,
          child: const Icon(Icons.flag, color: Colors.green, size: 36),
        ),
      for (final d in drivers)
        Marker(
          point: LatLng(d['lat'] as double, d['lng'] as double),
          width: 44,
          height: 44,
          child: const Icon(Icons.local_shipping,
              color: Colors.indigo, size: 36),
        ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(request != null ? 'Track Truck' : 'Trucks Nearby'),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: pickupPoint,
              initialZoom: 15,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.r26it126.mobile_app',
              ),
              if (visibleRoute.length > 1)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: visibleRoute,
                      strokeWidth: 5,
                      color: Colors.indigo,
                    ),
                  ],
                ),
              MarkerLayer(markers: markers),
            ],
          ),
          if (_loadingRoute)
            const Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: LinearProgressIndicator(color: Colors.indigo),
            ),
          if (drivers.isEmpty)
            Positioned(
              top: 12,
              left: 12,
              right: 12,
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: const [
                    BoxShadow(blurRadius: 4, color: Colors.black26),
                  ],
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.grey, size: 18),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'No truck is currently live. It will appear '
                        'here once a driver starts their trip.',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (remainingM != null)
            Positioned(
              top: 12,
              left: 12,
              right: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: const [
                    BoxShadow(blurRadius: 4, color: Colors.black26),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.route, size: 18, color: Colors.indigo),
                    const SizedBox(width: 8),
                    Text(
                      '${(remainingM / 1000).toStringAsFixed(2)} km away'
                      '${drivers.length > 1 ? ' (nearest truck)' : ''}',
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          Positioned(
            bottom: 12,
            left: 12,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                boxShadow: const [
                  BoxShadow(blurRadius: 4, color: Colors.black26),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (request != null)
                    const _LegendItem(
                        color: Colors.green,
                        label: 'Your Pickup',
                        icon: Icons.flag),
                  const _LegendItem(
                      color: Colors.indigo,
                      label: 'Truck',
                      icon: Icons.local_shipping),
                ],
              ),
            ),
          ),
          Positioned(
            bottom: 16,
            right: 16,
            child: MapRecenterButton(
              onPressed: () => _mapController.move(pickupPoint, 15),
            ),
          ),
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;
  final IconData icon;

  const _LegendItem(
      {required this.color, required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}
