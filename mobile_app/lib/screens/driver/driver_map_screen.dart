import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../../models/bin_model.dart';
import '../../models/pickup_request.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';
import '../../services/location_service.dart';
import '../../services/road_route_service.dart';
import '../../services/route_service.dart';

class DriverMapScreen extends StatefulWidget {
  const DriverMapScreen({super.key});

  @override
  State<DriverMapScreen> createState() => _DriverMapScreenState();
}

class _DriverMapScreenState extends State<DriverMapScreen> {
  final _fs = FirestoreService();
  final _locationService = LocationService();
  final _routeService = RouteService();
  final _roadRouteService = RoadRouteService();
  final _mapController = MapController();

  StreamSubscription? _gpsSub;
  StreamSubscription<List<PickupRequest>>? _requestSub;

  LatLng _driverPos = const LatLng(6.9069, 79.9723);
  bool _tripActive = false;
  List<SmartBin> _bins = [];
  List<SmartBin> _suggestedRoute = [];
  bool _showRoute = false;
  bool _loadingRoute = false;
  List<LatLng> _roadPoints = [];
  List<PickupRequest> _activeRequests = [];

  // IDs we've already triggered arrival for — avoid duplicate alerts
  final Set<String> _arrivedIds = {};

  // Arrival threshold in metres (300m to account for web GPS inaccuracy)
  static const double _arrivalThresholdM = 300;

  @override
  void initState() {
    super.initState();
    _requestSub = _fs.watchActiveRequests().listen((reqs) {
      if (mounted) setState(() => _activeRequests = reqs);
    });
  }

