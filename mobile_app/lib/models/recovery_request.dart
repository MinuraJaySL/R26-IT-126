import 'package:cloud_firestore/cloud_firestore.dart';

enum RecoveryRequestStatus { open, resolved }

class RecoveryRequest {
  final String id;
  final String uid;
  final String email;
  final String message;
  final RecoveryRequestStatus status;
  final DateTime createdAt;
  final String? resolvedBy;
  final String? resolutionNote;
  // true = account was re-enabled as part of resolving this; false = admin
  // resolved without re-enabling (e.g. denied); null = not yet resolved.
  final bool? reenabled;
  final DateTime? resolvedAt;

  RecoveryRequest({
    required this.id,
    required this.uid,
    required this.email,
    required this.message,
    required this.status,
    required this.createdAt,
    this.resolvedBy,
    this.resolutionNote,
    this.reenabled,
    this.resolvedAt,
  });

  factory RecoveryRequest.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>;
    return RecoveryRequest(
      id: doc.id,
      uid: d['uid'] ?? '',
      email: d['email'] ?? '',
      message: d['message'] ?? '',
      status: RecoveryRequestStatus.values.firstWhere(
        (e) => e.name == (d['status'] ?? 'open'),
        orElse: () => RecoveryRequestStatus.open,
      ),
      createdAt: (d['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      resolvedBy: d['resolvedBy'],
      resolutionNote: d['resolutionNote'],
      reenabled: d['reenabled'],
      resolvedAt: (d['resolvedAt'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toMap() => {
        'uid': uid,
        'email': email,
        'message': message,
        'status': status.name,
        'createdAt': Timestamp.fromDate(createdAt),
      };
}
