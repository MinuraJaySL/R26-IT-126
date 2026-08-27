import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../../models/pickup_request.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';
import '../../services/location_service.dart';
import '../../services/road_route_service.dart';
import '../../widgets/map_recenter_button.dart';

/// Live route through active pickup requests only — the pickup-request
/// counterpart to the Bin Priority Map, deliberately kept separate so a
/// driver doing resident pickups is never the reason an urgent bin overflows
/// (and vice versa). Uploads the driver's position tagged mode: 'pickups',
/// which is what makes them visible to residents on Track Truck.
class DriverPickupRouteScreen extends StatefulWidget {
  const DriverPickupRouteScreen({super.key});

  @override
  State<DriverPickupRouteScreen> createState() => _DriverPickupRouteScreenState();
}

class _DriverPickupRouteScreenState extends State<DriverPickupRouteScreen> {
  final _fs = FirestoreService();
  final _locationService = LocationService();
  final _roadRouteService = RoadRouteService();
  final _mapController = MapController();

  StreamSubscription? _gpsSub;

  LatLng _driverPos = const LatLng(6.9069, 79.9723);
  bool _tripActive = false;
  List<PickupRequest> _activeRequests = [];
  List<PickupRequest> _suggestedRoute = [];
  bool _showRoute = false;
  bool _loadingRoute = false;
  List<LatLng> _roadPoints = [];

  // Camera auto-follows the driver's live position until they manually pan
  // the map, at which point it stops — the recenter button brings it back.
  bool _autoFollow = true;

  // IDs we've already triggered arrival for — avoid duplicate alerts
  final Set<String> _arrivedIds = {};
  static const double _arrivalThresholdM = 300;

  DateTime? _lastLocationUploadAt;
  static const Duration _locationUploadInterval = Duration(seconds: 3);

  DateTime? _lastRerouteAt;
  static const double _offRouteThresholdM = 150;
  static const Duration _rerouteCooldown = Duration(seconds: 15);

  @override
  void dispose() {
    _gpsSub?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  double _haversine(double lat1, double lng1, double lat2, double lng2) {
    const r = 6371000.0;
    final dLat = (lat2 - lat1) * pi / 180;
    final dLng = (lng2 - lng1) * pi / 180;
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * pi / 180) *
            cos(lat2 * pi / 180) *
            sin(dLng / 2) *
            sin(dLng / 2);
    return r * 2 * atan2(sqrt(a), sqrt(1 - a));
  }

