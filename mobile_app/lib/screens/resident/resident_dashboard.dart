import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../models/pickup_request.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';

class ResidentDashboard extends StatefulWidget {
  const ResidentDashboard({super.key});

  @override
  State<ResidentDashboard> createState() => _ResidentDashboardState();
}

class _ResidentDashboardState extends State<ResidentDashboard> {
  final _fs = FirestoreService();
  StreamSubscription<List<PickupRequest>>? _sub;

  // Track which requests were previously active so we can detect collections
  final Set<String> _knownActiveIds = {};
  bool _initialLoad = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _startListening();
  }

  void _startListening() {
    _sub?.cancel();
    final auth = context.read<AuthProvider>();
    if (auth.user == null) return;

    _sub = _fs.watchMyRequests(auth.user!.uid).listen((requests) {
      if (!mounted) return;

      if (_initialLoad) {
        // Seed the known-active set without showing alerts on first load
        for (final r in requests) {
          if (r.status == RequestStatus.active) {
            _knownActiveIds.add(r.id);
          }
        }
        _initialLoad = false;
        return;
      }

      // Detect newly-arrived or collected requests
      for (final r in requests) {
        if ((r.status == RequestStatus.arrived ||
                r.status == RequestStatus.collected) &&
            _knownActiveIds.contains(r.id)) {
          _knownActiveIds.remove(r.id);
          _showCollectedAlert(r);
        }
        if (r.status == RequestStatus.active) {
          _knownActiveIds.add(r.id);
        }
      }
    });
  }

  void _showCollectedAlert(PickupRequest r) {
    if (!mounted) return;

    final isArrived = r.status == RequestStatus.arrived;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        icon: Icon(
          isArrived ? Icons.local_shipping : Icons.check_circle,
          color: isArrived ? Colors.indigo : Colors.green,
          size: 52,
        ),
        title: Text(isArrived
            ? '🚛 Truck is Here!'
            : 'Waste Collected!'),
        content: Text(
          isArrived
              ? 'The garbage truck has arrived at your pickup point!\n\n'
                  'Please bring your waste out now.'
              : 'Your waste has been successfully collected.\n\n'
                  'Thank you for using Smart Waste!',
          textAlign: TextAlign.center,
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: isArrived ? Colors.indigo : Colors.green,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (auth.loading || auth.user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final uid = auth.user!.uid;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Pickups'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            tooltip: 'Profile',
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: StreamBuilder<List<PickupRequest>>(
        stream: _fs.watchMyRequests(uid),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(
              child: Text('Error loading requests: ${snap.error}',
                  style: const TextStyle(color: Colors.red)),
            );
          }
          final requests = snap.data ?? [];
          if (requests.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.inbox_outlined, size: 64, color: Colors.grey),
                  SizedBox(height: 12),
                  Text('No pickup requests yet.',
                      style: TextStyle(color: Colors.grey)),
                ],
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: requests.length,
            separatorBuilder: (ctx, _) => const SizedBox(height: 8),
            itemBuilder: (context, i) => _RequestCard(request: requests[i]),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_location_alt),
        label: const Text('Request Pickup'),
        onPressed: () => context.push('/resident/flag'),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  final PickupRequest request;
  const _RequestCard({required this.request});

  Color _statusColor() {
    switch (request.status) {
      case RequestStatus.active:
        return Colors.green;
      case RequestStatus.arrived:
        return Colors.indigo;
      case RequestStatus.collected:
        return Colors.blue;
      case RequestStatus.missed:
        return Colors.orange;
      case RequestStatus.expired:
        return Colors.grey;
    }
  }

  IconData _statusIcon() {
    switch (request.status) {
      case RequestStatus.active:
        return Icons.hourglass_top;
      case RequestStatus.arrived:
        return Icons.local_shipping;
      case RequestStatus.collected:
        return Icons.check_circle;
      case RequestStatus.missed:
        return Icons.warning_amber_rounded;
      case RequestStatus.expired:
        return Icons.cancel_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: _statusColor().withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(_statusIcon(), color: _statusColor(), size: 14),
                      const SizedBox(width: 4),
                      Text(
                        request.status.name.toUpperCase(),
                        style: TextStyle(
                          color: _statusColor(),
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Text(
                  _formatTime(request.createdAt),
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.location_on, size: 16, color: Colors.grey),
                const SizedBox(width: 4),
                Text(
                  '${request.lat.toStringAsFixed(5)}, ${request.lng.toStringAsFixed(5)}',
                  style: const TextStyle(fontSize: 13),
                ),
              ],
            ),
            if (request.status == RequestStatus.active ||
                request.status == RequestStatus.arrived) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.local_shipping, size: 18),
                  label: const Text('Track Truck'),
                  onPressed: () =>
                      context.push('/resident/track', extra: request),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.indigo,
                    side: const BorderSide(color: Colors.indigo),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ],
            if (request.status == RequestStatus.arrived) ...[
              const SizedBox(height: 8),
              const Row(
                children: [
                  Icon(Icons.local_shipping, size: 16, color: Colors.indigo),
                  SizedBox(width: 4),
                  Text(
                    'Truck has arrived — confirm handover below',
                    style: TextStyle(
                        fontSize: 13,
                        color: Colors.indigo,
                        fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.check_circle, size: 18),
                      label: const Text('Handed Over'),
                      onPressed: () => FirestoreService()
                          .updateRequestStatus(
                              request.id, RequestStatus.collected),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.warning_amber_rounded, size: 18),
                      label: const Text('Missed'),
                      onPressed: () => FirestoreService()
                          .updateRequestStatus(
                              request.id, RequestStatus.missed),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.orange,
                        side: const BorderSide(color: Colors.orange),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                ],
              ),
            ] else if (request.status == RequestStatus.collected) ...[
              const SizedBox(height: 8),
              const Row(
                children: [
                  Icon(Icons.check_circle, size: 16, color: Colors.blue),
                  SizedBox(width: 4),
                  Text(
                    'Waste successfully handed over',
                    style: TextStyle(
                        fontSize: 13,
                        color: Colors.blue,
                        fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ] else if (request.status == RequestStatus.missed) ...[
              const SizedBox(height: 8),
              const Row(
                children: [
                  Icon(Icons.warning_amber_rounded,
                      size: 16, color: Colors.orange),
                  SizedBox(width: 4),
                  Text(
                    'Missed — waste was not handed over',
                    style: TextStyle(
                        fontSize: 13,
                        color: Colors.orange,
                        fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    return '${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
