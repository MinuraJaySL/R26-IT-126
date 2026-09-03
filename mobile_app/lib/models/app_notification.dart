import 'package:cloud_firestore/cloud_firestore.dart';

// A persistent, in-app record of a notification-worthy event — written
// server-side by the Worker (see cf-worker's writeNotification) alongside
// (not instead of) the FCM push, so residents still see it here even if the
// push was missed, denied, or the device had no token registered.
class AppNotification {
  final String id;
  final String userId;
  final String title;
  final String body;
  final String type; // arrived / collected / reportResolved / recoveryResolved / autoResolved / announcement
  final String relatedId;
  final DateTime createdAt;
  final bool read;

  AppNotification({
    required this.id,
    required this.userId,
    required this.title,
    required this.body,
    required this.type,
    required this.relatedId,
    required this.createdAt,
    this.read = false,
  });

  factory AppNotification.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>;
    return AppNotification(
      id: doc.id,
      userId: d['userId'] ?? '',
      title: d['title'] ?? '',
      body: d['body'] ?? '',
      type: d['type'] ?? '',
      relatedId: d['relatedId'] ?? '',
      createdAt: (d['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      read: d['read'] ?? false,
    );
  }
}
