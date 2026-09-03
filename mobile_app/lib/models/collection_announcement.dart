import 'package:cloud_firestore/cloud_firestore.dart';

// A driver's "truck is coming to this ward tomorrow" post. Notifications go
// out to residents in [ward] at a fixed daily time (not the moment this is
// posted) — see the Worker's scheduled handler. [sent] is flipped by that
// handler only; the app never sets it itself.
class CollectionAnnouncement {
  final String id;
  final String driverId;
  final String ward;
  final DateTime collectionDate; // date-only; time-of-day is ignored
  final String note;
  final DateTime createdAt;
  final bool sent;

  CollectionAnnouncement({
    required this.id,
    required this.driverId,
    required this.ward,
    required this.collectionDate,
    this.note = '',
    required this.createdAt,
    this.sent = false,
  });

  factory CollectionAnnouncement.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>;
    return CollectionAnnouncement(
      id: doc.id,
      driverId: d['driverId'] ?? '',
      ward: d['ward'] ?? '',
      collectionDate: (d['collectionDate'] as Timestamp).toDate(),
      note: d['note'] ?? '',
      createdAt: (d['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      sent: d['sent'] ?? false,
    );
  }

  Map<String, dynamic> toMap() => {
        'driverId': driverId,
        'ward': ward,
        'collectionDate': Timestamp.fromDate(
          DateTime(collectionDate.year, collectionDate.month, collectionDate.day),
        ),
        'note': note,
        'createdAt': FieldValue.serverTimestamp(),
        'sent': false,
      };
}
