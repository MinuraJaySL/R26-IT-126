import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/app_notification.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  static const _icons = {
    'arrived': Icons.local_shipping_outlined,
    'collected': Icons.check_circle_outline,
    'reportResolved': Icons.report_problem_outlined,
    'recoveryResolved': Icons.lock_open_outlined,
    'autoResolved': Icons.timer_off_outlined,
    'announcement': Icons.campaign_outlined,
  };

  @override
  Widget build(BuildContext context) {
    final userId = context.read<AuthProvider>().user!.uid;
    final scheme = Theme.of(context).colorScheme;
    final fs = FirestoreService();

    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          StreamBuilder<List<AppNotification>>(
            stream: fs.watchMyNotifications(userId),
            builder: (context, snap) {
              final unread = (snap.data ?? []).where((n) => !n.read).toList();
              if (unread.isEmpty) return const SizedBox.shrink();
              return TextButton(
                onPressed: () =>
                    fs.markAllNotificationsRead(unread.map((n) => n.id).toList()),
                child: const Text('Mark all read'),
              );
            },
          ),
        ],
      ),
      body: StreamBuilder<List<AppNotification>>(
        stream: fs.watchMyNotifications(userId),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final notifications = snap.data ?? [];
          if (notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_none, size: 64, color: scheme.onSurfaceVariant),
                  const SizedBox(height: 12),
                  Text('No notifications yet.', style: TextStyle(color: scheme.onSurfaceVariant)),
                ],
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: notifications.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final n = notifications[i];
              return _NotificationTile(
                notification: n,
                onTap: n.read ? null : () => fs.markNotificationRead(n.id),
              );
            },
          );
        },
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onTap});

  final AppNotification notification;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final icon = NotificationsScreen._icons[notification.type] ?? Icons.notifications_outlined;

    return Material(
      color: notification.read
          ? scheme.surfaceContainerHighest.withValues(alpha: 0.3)
          : scheme.primaryContainer.withValues(alpha: 0.5),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                backgroundColor: scheme.primary.withValues(alpha: 0.15),
                child: Icon(icon, color: scheme.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: TextStyle(
                              fontWeight:
                                  notification.read ? FontWeight.w500 : FontWeight.bold,
                            ),
                          ),
                        ),
                        if (!notification.read)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: scheme.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(notification.body, style: TextStyle(fontSize: 13, color: scheme.onSurfaceVariant)),
                    const SizedBox(height: 4),
                    Text(
                      _formatTime(notification.createdAt),
                      style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    return '${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
