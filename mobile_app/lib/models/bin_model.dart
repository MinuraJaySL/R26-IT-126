import 'package:cloud_firestore/cloud_firestore.dart';

enum BinPriority { red, yellow, green }

// Fill-level/methane readings and toMap() were removed — bins are no longer
// created from mock data or written by the app at all. Every document in
// this collection now comes from the Worker's /bin-status endpoint, which
// only ever reports a bin once it's already critical (see cf-worker), so
// there's nothing left to display but where it is and how long it's waited.
class SmartBin {
  final String id;
  final String label;
  final double lat;
  final double lng;
  final BinPriority priority;
  final DateTime? criticalSince;

  SmartBin({
    required this.id,
    required this.label,
    required this.lat,
    required this.lng,
    required this.priority,
    this.criticalSince,
  });

  factory SmartBin.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>;
    return SmartBin(
      id: doc.id,
      label: d['label'] as String? ?? 'Bin ${doc.id.substring(0, 4)}',
      lat: (d['lat'] as num).toDouble(),
      lng: (d['lng'] as num).toDouble(),
      priority: BinPriority.values.firstWhere(
        (e) => e.name == (d['priority'] ?? 'red'),
        orElse: () => BinPriority.red,
      ),
      criticalSince: (d['criticalSince'] as Timestamp?)?.toDate(),
    );
  }
}
