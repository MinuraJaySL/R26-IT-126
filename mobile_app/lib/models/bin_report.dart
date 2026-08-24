import 'package:cloud_firestore/cloud_firestore.dart';

enum BinReportStatus { open, resolved }

class BinReport {
  final String id;
  final String residentId;
  final double lat;
  final double lng;
  final String note;
  final BinReportStatus status;
  final DateTime createdAt;
  final String? resolvedBy;
  final String? resolutionNote;
  final DateTime? resolvedAt;

  BinReport({
    required this.id,
    required this.residentId,
    required this.lat,
    required this.lng,
    required this.note,
    required this.status,
    required this.createdAt,
    this.resolvedBy,
    this.resolutionNote,
    this.resolvedAt,
  });

  factory BinReport.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>;
    return BinReport(
      id: doc.id,
      residentId: d['residentId'] ?? '',
      lat: (d['lat'] as num).toDouble(),
      lng: (d['lng'] as num).toDouble(),
      note: d['note'] ?? '',
      status: BinReportStatus.values.firstWhere(
        (e) => e.name == (d['status'] ?? 'open'),
        orElse: () => BinReportStatus.open,
      ),
      createdAt: (d['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      resolvedBy: d['resolvedBy'],
      resolutionNote: d['resolutionNote'],
      resolvedAt: (d['resolvedAt'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toMap() => {
        'residentId': residentId,
        'lat': lat,
        'lng': lng,
        'note': note,
        'status': status.name,
        'createdAt': Timestamp.fromDate(createdAt),
      };
}
