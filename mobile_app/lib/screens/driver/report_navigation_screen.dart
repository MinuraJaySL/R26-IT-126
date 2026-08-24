import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../models/bin_report.dart';
import '../../services/location_service.dart';
import '../../services/road_route_service.dart';
import 'resolve_report_dialog.dart';

class ReportNavigationScreen extends StatefulWidget {
  final BinReport report;
  const ReportNavigationScreen({super.key, required this.report});

  @override
  State<ReportNavigationScreen> createState() => _ReportNavigationScreenState();
}

class _ReportNavigationScreenState extends State<ReportNavigationScreen> {
  final _locationService = LocationService();
  final _roadRouteService = RoadRouteService();
  final _mapController = MapController();

  StreamSubscription? _gpsSub;
  LatLng _driverPos = const LatLng(6.9069, 79.9723);
  List<LatLng> _roadPoints = [];
  bool _loadingRoute = true;
  bool _gotInitialFix = false;

  DateTime? _lastRerouteAt;
  static const double _offRouteThresholdM = 150;
  static const Duration _rerouteCooldown = Duration(seconds: 15);

  late final LatLng _destination =
      LatLng(widget.report.lat, widget.report.lng);

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
      _mapController.move(loc, _mapController.camera.zoom);
      _checkOffRoute();
    });
  }

  Future<void> _fetchRoute() async {
    if (mounted) setState(() => _loadingRoute = true);
    final road =
        await _roadRouteService.getRoadRoute([_driverPos, _destination]);
    if (mounted) {
      setState(() {
        _roadPoints = road;
        _loadingRoute = false;
      });
    }
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

  void _checkOffRoute() {
    if (_loadingRoute || _roadPoints.isEmpty || !_gotInitialFix) return;

    final now = DateTime.now();
    final cooldownElapsed = _lastRerouteAt == null ||
        now.difference(_lastRerouteAt!) >= _rerouteCooldown;
    if (!cooldownElapsed) return;

    if (_minDistanceToRoute(_driverPos, _roadPoints) > _offRouteThresholdM) {
      _lastRerouteAt = now;
      _fetchRoute();
    }
  }

  // Trims the already-driven portion off the front of the route so only the
  // remaining path ahead is drawn/measured — same approach as the bin route.
  List<LatLng> _visibleRoutePoints() {
    if (_roadPoints.isEmpty) return _roadPoints;
    int nearestIndex = 0;
    double nearestDist = double.infinity;
    for (int i = 0; i < _roadPoints.length; i++) {
      final d = _haversine(_driverPos, _roadPoints[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIndex = i;
      }
    }
    return _roadPoints.sublist(nearestIndex);
  }

  double _remainingDistanceM(List<LatLng> visibleRoute) {
    if (visibleRoute.length < 2) {
      return _haversine(_driverPos, _destination);
    }
    double total = 0;
    for (int i = 0; i < visibleRoute.length - 1; i++) {
      total += _haversine(visibleRoute[i], visibleRoute[i + 1]);
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final visibleRoute = _visibleRoutePoints();
    final remainingM = _remainingDistanceM(visibleRoute);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Navigate to Report'),
        backgroundColor: Colors.red,
        foregroundColor: Colors.white,
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _driverPos,
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
                      color: Colors.red,
                    ),
                  ],
                ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: _destination,
                    width: 42,
                    height: 42,
                    child: const Icon(Icons.report_problem,
                        color: Colors.red, size: 38),
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
                      const Icon(Icons.route, size: 18, color: Colors.red),
                      const SizedBox(width: 6),
                      Text(
                        '${(remainingM / 1000).toStringAsFixed(2)} km remaining',
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '"${widget.report.note}"',
                    style: const TextStyle(
                        fontSize: 13, color: Colors.grey, fontStyle: FontStyle.italic),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.check_circle_outline),
                      label: const Text('Resolve'),
                      onPressed: () async {
                        final resolved =
                            await showResolveReportDialog(context, widget.report);
                        if (resolved && context.mounted) context.pop();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
