import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../models/pickup_request.dart';
import '../../services/firestore_service.dart';

class DriverRequestsScreen extends StatefulWidget {
  const DriverRequestsScreen({super.key});

  @override
  State<DriverRequestsScreen> createState() => _DriverRequestsScreenState();
}

class _DriverRequestsScreenState extends State<DriverRequestsScreen> {
  final _fs = FirestoreService();

  StreamSubscription<Position>? _gpsSub;
  Timer? _pollTimer;
  List<PickupRequest> _requests = [];
  final Set<String> _arrivedIds = {};

  // 300m threshold — accounts for web browser GPS inaccuracy
  static const double _thresholdM = 300;

  @override
  void initState() {
    super.initState();
    _startProximityTracking();
  }

  @override
  void dispose() {
    _gpsSub?.cancel();
    _pollTimer?.cancel();
    super.dispose();
  }

  void _startProximityTracking() async {
    // Check permission first
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      await Geolocator.requestPermission();
    }

    // GPS stream — fires on position change
    _gpsSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 0,
      ),
    ).listen((pos) => _checkProximity(pos.latitude, pos.longitude));

    // Periodic fallback — checks every 10s in case stream is slow on web
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      try {
        final pos = await Geolocator.getCurrentPosition(
          locationSettings:
              const LocationSettings(accuracy: LocationAccuracy.high),
        );
        _checkProximity(pos.latitude, pos.longitude);
      } catch (_) {}
    });
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
    for (final req in _requests) {
      if (_arrivedIds.contains(req.id)) continue;
      if (req.status != RequestStatus.active) continue;
      final dist = _haversine(lat, lng, req.lat, req.lng);
      if (dist <= _thresholdM) {
        _arrivedIds.add(req.id);
        _fs.updateRequestStatus(req.id, RequestStatus.arrived);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                  'Arrived at pickup point! (${dist.toStringAsFixed(0)} m away)'),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 4),
            ),
          );
        }
      }
    }
  }

  Future<void> _manualArrive(PickupRequest req) async {
    try {
      await _fs.updateRequestStatus(req.id, RequestStatus.arrived);
      _arrivedIds.add(req.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Marked as arrived — resident notified!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Color _statusColor(RequestStatus s) {
    switch (s) {
      case RequestStatus.active:
        return Colors.orange;
      case RequestStatus.arrived:
        return Colors.indigo;
      case RequestStatus.collected:
        return Colors.green;
      case RequestStatus.missed:
        return Colors.orange;
      case RequestStatus.expired:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pickup Requests'),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Tooltip(
              message: 'GPS proximity active (300m)',
              child: const Icon(Icons.gps_fixed, color: Colors.greenAccent),
            ),
          ),
        ],
      ),
      body: StreamBuilder<List<PickupRequest>>(
        stream: _fs.watchActiveRequests(),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(
              child: Text('Error: ${snap.error}',
                  style: const TextStyle(color: Colors.red)),
            );
          }
          _requests = snap.data ?? [];

          if (_requests.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.inbox_outlined, size: 64, color: Colors.grey),
                  SizedBox(height: 12),
                  Text('No active pickup requests.',
                      style: TextStyle(color: Colors.grey)),
                ],
              ),
            );
          }
          return Column(
            children: [
              Container(
                width: double.infinity,
                color: Colors.indigo.withValues(alpha: 0.08),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 10),
                child: const Row(
                  children: [
                    Icon(Icons.gps_fixed, size: 14, color: Colors.indigo),
                    SizedBox(width: 6),
                    Text(
                      'GPS active — auto-notifies resident when within 300m',
                      style: TextStyle(fontSize: 12, color: Colors.indigo),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _requests.length,
                  separatorBuilder: (ctx, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) => _RequestCard(
                    request: _requests[i],
                    onManualArrive: _manualArrive,
                    statusColor: _statusColor,
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

class _RequestCard extends StatefulWidget {
  final PickupRequest request;
  final Future<void> Function(PickupRequest) onManualArrive;
  final Color Function(RequestStatus) statusColor;

  const _RequestCard({
    required this.request,
    required this.onManualArrive,
    required this.statusColor,
  });

  @override
  State<_RequestCard> createState() => _RequestCardState();
}

class _RequestCardState extends State<_RequestCard> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final req = widget.request;
    final time =
        '${req.createdAt.day}/${req.createdAt.month} ${req.createdAt.hour.toString().padLeft(2, '0')}:${req.createdAt.minute.toString().padLeft(2, '0')}';
    final isArrived = req.status == RequestStatus.arrived;
    final isActive = req.status == RequestStatus.active;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: widget.statusColor(req.status)
                        .withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    req.status.name.toUpperCase(),
                    style: TextStyle(
                      color: widget.statusColor(req.status),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                const Spacer(),
                Text(time,
                    style: const TextStyle(
                        color: Colors.grey, fontSize: 12)),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.location_on,
                    size: 16, color: Colors.grey),
                const SizedBox(width: 4),
                Text(
                  '${req.lat.toStringAsFixed(5)}, ${req.lng.toStringAsFixed(5)}',
                  style: const TextStyle(fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.person_outline,
                    size: 16, color: Colors.grey),
                const SizedBox(width: 4),
                Text(
                  'Resident: ${req.residentId.substring(0, 8)}...',
                  style: const TextStyle(
                      fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (isActive) ...[
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon: _busy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2),
                        )
                      : const Icon(Icons.local_shipping),
                  label: const Text('Mark as Arrived (Manual)'),
                  onPressed: _busy
                      ? null
                      : () async {
                          setState(() => _busy = true);
                          await widget.onManualArrive(req);
                          if (mounted) setState(() => _busy = false);
                        },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.indigo,
                    side: const BorderSide(color: Colors.indigo),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ],
            if (isArrived) ...[
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.indigo.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.notifications_active,
                        color: Colors.indigo, size: 16),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Resident notified — waiting for handover confirmation',
                        style: TextStyle(
                            color: Colors.indigo,
                            fontSize: 13,
                            fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
