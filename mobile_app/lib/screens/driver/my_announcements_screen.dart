import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/collection_announcement.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';

class MyAnnouncementsScreen extends StatelessWidget {
  const MyAnnouncementsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final driverId = context.read<AuthProvider>().user!.uid;
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(title: const Text('My Announcements')),
      body: StreamBuilder<List<CollectionAnnouncement>>(
        stream: FirestoreService().watchMyAnnouncements(driverId),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final announcements = snap.data ?? [];
          if (announcements.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.campaign_outlined, size: 64, color: scheme.onSurfaceVariant),
                  const SizedBox(height: 12),
                  Text(
                    'You haven\'t posted any announcements yet.',
                    style: TextStyle(color: scheme.onSurfaceVariant),
                  ),
                ],
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: announcements.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, i) => _AnnouncementCard(a: announcements[i]),
          );
        },
      ),
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  const _AnnouncementCard({required this.a});

  final CollectionAnnouncement a;

  // Same fixed send hour as AnnounceCollectionScreen — the 6 PM push always
  // lands the evening before collectionDate, not on the day it was posted.
  static const _cutoffHour = 18;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final sendAt = a.collectionDate.subtract(const Duration(days: 1));
    final now = DateTime.now();
    final alreadyPastSendTime =
        now.isAfter(DateTime(sendAt.year, sendAt.month, sendAt.day, _cutoffHour));

    final String statusLabel;
    final Color statusColor;
    final IconData statusIcon;
    if (a.sent) {
      statusLabel = 'NOTIFIED';
      statusColor = Colors.green;
      statusIcon = Icons.check_circle_outline;
    } else if (alreadyPastSendTime) {
      // Send time has passed but the cron hasn't flipped `sent` yet in what
      // we've fetched — a brief window right around 6 PM, not a stuck state.
      statusLabel = 'SENDING';
      statusColor = Colors.orange;
      statusIcon = Icons.hourglass_top;
    } else {
      statusLabel = 'SCHEDULED';
      statusColor = Colors.indigo;
      statusIcon = Icons.schedule;
    }

    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: statusColor.withValues(alpha: 0.35)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, color: statusColor, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        statusLabel,
                        style: TextStyle(
                          color: statusColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Text(
                  _formatDate(a.createdAt),
                  style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(a.ward, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            const SizedBox(height: 4),
            Text(
              'Collection on ${_formatDate(a.collectionDate)} · '
              'push at 6:00 PM on ${_formatDate(sendAt)}',
              style: TextStyle(fontSize: 13, color: scheme.onSurfaceVariant),
            ),
            if (a.note.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(a.note, style: const TextStyle(fontSize: 13)),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime d) => '${d.day}/${d.month}/${d.year}';
}
