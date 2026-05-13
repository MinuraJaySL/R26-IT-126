import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/bin_model.dart';
import '../models/pickup_request.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // Bins
  Stream<List<SmartBin>> watchBins() {
    return _db.collection('bins').snapshots().map(
          (snap) => snap.docs.map(SmartBin.fromFirestore).toList(),
        );
  }

  // Pickup requests
  Future<void> createPickupRequest(PickupRequest req) {
    return _db.collection('pickupRequests').doc(req.id).set(req.toMap());
  }

  Stream<List<PickupRequest>> watchMyRequests(String residentId) {
    return _db
        .collection('pickupRequests')
        .where('residentId', isEqualTo: residentId)
        .snapshots()
        .map((snap) {
      final list = snap.docs.map(PickupRequest.fromFirestore).toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    });
  }

  Stream<List<PickupRequest>> watchActiveRequests() {
    return _db
        .collection('pickupRequests')
        .where('status', whereIn: ['active', 'arrived'])
        .snapshots()
        .map((snap) {
      final list = snap.docs.map(PickupRequest.fromFirestore).toList();
      list.sort((a, b) {
        // active first, then arrived
        if (a.status == b.status) return b.createdAt.compareTo(a.createdAt);
        if (a.status == RequestStatus.active) return -1;
        return 1;
      });
      return list;
    });
  }

  Future<void> updateRequestStatus(String id, RequestStatus status) {
    return _db
        .collection('pickupRequests')
        .doc(id)
        .update({'status': status.name});
  }

  Stream<List<PickupRequest>> watchMissedRequests() {
    return _db
        .collection('pickupRequests')
        .where('status', isEqualTo: 'missed')
        .snapshots()
        .map((snap) {
      final list = snap.docs.map(PickupRequest.fromFirestore).toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    });
  }

  // Driver GPS
  Future<void> uploadDriverLocation(String driverId, double lat, double lng) {
    return _db.collection('driverLocations').doc(driverId).set({
      'lat': lat,
      'lng': lng,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Stream<Map<String, dynamic>?> watchDriverLocation(String driverId) {
    return _db
        .collection('driverLocations')
        .doc(driverId)
        .snapshots()
        .map((doc) => doc.exists ? doc.data() : null);
  }

  // Clear all existing bins then seed 7 realistic mock bins.
  // Bins are spread ~3 km around Colombo for a meaningful route demo.
  Future<void> seedDemoBins() async {
    // 1. Delete all existing bins first so re-seeding doesn't accumulate duplicates
    final existing = await _db.collection('bins').get();
    final deleteBatch = _db.batch();
    for (final doc in existing.docs) {
      deleteBatch.delete(doc.reference);
    }
    await deleteBatch.commit();

    // 2. Add 7 mock bins near Sausiri Uyana, Malabe, Sri Lanka
    //    All within ~500 m of each other — realistic for a housing scheme demo
    final bins = [
      // --- URGENT: Red bins + methane-triggered ---
      {
        'label': 'Bin A — Sausiri Uyana Gate',
        'lat': 6.9090,
        'lng': 79.9705,
        'priority': 'red',
        'methaneStatus': 'high',
        'fillPercent': 94.0,
        'lastUpdated': FieldValue.serverTimestamp(),
      },
      {
        'label': 'Bin B — Malabe Junction',
        'lat': 6.9048,
        'lng': 79.9758,
        'priority': 'red',
        'methaneStatus': 'normal',
        'fillPercent': 88.0,
        'lastUpdated': FieldValue.serverTimestamp(),
      },
      {
        'label': 'Bin C — Near SLIIT Rd',
        'lat': 6.9105,
        'lng': 79.9760,
        'priority': 'green', // fill is low but HIGH methane → bumped to urgent
        'methaneStatus': 'high',
        'fillPercent': 41.0,
        'lastUpdated': FieldValue.serverTimestamp(),
      },
      // --- MEDIUM: Yellow ---
      {
        'label': 'Bin D — Uyana Park Side',
        'lat': 6.9038,
        'lng': 79.9718,
        'priority': 'yellow',
        'methaneStatus': 'elevated',
        'fillPercent': 67.0,
        'lastUpdated': FieldValue.serverTimestamp(),
      },
      {
        'label': 'Bin E — Malabe Main Rd',
        'lat': 6.9080,
        'lng': 79.9695,
        'priority': 'yellow',
        'methaneStatus': 'normal',
        'fillPercent': 55.0,
        'lastUpdated': FieldValue.serverTimestamp(),
      },
      // --- LOW: Green ---
      {
        'label': 'Bin F — Residential Block 3',
        'lat': 6.9052,
        'lng': 79.9733,
        'priority': 'green',
        'methaneStatus': 'normal',
        'fillPercent': 32.0,
        'lastUpdated': FieldValue.serverTimestamp(),
      },
      {
        'label': 'Bin G — Sausiri Uyana End',
        'lat': 6.9098,
        'lng': 79.9743,
        'priority': 'green',
        'methaneStatus': 'normal',
        'fillPercent': 18.0,
        'lastUpdated': FieldValue.serverTimestamp(),
      },
    ];

    final addBatch = _db.batch();
    for (final bin in bins) {
      addBatch.set(_db.collection('bins').doc(), bin);
    }
    await addBatch.commit();
  }
}
