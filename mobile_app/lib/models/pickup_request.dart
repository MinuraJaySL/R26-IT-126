import 'package:cloud_firestore/cloud_firestore.dart';

enum RequestStatus { active, arrived, collected, missed, expired }

class PickupRequest {
  final String id;
  final String residentId;
  final double lat;
  final double lng;
  final RequestStatus status;
  final DateTime createdAt;
  final DateTime? expiresAt;
  // Stamped when status first becomes `arrived` — measures the 15-minute
  // grace period before an unanswered arrival auto-resolves to `missed`.
  final DateTime? arrivedAt;
  // True only when the 15-minute timeout (not a resident's own tap) is what
  // set status to `missed` — lets the resident's card explain why, instead
  // of showing the same message as a request they marked missed themselves.
  final bool autoMissed;

  PickupRequest({
    required this.id,
    required this.residentId,
    required this.lat,
    required this.lng,
    required this.status,
    required this.createdAt,
    this.expiresAt,
    this.arrivedAt,
    this.autoMissed = false,
  });

  factory PickupRequest.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>;
    return PickupRequest(
      id: doc.id,
      residentId: d['residentId'] ?? '',
      lat: (d['lat'] as num).toDouble(),
      lng: (d['lng'] as num).toDouble(),
      status: RequestStatus.values.firstWhere(
        (e) => e.name == (d['status'] ?? 'active'),
        orElse: () => RequestStatus.active,
      ),
      createdAt: (d['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      expiresAt: (d['expiresAt'] as Timestamp?)?.toDate(),
      arrivedAt: (d['arrivedAt'] as Timestamp?)?.toDate(),
      autoMissed: d['autoMissed'] ?? false,
    );
  }

  Map<String, dynamic> toMap() => {
        'residentId': residentId,
        'lat': lat,
        'lng': lng,
        'status': status.name,
        'createdAt': Timestamp.fromDate(createdAt),
        'expiresAt': expiresAt != null ? Timestamp.fromDate(expiresAt!) : null,
      };
}
