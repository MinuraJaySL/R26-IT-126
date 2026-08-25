import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../models/pickup_request.dart';
import '../../services/firestore_service.dart';

class DriverMissedScreen extends StatelessWidget {
  const DriverMissedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final fs = FirestoreService();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Missed Requests'),
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
      ),
      body: StreamBuilder<List<PickupRequest>>(
        stream: fs.watchMissedRequests(),
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
          final requests = snap.data ?? [];
          if (requests.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle_outline,
                      size: 64, color: Colors.green),
                  SizedBox(height: 12),
                  Text('No missed pickups!',
                      style: TextStyle(
                          color: Colors.green,
                          fontSize: 16,
                          fontWeight: FontWeight.w500)),
                  SizedBox(height: 4),
                  Text('All requests have been handled.',
                      style: TextStyle(color: Colors.grey)),
                ],
              ),
            );
          }
          return Column(
            children: [
              Container(
                width: double.infinity,
                color: Colors.orange.withValues(alpha: 0.1),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded,
                        size: 16, color: Colors.orange),
                    const SizedBox(width: 6),
                    Text(
                      '${requests.length} missed pickup${requests.length > 1 ? 's' : ''} — plan a follow-up visit',
                      style: const TextStyle(
                          fontSize: 13,
                          color: Colors.orange,
                          fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: requests.length,
                  separatorBuilder: (ctx, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) =>
                      _MissedCard(request: requests[i], fs: fs),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _MissedCard extends StatefulWidget {
  final PickupRequest request;
  final FirestoreService fs;
  const _MissedCard({required this.request, required this.fs});

  @override
  State<_MissedCard> createState() => _MissedCardState();
}

class _MissedCardState extends State<_MissedCard> {
  bool _busy = false;

  Future<void> _reactivate() async {
    setState(() => _busy = true);
    try {
      await widget.fs.updateRequestStatus(
          widget.request.id, RequestStatus.active);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Request reactivated — resident will be notified when truck arrives.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final req = widget.request;
    final date =
        '${req.createdAt.day}/${req.createdAt.month}/${req.createdAt.year}';
    final time =
        '${req.createdAt.hour.toString().padLeft(2, '0')}:${req.createdAt.minute.toString().padLeft(2, '0')}';

    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(
            color: Colors.orange.withValues(alpha: 0.4), width: 1),
      ),
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
                    color: Colors.orange.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.warning_amber_rounded,
                          color: Colors.orange, size: 14),
                      SizedBox(width: 4),
                      Text(
                        'MISSED',
                        style: TextStyle(
                          color: Colors.orange,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Text('$date  $time',
                    style: const TextStyle(
                        color: Colors.grey, fontSize: 12)),
              ],
            ),
            const SizedBox(height: 10),
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
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.directions),
                    label: const Text('Navigate'),
                    onPressed: () => context.push('/driver/missed/navigate', extra: req),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.orange,
                      side: const BorderSide(color: Colors.orange),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    icon: _busy
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child:
                                CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.refresh),
                    label: const Text('Reschedule'),
                    onPressed: _busy ? null : _reactivate,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