  double _minDistanceToRoute(double lat, double lng, List<LatLng> routePoints) {
    double minDist = double.infinity;
    for (final p in routePoints) {
      final d = _haversine(lat, lng, p.latitude, p.longitude);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  void _checkOffRoute(double lat, double lng) {
    if (!_showRoute || _loadingRoute || _activeRequests.isEmpty) return;
    final routePoints = _buildRoutePoints();
    if (routePoints.isEmpty) return;

    final now = DateTime.now();
    final cooldownElapsed = _lastRerouteAt == null ||
        now.difference(_lastRerouteAt!) >= _rerouteCooldown;
    if (!cooldownElapsed) return;

    if (_minDistanceToRoute(lat, lng, routePoints) > _offRouteThresholdM) {
      _lastRerouteAt = now;
      _suggestRoute();
    }
  }

  void _checkProximity(double lat, double lng) {
    for (final req in _activeRequests) {
      if (_arrivedIds.contains(req.id)) continue;
      final dist = _haversine(lat, lng, req.lat, req.lng);
      if (dist <= _arrivalThresholdM) {
        _arrivedIds.add(req.id);
        _fs.updateRequestStatus(req.id, RequestStatus.arrived);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Arrived at pickup point (${dist.toStringAsFixed(0)} m)'),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    }
  }

  void _startTrip() {
    final driverId = context.read<AuthProvider>().user!.uid;
    setState(() => _tripActive = true);
    _gpsSub = _locationService.positionStream().listen((pos) {
      final loc = LatLng(pos.latitude, pos.longitude);
      setState(() => _driverPos = loc);
      if (_autoFollow) _mapController.move(loc, _mapController.camera.zoom);

      final now = DateTime.now();
      if (_lastLocationUploadAt == null ||
          now.difference(_lastLocationUploadAt!) >= _locationUploadInterval) {
        _lastLocationUploadAt = now;
        _fs
            .uploadDriverLocation(driverId, pos.latitude, pos.longitude, mode: 'pickups')
            .catchError((e) => debugPrint('Failed to upload driver location: $e'));
      }

      _checkProximity(pos.latitude, pos.longitude);
      _checkOffRoute(pos.latitude, pos.longitude);
    });
  }

  void _recenter() {
    setState(() => _autoFollow = true);
    _mapController.move(_driverPos, _mapController.camera.zoom);
  }

  void _stopTrip() {
    _gpsSub?.cancel();
    _lastLocationUploadAt = null;
    _lastRerouteAt = null;
    final driverId = context.read<AuthProvider>().user!.uid;
    _fs
        .deleteDriverLocation(driverId)
        .catchError((e) => debugPrint('Failed to clear driver location: $e'));
    setState(() {
      _tripActive = false;
      _showRoute = false;
      _suggestedRoute = [];
      _roadPoints = [];
    });
  }

  // Greedy nearest-neighbour — same heuristic as RouteService, just without
  // bin priority tiers since a pickup request has no such grouping.
  List<PickupRequest> _nearestNeighbourOrder(
      List<PickupRequest> requests, double startLat, double startLng) {
    if (requests.isEmpty) return [];
    final remaining = List<PickupRequest>.from(requests);
    final ordered = <PickupRequest>[];
    double curLat = startLat, curLng = startLng;

    while (remaining.isNotEmpty) {
      PickupRequest nearest = remaining[0];
      double nearestDist = _haversine(curLat, curLng, nearest.lat, nearest.lng);
      for (int i = 1; i < remaining.length; i++) {
        final d = _haversine(curLat, curLng, remaining[i].lat, remaining[i].lng);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = remaining[i];
        }
      }
      remaining.remove(nearest);
      ordered.add(nearest);
      curLat = nearest.lat;
      curLng = nearest.lng;
    }
    return ordered;
  }

  Future<void> _suggestRoute() async {
    final ordered = _nearestNeighbourOrder(
      _activeRequests,
      _driverPos.latitude,
      _driverPos.longitude,
    );
    setState(() {
      _suggestedRoute = ordered;
      _showRoute = true;
      _loadingRoute = true;
      _roadPoints = [];
    });

    final waypoints = [
      _driverPos,
      ...ordered.map((r) => LatLng(r.lat, r.lng)),
    ];

    final road = await _roadRouteService.getRoadRoute(waypoints);
    if (mounted) {
      setState(() {
        _roadPoints = road;
        _loadingRoute = false;
      });
    }
  }

  void _showRequestDetails(PickupRequest req) {
    final routeIndex = _showRoute ? _suggestedRoute.indexOf(req) : -1;
    showModalBottomSheet(
      context: context,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.flag, color: Colors.green, size: 28),
                SizedBox(width: 8),
                Text(
                  'Pickup Request',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.green),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Location: ${req.lat.toStringAsFixed(5)}, ${req.lng.toStringAsFixed(5)}',
              style: const TextStyle(fontSize: 14),
            ),
            if (routeIndex >= 0) ...[
              const SizedBox(height: 4),
              Text('Route stop: #${routeIndex + 1}',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            ],
          ],
        ),
      ),
    );
  }

  List<Marker> _buildMarkers() {
    final markers = <Marker>[
      Marker(
        point: _driverPos,
        width: 44,
        height: 44,
        child: const Icon(Icons.local_shipping, color: Colors.indigo, size: 36),
      ),
    ];

    for (final req in _activeRequests) {
      final routeIndex = _showRoute ? _suggestedRoute.indexOf(req) : -1;
      markers.add(
        Marker(
          point: LatLng(req.lat, req.lng),
          width: 40,
          height: 48,
          child: GestureDetector(
            onTap: () => _showRequestDetails(req),
            child: Stack(
              alignment: Alignment.topCenter,
              children: [
                const Icon(Icons.flag, color: Colors.green, size: 36),
                if (routeIndex >= 0)
                  Positioned(
                    top: 0,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                      child: Text(
                        '${routeIndex + 1}',
                        style: const TextStyle(
                            fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
    }
    return markers;
  }

  List<LatLng> _buildRoutePoints() {
    if (!_showRoute || _suggestedRoute.isEmpty) return [];
    if (_roadPoints.isNotEmpty) return _roadPoints;
    return [
      _driverPos,
      ..._suggestedRoute.map((r) => LatLng(r.lat, r.lng)),
    ];
  }

  List<LatLng> _visibleRoutePoints(List<LatLng> fullRoute) {
    if (fullRoute.isEmpty) return fullRoute;
    int nearestIndex = 0;
    double nearestDist = double.infinity;
    for (int i = 0; i < fullRoute.length; i++) {
      final d = _haversine(_driverPos.latitude, _driverPos.longitude,
          fullRoute[i].latitude, fullRoute[i].longitude);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIndex = i;
      }
    }
    return fullRoute.sublist(nearestIndex);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pickup Requests Route'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
        actions: [
          if (!_tripActive)
            TextButton.icon(
              icon: const Icon(Icons.play_arrow, color: Colors.white),
              label: const Text('Start Trip', style: TextStyle(color: Colors.white)),
              onPressed: _startTrip,
            )
          else
            TextButton.icon(
              icon: const Icon(Icons.stop, color: Colors.redAccent),
              label: const Text('End Trip', style: TextStyle(color: Colors.white)),
              onPressed: _stopTrip,
            ),
        ],
      ),
      body: StreamBuilder<List<PickupRequest>>(
        stream: _fs.watchActiveRequests(),
        builder: (context, snap) {
          _activeRequests =
              (snap.data ?? []).where((r) => r.status == RequestStatus.active).toList();
          final markers = _buildMarkers();
          final routePoints = _visibleRoutePoints(_buildRoutePoints());

          return Stack(
            children: [
              FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: _driverPos,
                  initialZoom: 15,
                  onMapEvent: (event) {
                    if (event.source != MapEventSource.mapController && _autoFollow) {
                      setState(() => _autoFollow = false);
                    }
                  },
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.r26it126.mobile_app',
                  ),
                  if (routePoints.isNotEmpty)
                    PolylineLayer(
                      polylines: [
                        Polyline(
                          points: routePoints,
                          strokeWidth: 3,
                          color: Colors.green.withValues(alpha: 0.7),
                        ),
                      ],
                    ),
                  MarkerLayer(markers: markers),
                ],
              ),
              Positioned(
                top: 12,
                left: 12,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: const [BoxShadow(blurRadius: 4, color: Colors.black26)],
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _LegendItem(icon: Icons.flag, color: Colors.green, label: 'Pickup Request'),
                      _LegendItem(
                          icon: Icons.local_shipping, color: Colors.indigo, label: 'Driver (You)'),
                    ],
                  ),
                ),
              ),
              Positioned(
                bottom: 24,
                left: 16,
                right: 16,
                child: ElevatedButton.icon(
                  icon: _loadingRoute
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.alt_route),
                  label: Text(_loadingRoute
                      ? 'Loading road route...'
                      : _showRoute
                          ? 'Route Active (${_suggestedRoute.length} stops)'
                          : 'Suggest Route'),
                  onPressed:
                      (_activeRequests.isEmpty || _loadingRoute) ? null : _suggestRoute,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
              Positioned(
                bottom: 84,
                right: 16,
                child: MapRecenterButton(color: Colors.green, onPressed: _recenter),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;

  const _LegendItem({required this.icon, required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 12),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}
