import 'package:cloud_firestore/cloud_firestore.dart';

enum BinPriority { red, yellow, green }

enum MethaneStatus { normal, elevated, high }

class SmartBin {
  final String id;
  final String label;
  final double lat;
  final double lng;
  final BinPriority priority;
  final MethaneStatus methaneStatus;
  final double fillPercent;
  final DateTime lastUpdated;

  SmartBin({
    required this.id,
    required this.label,
    required this.lat,
    required this.lng,
    required this.priority,
    required this.methaneStatus,
    required this.fillPercent,
    required this.lastUpdated,
  });

  factory SmartBin.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>;
    return SmartBin(
      id: doc.id,
      label: d['label'] as String? ?? 'Bin ${doc.id.substring(0, 4)}',
      lat: (d['lat'] as num).toDouble(),
      lng: (d['lng'] as num).toDouble(),
      priority: BinPriority.values.firstWhere(
        (e) => e.name == (d['priority'] ?? 'green'),
        orElse: () => BinPriority.green,
      ),
      methaneStatus: MethaneStatus.values.firstWhere(
        (e) => e.name == (d['methaneStatus'] ?? 'normal'),
        orElse: () => MethaneStatus.normal,
      ),
      fillPercent: (d['fillPercent'] as num?)?.toDouble() ?? 0.0,
      lastUpdated: (d['lastUpdated'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() => {
        'lat': lat,
        'lng': lng,
        'priority': priority.name,
        'methaneStatus': methaneStatus.name,
        'fillPercent': fillPercent,
        'lastUpdated': Timestamp.fromDate(lastUpdated),
      };
}
