import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../../models/bin_model.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';
import '../../services/location_service.dart';
import '../../services/road_route_service.dart';
import '../../services/route_service.dart';
import '../../utils/geo_utils.dart';
import '../../widgets/map_recenter_button.dart';

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

  LatLng _driverPos = const LatLng(6.9069, 79.9723);
  bool _tripActive = false;
  List<SmartBin> _bins = [];
  List<SmartBin> _suggestedRoute = [];
  bool _showRoute = false;
  bool _loadingRoute = false;
  List<LatLng> _roadPoints = [];

  // Camera auto-follows the driver's live position until they manually pan
  // the map, at which point it stops — the recenter button brings it back.
  bool _autoFollow = true;

  // Throttle how often we push the driver's position to Firestore — the raw
  // GPS stream can fire far more often than that, and hammering one document
  // with unthrottled writes made updates lag badly for anyone watching it.
  DateTime? _lastLocationUploadAt;
  static const Duration _locationUploadInterval = Duration(seconds: 3);

  // Firestore's offline cache makes a location write "succeed" locally even
  // with no network, so upload failures never surface. Watch the device's
  // actual network state instead — this is what genuinely predicts whether
  // the driver's position is reaching anyone tracking them.
  bool _hasConnectivityIssue = false;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;

  // Auto-reroute when the driver strays this far from the displayed route
  // (e.g. takes a different road) — mirrors Google Maps' off-route recalc.
  DateTime? _lastRerouteAt;
  static const double _offRouteThresholdM = 150;
  static const Duration _rerouteCooldown = Duration(seconds: 15);

  @override
  void initState() {
    super.initState();
    Connectivity().checkConnectivity().then((result) {
      if (mounted) {
        setState(() => _hasConnectivityIssue = _isOffline(result));
      }
    });
    _connectivitySub =
        Connectivity().onConnectivityChanged.listen((result) {
      if (mounted) {
        setState(() => _hasConnectivityIssue = _isOffline(result));
      }
    });
  }

  bool _isOffline(List<ConnectivityResult> result) =>
      result.every((r) => r == ConnectivityResult.none);

  @override
  void dispose() {
    _gpsSub?.cancel();
    _connectivitySub?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  void _checkOffRoute(double lat, double lng) {
    if (!_showRoute || _loadingRoute || _bins.isEmpty) return;
    final routePoints = _buildRoutePoints();
    if (routePoints.isEmpty) return;

    final now = DateTime.now();
    final cooldownElapsed = _lastRerouteAt == null ||
        now.difference(_lastRerouteAt!) >= _rerouteCooldown;
    if (!cooldownElapsed) return;

    if (minDistanceToRoute(LatLng(lat, lng), routePoints) > _offRouteThresholdM) {
      _lastRerouteAt = now;
      _suggestRoute();
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
            .uploadDriverLocation(driverId, pos.latitude, pos.longitude, mode: 'bins')
            .catchError((e) => debugPrint('Failed to upload driver location: $e'));
      }

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
      builder: (sheetContext) => Padding(
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
            const Text(
              'Requires immediate collection',
              style: TextStyle(color: Colors.red, fontSize: 13, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            _DetailRow('Critical for', _formatDuration(bin.criticalSince)),
            if (routeIndex >= 0)
              _DetailRow('Route stop', '#${routeIndex + 1}'),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.check_circle_outline),
                label: const Text('Mark Collected'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                onPressed: () {
                  Navigator.of(sheetContext).pop();
                  _confirmMarkCollected(bin);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmMarkCollected(SmartBin bin) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Mark as Collected?'),
        content: Text('This will remove "${bin.label}" from the map for all drivers.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
            child: const Text('Mark Collected'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await _fs.markBinCollected(bin.id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update bin. Please try again.')),
        );
      }
    }
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

  // Trims the already-driven portion off the front of the route so only the
  // remaining path ahead of the driver is drawn — mirrors turn-by-turn nav.
  List<LatLng> _visibleRoutePoints(List<LatLng> fullRoute) {
    if (fullRoute.isEmpty) return fullRoute;
    int nearestIndex = 0;
    double nearestDist = double.infinity;
    for (int i = 0; i < fullRoute.length; i++) {
      final d = haversineMeters(_driverPos.latitude, _driverPos.longitude,
          fullRoute[i].latitude, fullRoute[i].longitude);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIndex = i;
      }
    }
    return fullRoute.sublist(nearestIndex);
  }

  // "Critical for" reads as a stronger urgency signal to a driver than a
  // raw fill percentage would — a bin that's been waiting for hours matters
  // more than one that just crossed the threshold a minute ago.
  String _formatDuration(DateTime? since) {
    if (since == null) return 'Unknown';
    final elapsed = DateTime.now().difference(since);
    if (elapsed.inMinutes < 1) return 'Just now';
    if (elapsed.inHours < 1) return '${elapsed.inMinutes}m';
    final hours = elapsed.inHours;
    final minutes = elapsed.inMinutes % 60;
    return minutes == 0 ? '${hours}h' : '${hours}h ${minutes}m';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bin Priority Map'),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
        actions: [
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
              if (_tripActive && _hasConnectivityIssue)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    color: Colors.orange,
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.wifi_off, size: 16, color: Colors.white),
                        SizedBox(width: 8),
                        Text(
                          'Location not updating — check your connection',
                          style: TextStyle(
                              color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ),
              // Legend
              Positioned(
                top: (_tripActive && _hasConnectivityIssue) ? 48 : 12,
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
                      _LegendItem(color: Colors.red, label: 'Critical Bin'),
                      _LegendItem(
                          color: Colors.indigo, label: 'Driver (You)'),
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
              Positioned(
                bottom: 84,
                right: 16,
                child: MapRecenterButton(onPressed: _recenter),
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

  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.circle, color: color, size: 12),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}
