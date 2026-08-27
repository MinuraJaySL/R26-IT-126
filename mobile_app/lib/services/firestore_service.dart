import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/bin_model.dart';
import '../models/bin_report.dart';
import '../models/pickup_request.dart';
import '../models/recovery_request.dart';

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

  // Only succeeds within 10 minutes of creation while the request is still
  // `active` — enforced server-side by firestore.rules, not just here.
  Future<void> deleteRequest(String id) {
    return _db.collection('pickupRequests').doc(id).delete();
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

  // Bin reports (resident-submitted overflow/damage reports)
  Future<void> createBinReport(BinReport report) {
    return _db.collection('binReports').doc(report.id).set(report.toMap());
  }

  Stream<List<BinReport>> watchMyBinReports(String residentId) {
    return _db
        .collection('binReports')
        .where('residentId', isEqualTo: residentId)
        .snapshots()
        .map((snap) {
      final list = snap.docs.map(BinReport.fromFirestore).toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    });
  }

  Stream<List<BinReport>> watchOpenBinReports() {
    return _db
        .collection('binReports')
        .where('status', isEqualTo: 'open')
        .snapshots()
        .map((snap) {
      final list = snap.docs.map(BinReport.fromFirestore).toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    });
  }

  Stream<List<BinReport>> watchResolvedBinReports() {
    return _db
        .collection('binReports')
        .where('status', isEqualTo: 'resolved')
        .snapshots()
        .map((snap) {
      final list = snap.docs.map(BinReport.fromFirestore).toList();
      list.sort((a, b) =>
          (b.resolvedAt ?? b.createdAt).compareTo(a.resolvedAt ?? a.createdAt));
      return list;
    });
  }

  Future<void> resolveBinReport(
    String id,
    String driverId,
    String resolutionNote,
  ) {
    return _db.collection('binReports').doc(id).update({
      'status': 'resolved',
      'resolvedBy': driverId,
      'resolutionNote': resolutionNote,
      'resolvedAt': FieldValue.serverTimestamp(),
    });
  }

  // Account recovery requests (submitted by a disabled account, resolved by
  // admin — see AccountDisabledScreen / AdminRecoveryRequestsScreen).
  Future<void> createRecoveryRequest(RecoveryRequest request) {
    return _db
        .collection('accountRecoveryRequests')
        .doc(request.id)
        .set(request.toMap());
  }

  Stream<List<RecoveryRequest>> watchOpenRecoveryRequests() {
    return _db
        .collection('accountRecoveryRequests')
        .where('status', isEqualTo: 'open')
        .snapshots()
        .map((snap) {
      final list = snap.docs.map(RecoveryRequest.fromFirestore).toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    });
  }

  Stream<List<RecoveryRequest>> watchResolvedRecoveryRequests() {
    return _db
        .collection('accountRecoveryRequests')
        .where('status', isEqualTo: 'resolved')
        .snapshots()
        .map((snap) {
      final list = snap.docs.map(RecoveryRequest.fromFirestore).toList();
      list.sort((a, b) =>
          (b.resolvedAt ?? b.createdAt).compareTo(a.resolvedAt ?? a.createdAt));
      return list;
    });
  }

  // Resolves the ticket and, if reenableAccount is true, flips the user's
  // disabled flag off in the same batch — one admin action does both.
  Future<void> resolveRecoveryRequest({
    required String requestId,
    required String uid,
    required String adminId,
    required String resolutionNote,
    required bool reenableAccount,
  }) {
    final batch = _db.batch();
    batch.update(_db.collection('accountRecoveryRequests').doc(requestId), {
      'status': 'resolved',
      'resolvedBy': adminId,
      'resolutionNote': resolutionNote,
      'reenabled': reenableAccount,
      'resolvedAt': FieldValue.serverTimestamp(),
    });
    if (reenableAccount) {
      batch.update(_db.collection('users').doc(uid), {'disabled': false});
    }
    return batch.commit();
  }

  // Driver GPS
  // mode distinguishes what the driver is currently doing — 'bins' (Bin
  // Priority Map) or 'pickups' (pickup request route) — so residents can be
  // shown only drivers actually working pickup requests, not bin collection.
  Future<void> uploadDriverLocation(
    String driverId,
    double lat,
    double lng, {
    required String mode,
  }) {
    return _db.collection('driverLocations').doc(driverId).set({
      'lat': lat,
      'lng': lng,
      'mode': mode,
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

  // All drivers currently broadcasting a live position (for resident-side
  // truck tracking — residents don't know which driver is "theirs"). Includes
  // updatedAt so the UI can filter out stale, never-cleaned-up entries.
  // Residents tracking a truck should only ever see drivers currently
  // working pickup requests, not ones out doing bin collection — a driver
  // detouring for a resident's waste is exactly the delay bin collection
  // can't afford. Docs from before `mode` existed simply won't match this
  // filter, which is the correct behavior (they're stale anyway).
  Stream<List<Map<String, dynamic>>> watchPickupModeDriverLocations() {
    return _db
        .collection('driverLocations')
        .where('mode', isEqualTo: 'pickups')
        .snapshots()
        .map(
          (snap) => snap.docs.map((doc) {
            final d = doc.data();
            return {
              'driverId': doc.id,
              'lat': (d['lat'] as num).toDouble(),
              'lng': (d['lng'] as num).toDouble(),
              'updatedAt': (d['updatedAt'] as Timestamp?)?.toDate(),
            };
          }).toList(),
        );
  }

  // Called when a driver ends their trip so they disappear from anyone
  // tracking them immediately, instead of leaving a stale last-known position.
  Future<void> deleteDriverLocation(String driverId) {
    return _db.collection('driverLocations').doc(driverId).delete();
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
