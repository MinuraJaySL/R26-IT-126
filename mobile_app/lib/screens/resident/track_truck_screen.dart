import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../models/pickup_request.dart';
import '../../services/firestore_service.dart';
import '../../services/location_service.dart';

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
  final _mapController = MapController();
  StreamSubscription<List<Map<String, dynamic>>>? _driverLocationsSub;
  Timer? _staleCheckTimer;

  List<Map<String, dynamic>> _allDrivers = [];
  LatLng _ownCenter = _defaultCenter;

  // A driver's last-known position is hidden once it's older than this — a
  // safety net for trips that end abnormally (crash, closed tab) without
  // ever deleting their Firestore doc.
  static const _staleAfter = Duration(seconds: 60);

  @override
  void initState() {
    super.initState();
    _driverLocationsSub = _fs.watchAllDriverLocations().listen((drivers) {
      if (mounted) setState(() => _allDrivers = drivers);
    });
    // Re-check staleness periodically even when no new Firestore data
    // arrives, so an abandoned truck marker still fades away on its own.
    _staleCheckTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) setState(() {});
    });
    if (widget.request == null) _loadOwnLocation();
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

  @override
  void dispose() {
    _driverLocationsSub?.cancel();
    _staleCheckTimer?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _liveDrivers {
    final cutoff = DateTime.now().subtract(_staleAfter);
    return _allDrivers.where((d) {
      final updatedAt = d['updatedAt'] as DateTime?;
      return updatedAt != null && updatedAt.isAfter(cutoff);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final request = widget.request;
    final pickupPoint =
        request != null ? LatLng(request.lat, request.lng) : _ownCenter;
    final drivers = _liveDrivers;

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
              MarkerLayer(markers: markers),
            ],
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
