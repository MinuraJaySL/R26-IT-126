import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../models/pickup_request.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';

class MyPickupsScreen extends StatelessWidget {
  const MyPickupsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (auth.loading || auth.user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final uid = auth.user!.uid;
    final fs = FirestoreService();

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Pickups'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: StreamBuilder<List<PickupRequest>>(
        stream: fs.watchMyRequests(uid),
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

  static const _deleteWindow = Duration(minutes: 10);

  void _handleDeleteTap(BuildContext context) {
    final elapsed = DateTime.now().difference(request.createdAt);
    final remaining = _deleteWindow - elapsed;

    if (remaining <= Duration.zero) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          icon: const Icon(Icons.timer_off_outlined, color: Colors.grey, size: 44),
          title: const Text('Too Late to Delete'),
          content: Text(
            'This request was placed ${elapsed.inMinutes} minute'
            '${elapsed.inMinutes == 1 ? '' : 's'} ago. Requests can only be '
            'deleted within 10 minutes of being placed.',
            textAlign: TextAlign.center,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      return;
    }

    final mins = remaining.inMinutes;
    final secs = remaining.inSeconds % 60;
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        icon: const Icon(Icons.delete_outline, color: Colors.red, size: 44),
        title: const Text('Delete This Request?'),
        content: Text(
          'You can still undo this — it was placed less than 10 minutes ago.\n'
          'Time left to delete: ${mins}m ${secs}s.',
          textAlign: TextAlign.center,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.pop(dialogContext);
              try {
                await FirestoreService().deleteRequest(request.id);
              } catch (_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('This request can no longer be deleted.'),
                    ),
                  );
                }
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

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
                if (request.status == RequestStatus.active) ...[
                  const SizedBox(width: 4),
                  InkWell(
                    onTap: () => _handleDeleteTap(context),
                    borderRadius: BorderRadius.circular(20),
                    child: const Padding(
                      padding: EdgeInsets.all(4),
                      child: Icon(Icons.delete_outline, size: 18, color: Colors.red),
                    ),
                  ),
                ],
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
