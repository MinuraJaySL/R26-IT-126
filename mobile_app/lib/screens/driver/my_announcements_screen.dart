import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/collection_announcement.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';
import '../../widgets/app_feedback.dart';

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

  // Only offered while un-sent (see firestore.rules) — once residents have
  // been notified, deleting the record wouldn't take that back.
  Future<void> _confirmCancel(BuildContext context) async {
    // Taken before the awaits: a successful cancel removes this card, and
    // its context with it.
    final messenger = ScaffoldMessenger.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Cancel Announcement?'),
        content: Text(
          'Residents in ${a.ward} will not be notified about collection on '
          '${_formatDate(a.collectionDate)}.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Keep'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Cancel Announcement'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await FirestoreService().cancelCollectionAnnouncement(a.id);
      messenger.showSnackBar(
        appSnackBar('Announcement cancelled.', kind: SnackKind.success),
      );
    } catch (e) {
      // Most likely the push went out between this card rendering and the
      // tap — the rules refuse to delete a sent announcement.
      if (context.mounted) {
        showErrorDialog(
          context,
          'Residents may already have been notified.',
          title: 'Could Not Cancel',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final sendAt = a.collectionDate.subtract(const Duration(days: 1));
    final now = DateTime.now();
    final alreadyPastSendTime =
        now.isAfter(DateTime(sendAt.year, sendAt.month, sendAt.day, _cutoffHour));
    // The Worker's last run is at 8 PM the evening before, and nothing is
    // ever sent after it — a few minutes' grace covers that run finishing.
    final finalRunOver =
        now.isAfter(DateTime(sendAt.year, sendAt.month, sendAt.day, 20, 10));

    final String statusLabel;
    final Color statusColor;
    final IconData statusIcon;
    if (a.sent) {
      statusLabel = 'NOTIFIED';
      statusColor = Colors.green;
      statusIcon = Icons.check_circle_outline;
    } else if (finalRunOver) {
      // Neither the 6 PM send nor the 8 PM retry got to it — residents are
      // never notified later than that, so it will not go out now.
      statusLabel = 'NOT SENT';
      statusColor = Colors.grey;
      statusIcon = Icons.error_outline;
    } else if (alreadyPastSendTime) {
      // Send time has passed but `sent` isn't flipped yet — either the brief
      // window right around 6 PM, or that run missed it and the 8 PM retry
      // will pick it up.
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
              '${a.cancelled ? 'No collection' : 'Collection'} on '
              '${_formatDate(a.collectionDate)} · '
              '${a.isUpdate ? 'update to residents on' : 'push at 6:00 PM on'} '
              '${_formatDate(sendAt)}',
              style: TextStyle(fontSize: 13, color: scheme.onSurfaceVariant),
            ),
            if (a.note.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(a.note, style: const TextStyle(fontSize: 13)),
            ],
            // Not for an update: residents already hold the details it
            // corrects, so withdrawing it would leave them misinformed.
            if (!a.sent && !a.isUpdate && !finalRunOver)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  icon: const Icon(Icons.cancel_outlined, size: 18),
                  label: const Text('Cancel'),
                  style: TextButton.styleFrom(foregroundColor: Colors.red),
                  onPressed: () => _confirmCancel(context),
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime d) => '${d.day}/${d.month}/${d.year}';
}
