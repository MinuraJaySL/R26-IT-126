import 'package:flutter/material.dart';

import '../../models/collection_announcement.dart';
import '../../services/admin_service.dart';
import '../../services/firestore_service.dart';
import '../../widgets/app_feedback.dart';

/// Every collection announcement still waiting to go out, one row per ward
/// and date, each sent on its own — so an admin sees exactly what residents
/// of which ward are about to be told before sending it early, instead of
/// one button that pushes everything.
class AdminScheduledAnnouncementsScreen extends StatefulWidget {
  const AdminScheduledAnnouncementsScreen({super.key});

  @override
  State<AdminScheduledAnnouncementsScreen> createState() =>
      _AdminScheduledAnnouncementsScreenState();
}

class _AdminScheduledAnnouncementsScreenState
    extends State<AdminScheduledAnnouncementsScreen> {
  // Same hours as AnnounceCollectionScreen / the Worker's crons: the fixed
  // send, and the last moment anything is sent the evening before.
  static const _sendHour = 18;
  static const _deadlineHour = 20;

  final _adminService = AdminService();
  final _fs = FirestoreService();

  // Announcement docs only carry driverId — names come from the same user
  // listing User Management uses. Best-effort: rows fall back to "a driver".
  Map<String, String> _driverNames = {};

  // Ids currently being sent, so a row can't be double-tapped into two sends.
  final Set<String> _sending = {};

  @override
  void initState() {
    super.initState();
    _adminService.fetchAllUsers().then((users) {
      if (!mounted) return;
      setState(() {
        _driverNames = {
          for (final u in users) u.uid: u.name.isNotEmpty ? u.name : u.email,
        };
      });
    }).catchError((_) {});
  }

  DateTime _dayBefore(DateTime collectionDate) =>
      collectionDate.subtract(const Duration(days: 1));

  // Sendable only on the day before collection, up to the evening deadline —
  // the Worker enforces the same, this just decides whether to offer a button.
  bool _canSendNow(CollectionAnnouncement a) {
    final now = DateTime.now();
    final dayBefore = _dayBefore(a.collectionDate);
    final isDayBefore = now.year == dayBefore.year &&
        now.month == dayBefore.month &&
        now.day == dayBefore.day;
    return isDayBefore && now.hour < _deadlineHour;
  }

  Future<void> _send(CollectionAnnouncement a) async {
    if (_sending.contains(a.id)) return;
    final what = a.cancelled ? 'no collection' : 'collection';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Send to ${a.ward}?'),
        content: Text(
          'Residents in ${a.ward} will be notified now about $what on '
          '${_formatDate(a.collectionDate)}, instead of at the scheduled time.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Send Now'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _sending.add(a.id));
    int? notified;
    String? error;
    try {
      notified = await _adminService.sendAnnouncement(a.id);
    } on AdminApiException catch (e) {
      error = e.message;
    }
    if (!mounted) return;
    setState(() => _sending.remove(a.id));
    if (error == null) {
      showSuccessDialog(
        context,
        'Sent to $notified resident(s) in ${a.ward}.',
        title: 'Announcement Sent',
      );
    } else {
      showErrorDialog(context, error, title: 'Could Not Send');
    }
  }

  String _formatDate(DateTime d) => '${d.day}/${d.month}/${d.year}';

  String _formatHour(int hour) {
    final hour12 = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '$hour12:00 ${hour >= 12 ? 'PM' : 'AM'}';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(title: const Text('Scheduled Announcements')),
      body: StreamBuilder<List<CollectionAnnouncement>>(
        stream: _fs.watchPendingAnnouncements(),
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
                    'No announcements are waiting to be sent.',
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
            itemBuilder: (context, i) => _buildCard(announcements[i], scheme),
          );
        },
      ),
    );
  }

  Widget _buildCard(CollectionAnnouncement a, ColorScheme scheme) {
    final canSend = _canSendNow(a);
    final sending = _sending.contains(a.id);
    final dayBefore = _dayBefore(a.collectionDate);
    final statusColor = a.cancelled ? Colors.red : Colors.green;

    // Why there's no button, when there isn't one.
    final String schedule;
    if (canSend) {
      schedule = 'Scheduled for ${_formatHour(_sendHour)} today';
    } else if (DateTime.now().isBefore(dayBefore)) {
      schedule = 'Sends at ${_formatHour(_sendHour)} on ${_formatDate(dayBefore)}';
    } else {
      schedule = 'Missed the ${_formatHour(_deadlineHour)} deadline — will not be sent';
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
                Expanded(
                  child: Text(
                    a.ward,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    a.cancelled ? 'NOT COMING' : 'COMING',
                    style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Collection date ${_formatDate(a.collectionDate)} · '
              'by ${_driverNames[a.driverId] ?? 'a driver'}',
              style: TextStyle(fontSize: 13, color: scheme.onSurfaceVariant),
            ),
            if (a.note.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(a.note, style: const TextStyle(fontSize: 13)),
            ],
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Text(
                    schedule,
                    style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant),
                  ),
                ),
                if (canSend)
                  ElevatedButton.icon(
                    icon: sending
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send, size: 18),
                    label: Text(sending ? 'Sending…' : 'Send Now'),
                    onPressed: sending ? null : () => _send(a),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
