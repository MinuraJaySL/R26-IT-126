import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../services/location_service.dart';
import '../../services/road_route_service.dart';
import '../../utils/geo_utils.dart';
import '../../widgets/map_recenter_button.dart';

/// Live turn-by-turn-style navigation from the driver's current position to
/// a single destination point — the shared mechanism behind "Navigate to
/// Report" and "Navigate to Missed Pickup" (same route/GPS/off-route-recalc
/// logic used for pickup requests in driver_map_screen, just pointed at one
/// destination instead of a multi-stop route).
class NavigateToPointScreen extends StatefulWidget {
  final LatLng destination;
  final String title;
  final String? subtitle;
  final Color accentColor;
  final IconData destinationIcon;
  final String? actionLabel;
  final Future<bool> Function(BuildContext context)? onAction;

  const NavigateToPointScreen({
    super.key,
    required this.destination,
    required this.title,
    this.subtitle,
    this.accentColor = Colors.red,
    this.destinationIcon = Icons.location_on,
    this.actionLabel,
    this.onAction,
  });

  @override
  State<NavigateToPointScreen> createState() => _NavigateToPointScreenState();
}

class _NavigateToPointScreenState extends State<NavigateToPointScreen> {
  final _locationService = LocationService();
  final _roadRouteService = RoadRouteService();
  final _mapController = MapController();

  StreamSubscription? _gpsSub;
  LatLng _driverPos = const LatLng(6.9069, 79.9723);
  List<LatLng> _roadPoints = [];
  bool _loadingRoute = true;
  bool _gotInitialFix = false;

  // Camera auto-follows the driver's live position until they manually pan
  // the map, at which point it stops — the recenter button brings it back.
  bool _autoFollow = true;

  DateTime? _lastRerouteAt;
  static const double _offRouteThresholdM = 150;
  static const Duration _rerouteCooldown = Duration(seconds: 15);

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _gpsSub?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    final pos = await _locationService.getCurrentPosition();
    if (pos != null && mounted) {
      setState(() => _driverPos = LatLng(pos.latitude, pos.longitude));
    }
    _gotInitialFix = true;
    await _fetchRoute();

    _gpsSub = _locationService.positionStream().listen((pos) {
      final loc = LatLng(pos.latitude, pos.longitude);
      if (!mounted) return;
      setState(() => _driverPos = loc);
      if (_autoFollow) _mapController.move(loc, _mapController.camera.zoom);
      _checkOffRoute();
    });
  }

  void _recenter() {
    setState(() => _autoFollow = true);
    _mapController.move(_driverPos, _mapController.camera.zoom);
  }

  Future<void> _fetchRoute() async {
    if (mounted) setState(() => _loadingRoute = true);
    final road = await _roadRouteService
        .getRoadRoute([_driverPos, widget.destination]);
    if (mounted) {
      setState(() {
        _roadPoints = road;
        _loadingRoute = false;
      });
    }
  }

  void _checkOffRoute() {
    if (_loadingRoute || _roadPoints.isEmpty || !_gotInitialFix) return;

    final now = DateTime.now();
    final cooldownElapsed = _lastRerouteAt == null ||
        now.difference(_lastRerouteAt!) >= _rerouteCooldown;
    if (!cooldownElapsed) return;

    if (minDistanceToRoute(_driverPos, _roadPoints) > _offRouteThresholdM) {
      _lastRerouteAt = now;
      _fetchRoute();
    }
  }

  // Trims the already-driven portion off the front of the route so only the
  // remaining path ahead is drawn/measured.
  List<LatLng> _visibleRoutePoints() {
    if (_roadPoints.isEmpty) return _roadPoints;
    int nearestIndex = 0;
    double nearestDist = double.infinity;
    for (int i = 0; i < _roadPoints.length; i++) {
      final d = haversineLatLng(_driverPos, _roadPoints[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIndex = i;
      }
    }
    return _roadPoints.sublist(nearestIndex);
  }

  double _remainingDistanceM(List<LatLng> visibleRoute) {
    if (visibleRoute.length < 2) {
      return haversineLatLng(_driverPos, widget.destination);
    }
    double total = 0;
    for (int i = 0; i < visibleRoute.length - 1; i++) {
      total += haversineLatLng(visibleRoute[i], visibleRoute[i + 1]);
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final visibleRoute = _visibleRoutePoints();
    final remainingM = _remainingDistanceM(visibleRoute);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: widget.accentColor,
        foregroundColor: Colors.white,
      ),
      body: Stack(
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
              if (visibleRoute.length > 1)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: visibleRoute,
                      strokeWidth: 5,
                      color: widget.accentColor,
                    ),
                  ],
                ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: widget.destination,
                    width: 42,
                    height: 42,
                    child: Icon(widget.destinationIcon,
                        color: widget.accentColor, size: 38),
                  ),
                  Marker(
                    point: _driverPos,
                    width: 44,
                    height: 44,
                    child: const Icon(Icons.local_shipping,
                        color: Colors.indigo, size: 36),
                  ),
                ],
              ),
            ],
          ),
          if (_loadingRoute)
            const Positioned(
              top: 12,
              left: 12,
              right: 12,
              child: LinearProgressIndicator(),
            ),
          Positioned(
            top: 60,
            right: 16,
            child: MapRecenterButton(color: widget.accentColor, onPressed: _recenter),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
              decoration: const BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(blurRadius: 8, color: Colors.black26)],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.route, size: 18, color: widget.accentColor),
                      const SizedBox(width: 6),
                      Text(
                        '${(remainingM / 1000).toStringAsFixed(2)} km remaining',
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  if (widget.subtitle != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      '"${widget.subtitle}"',
                      style: const TextStyle(
                          fontSize: 13, color: Colors.grey, fontStyle: FontStyle.italic),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  if (widget.actionLabel != null && widget.onAction != null) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () async {
                          final acted = await widget.onAction!(context);
                          if (acted && context.mounted) Navigator.of(context).pop();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: widget.accentColor,
                          foregroundColor: Colors.white,
                        ),
                        child: Text(widget.actionLabel!),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
