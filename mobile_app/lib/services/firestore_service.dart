import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/bin_model.dart';
import '../models/bin_report.dart';
import '../models/pickup_request.dart';
import '../models/recovery_request.dart';
import 'notification_service.dart';

class FirestoreService {
  final _notify = NotificationService();

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

  // Stamps arrivedAt alongside the status change — that timestamp is what
  // starts the 15-minute grace period before an unanswered arrival
  // auto-resolves to `missed` (see autoResolveStaleRequests).
  Future<void> markRequestArrived(String id, String driverId) async {
    await _db.collection('pickupRequests').doc(id).update({
      'status': RequestStatus.arrived.name,
      'arrivedAt': FieldValue.serverTimestamp(),
      'arrivedByDriverId': driverId,
    });
    _notify.notifyEvent('arrived', id); // fire-and-forget
  }

  // Self-healing timeout check, run against whatever list of requests a
  // screen is currently displaying — no server-side cron job exists in this
  // app, so this is what actually resolves a stuck request, the next time
  // any relevant screen has it in view. Idempotent: once a request's status
  // changes, it stops matching these conditions, so it won't refire.
  Future<void> autoResolveStaleRequests(List<PickupRequest> requests) async {
    final now = DateTime.now();
    for (final r in requests) {
      if (r.status == RequestStatus.active &&
          r.expiresAt != null &&
          now.isAfter(r.expiresAt!)) {
        await updateRequestStatus(r.id, RequestStatus.expired);
        _notify.notifyEvent('autoResolved', r.id); // fire-and-forget
      } else if (r.status == RequestStatus.arrived &&
          r.arrivedAt != null &&
          now.difference(r.arrivedAt!) >= const Duration(minutes: 15)) {
        await _db.collection('pickupRequests').doc(r.id).update({
          'status': RequestStatus.missed.name,
          'autoMissed': true,
        });
        _notify.notifyEvent('autoResolved', r.id); // fire-and-forget
      }
    }
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
  ) async {
    await _db.collection('binReports').doc(id).update({
      'status': 'resolved',
      'resolvedBy': driverId,
      'resolutionNote': resolutionNote,
      'resolvedAt': FieldValue.serverTimestamp(),
    });
    _notify.notifyEvent('reportResolved', id); // fire-and-forget
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
  }) async {
    final batch = _db.batch();
    batch.update(_db.collection('accountRecoveryRequests').doc(requestId), {
      'status': 'resolved',
      'resolvedBy': adminId,
      'resolutionNote': resolutionNote,
      'reenabled': reenableAccount,
      'resolvedAt': FieldValue.serverTimestamp(),
    });
    if (reenableAccount) {
      // pendingRecoveryNotice is only stamped on re-enable — a denial's
      // note is read straight from the request doc instead (the account is
      // still disabled, so AccountDisabledScreen shows it every attempt;
      // no one-time notice needed for that case).
      batch.update(_db.collection('users').doc(uid), {
        'disabled': false,
        'pendingRecoveryNotice': resolutionNote,
      });
    }
    await batch.commit();
    _notify.notifyEvent('recoveryResolved', requestId); // fire-and-forget
  }

  // One-time lookup (not a stream) for the AccountDisabledScreen to show
  // why a still-disabled account's most recent recovery request was denied,
  // if it was. Single equality filter + client-side sort avoids needing a
  // composite index for uid+status+resolvedAt.
  Future<RecoveryRequest?> fetchLatestDeniedRequest(String uid) async {
    final snap = await _db
        .collection('accountRecoveryRequests')
        .where('uid', isEqualTo: uid)
        .get();
    final denied = snap.docs
        .map(RecoveryRequest.fromFirestore)
        .where((r) => r.status == RecoveryRequestStatus.resolved && r.reenabled == false)
        .toList()
      ..sort((a, b) =>
          (b.resolvedAt ?? b.createdAt).compareTo(a.resolvedAt ?? a.createdAt));
    return denied.isEmpty ? null : denied.first;
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
}