  @override
  void dispose() {
    _gpsSub?.cancel();
    _requestSub?.cancel();
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
              content: Text(
                  'Arrived at pickup point (${dist.toStringAsFixed(0)} m)'),
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
      _mapController.move(loc, _mapController.camera.zoom);
      _fs.uploadDriverLocation(driverId, pos.latitude, pos.longitude);
      _checkProximity(pos.latitude, pos.longitude);
    });
  }

  void _stopTrip() {
    _gpsSub?.cancel();
    setState(() {
      _tripActive = false;
      _showRoute = false;
      _suggestedRoute = [];
      _roadPoints = [];
    });
  }

  Future<void> _suggestRoute() async {
    final ordered = _routeService.suggestRoute(
      _bins,
      _driverPos.latitude,
      _driverPos.longitude,
    );
    setState(() {
      _suggestedRoute = ordered;
      _showRoute = true;
      _loadingRoute = true;
      _roadPoints = [];
    });

    // Build waypoints: driver → bins in priority order
    final waypoints = [
      _driverPos,
      ...ordered.map((b) => LatLng(b.lat, b.lng)),
    ];

    // Fetch real road geometry from OSRM
    final road = await _roadRouteService.getRoadRoute(waypoints);
    if (mounted) {
      setState(() {
        _roadPoints = road;
        _loadingRoute = false;
      });
    }

    final dist = _routeService.totalDistance(
      ordered,
      _driverPos.latitude,
      _driverPos.longitude,
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${ordered.length} stops — total ~${(dist / 1000).toStringAsFixed(2)} km',
          ),
        ),
      );
    }
  }

  void _showBinDetails(SmartBin bin) {
    final routeIndex = _showRoute ? _suggestedRoute.indexOf(bin) : -1;
    showModalBottomSheet(
      context: context,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.delete_outline,
                    color: _priorityColor(bin.priority), size: 28),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    bin.label,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: _priorityColor(bin.priority),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Priority: ${bin.priority.name.toUpperCase()}',
              style: TextStyle(
                  color: _priorityColor(bin.priority), fontSize: 13),
            ),
            const SizedBox(height: 12),
            _DetailRow('Fill level', '${bin.fillPercent.toStringAsFixed(0)}%'),
            _DetailRow('Methane', bin.methaneStatus.name.toUpperCase()),
            _DetailRow('Last updated', _formatTime(bin.lastUpdated)),
            if (routeIndex >= 0)
              _DetailRow('Route stop', '#${routeIndex + 1}'),
          ],
        ),
      ),
    );
  }

  Color _priorityColor(BinPriority p) {
    switch (p) {
      case BinPriority.red:
        return Colors.red;
      case BinPriority.yellow:
        return Colors.amber;
      case BinPriority.green:
        return Colors.green;
    }
  }

  List<Marker> _buildMarkers(List<SmartBin> bins) {
    final markers = <Marker>[
      Marker(
        point: _driverPos,
        width: 44,
        height: 44,
        child: const Icon(Icons.local_shipping,
            color: Colors.indigo, size: 36),
      ),
    ];

    // Pickup request markers
    for (final req in _activeRequests) {
      markers.add(
        Marker(
          point: LatLng(req.lat, req.lng),
          width: 40,
          height: 40,
          child: const Icon(Icons.flag, color: Colors.green, size: 36),
        ),
      );
    }

    for (int i = 0; i < bins.length; i++) {
      final bin = bins[i];
      final color = _priorityColor(bin.priority);
      final routeIndex = _showRoute ? _suggestedRoute.indexOf(bin) : -1;
      markers.add(
        Marker(
          point: LatLng(bin.lat, bin.lng),
          width: 44,
          height: 52,
          child: GestureDetector(
            onTap: () => _showBinDetails(bin),
            child: Stack(
              alignment: Alignment.topCenter,
              children: [
                Icon(Icons.location_pin, color: color, size: 44),
                if (routeIndex >= 0)
                  Positioned(
                    top: 2,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '${routeIndex + 1}',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: color,
                        ),
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
    // Use road geometry if available, otherwise straight lines as fallback
    if (_roadPoints.isNotEmpty) return _roadPoints;
    return [
      _driverPos,
      ..._suggestedRoute.map((b) => LatLng(b.lat, b.lng)),
    ];
  }

  String _formatTime(DateTime dt) {
    return '${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bin Priority Map'),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
        actions: [
          if (_activeRequests.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Badge.count(
                count: _activeRequests.length,
                child: const Icon(Icons.flag, color: Colors.white),
              ),
            ),
          if (!_tripActive)
            TextButton.icon(
              icon: const Icon(Icons.play_arrow, color: Colors.white),
              label: const Text('Start Trip',
                  style: TextStyle(color: Colors.white)),
              onPressed: _startTrip,
            )
          else
            TextButton.icon(
              icon: const Icon(Icons.stop, color: Colors.redAccent),
              label: const Text('End Trip',
                  style: TextStyle(color: Colors.white)),
              onPressed: _stopTrip,
            ),
        ],
      ),
      body: StreamBuilder<List<SmartBin>>(
        stream: _fs.watchBins(),
        builder: (context, snap) {
          _bins = snap.data ?? [];
          final markers = _buildMarkers(_bins);
          final routePoints = _buildRoutePoints();

          return Stack(
            children: [
              FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: _driverPos,
                  initialZoom: 15,
                ),
                children: [
                  TileLayer(
                    urlTemplate:
                        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.r26it126.mobile_app',
                  ),
                  if (routePoints.isNotEmpty)
                    PolylineLayer(
                      polylines: [
                        Polyline(
                          points: routePoints,
                          strokeWidth: 3,
                          color: Colors.indigo.withValues(alpha: 0.7),
                        ),
                      ],
                    ),
                  MarkerLayer(markers: markers),
                ],
              ),
              // Legend
              Positioned(
                top: 12,
                left: 12,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: const [
                      BoxShadow(blurRadius: 4, color: Colors.black26)
                    ],
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _LegendItem(color: Colors.red, label: 'Urgent (Red)'),
                      _LegendItem(
                          color: Colors.amber, label: 'Medium (Yellow)'),
                      _LegendItem(color: Colors.green, label: 'Low (Green)'),
                      _LegendItem(
                          color: Colors.indigo, label: 'Driver (You)'),
                      _LegendItem(
                          color: Colors.green,
                          label: 'Pickup Request',
                          icon: Icons.flag),
                    ],
                  ),
                ),
              ),
              // Route button
              Positioned(
                bottom: 24,
                left: 16,
                right: 16,
                child: ElevatedButton.icon(
                  icon: _loadingRoute
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.alt_route),
                  label: Text(_loadingRoute
                      ? 'Loading road route...'
                      : _showRoute
                          ? 'Route Active (${_suggestedRoute.length} stops)'
                          : 'Suggest Route'),
                  onPressed: (_bins.isEmpty || _loadingRoute) ? null : _suggestRoute,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.indigo,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text('$label: ',
              style: const TextStyle(color: Colors.grey, fontSize: 14)),
          Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.w600, fontSize: 14)),
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
      {required this.color,
      required this.label,
      this.icon = Icons.circle});

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
