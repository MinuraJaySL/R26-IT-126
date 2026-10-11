import 'package:cloud_firestore/cloud_firestore.dart';

// A driver's "truck is coming to this ward tomorrow" post — or, with
// [cancelled], "no collection in this ward tomorrow". Notifications go out
// to residents in [ward] at a fixed daily time (not the moment this is
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
  // True when the truck is NOT coming — changes the resident-facing wording
  // from "Truck coming to X" to "No collection in X" (see the Worker's
  // sendAnnouncement).
  final bool cancelled;
  // True when this post replaced one residents had already been notified
  // about. The Worker sends these immediately instead of waiting for the
  // fixed-time run, and titles them "Update: …". firestore.rules decides
  // what this must be on every write — the app only mirrors that.
  final bool isUpdate;

  CollectionAnnouncement({
    required this.id,
    required this.driverId,
    required this.ward,
    required this.collectionDate,
    this.note = '',
    required this.createdAt,
    this.sent = false,
    this.cancelled = false,
    this.isUpdate = false,
  });

  // Deterministic doc id — one announcement per ward per date. Posting
  // again for the same ward and date targets the same doc and overwrites
  // it, so the latest details always win and residents are never sent two
  // competing versions.
  static String idFor(String ward, DateTime collectionDate) {
    final m = collectionDate.month.toString().padLeft(2, '0');
    final d = collectionDate.day.toString().padLeft(2, '0');
    return '${ward.replaceAll(' ', '_')}_${collectionDate.year}-$m-$d';
  }

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
      cancelled: d['cancelled'] ?? false,
      isUpdate: d['isUpdate'] ?? false,
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
        'cancelled': cancelled,
        'isUpdate': isUpdate,
      };
}
