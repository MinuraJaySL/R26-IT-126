import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/models/app_notification.dart';
import 'package:mobile_app/models/bin_model.dart';
import 'package:mobile_app/models/bin_report.dart';
import 'package:mobile_app/models/collection_announcement.dart';
import 'package:mobile_app/models/pickup_request.dart';
import 'package:mobile_app/models/recovery_request.dart';

// These models are built straight from a database document, so each test
// stores one in an in-memory fake database and reads it back.
void main() {
  late FakeFirebaseFirestore db;

  setUp(() => db = FakeFirebaseFirestore());

  Future<DocumentSnapshot> stored(String id, Map<String, dynamic> data) async {
    final ref = db.collection('test').doc(id);
    await ref.set(data);
    return ref.get();
  }

  final created = DateTime(2026, 10, 12, 9, 30);
  final later = DateTime(2026, 10, 12, 10, 45);

  group('PickupRequest', () {
    test('reads a full document', () async {
      final request = PickupRequest.fromFirestore(await stored('req1', {
        'residentId': 'res1',
        'lat': 6.9271,
        'lng': 79.8612,
        'status': 'arrived',
        'createdAt': Timestamp.fromDate(created),
        'expiresAt': Timestamp.fromDate(later),
        'arrivedAt': Timestamp.fromDate(later),
        'arrivedByDriverId': 'drv1',
        'autoMissed': true,
      }));

      expect(request.id, 'req1');
      expect(request.residentId, 'res1');
      expect(request.lat, 6.9271);
      expect(request.lng, 79.8612);
      expect(request.status, RequestStatus.arrived);
      expect(request.createdAt, created);
      expect(request.expiresAt, later);
      expect(request.arrivedAt, later);
      expect(request.arrivedByDriverId, 'drv1');
      expect(request.autoMissed, isTrue);
    });

    test('uses defaults for the optional fields', () async {
      final request = PickupRequest.fromFirestore(
        await stored('req2', {'lat': 6.9, 'lng': 79.8}),
      );

      expect(request.status, RequestStatus.active);
      expect(request.residentId, '');
      expect(request.expiresAt, isNull);
      expect(request.arrivedAt, isNull);
      expect(request.arrivedByDriverId, isNull);
      expect(request.autoMissed, isFalse);
    });

    test('treats an unknown status as active', () async {
      final request = PickupRequest.fromFirestore(
        await stored('req3', {'lat': 6.9, 'lng': 79.8, 'status': 'lost'}),
      );
      expect(request.status, RequestStatus.active);
    });

    test('accepts whole-number coordinates', () async {
      final request = PickupRequest.fromFirestore(
        await stored('req4', {'lat': 7, 'lng': 80}),
      );
      expect(request.lat, 7.0);
      expect(request.lng, 80.0);
    });

    test('writes the fields a new request is saved with', () {
      final map = PickupRequest(
        id: 'ignored',
        residentId: 'res1',
        lat: 6.9,
        lng: 79.8,
        status: RequestStatus.active,
        createdAt: created,
      ).toMap();

      expect(map['residentId'], 'res1');
      expect(map['status'], 'active');
      expect(map['createdAt'], Timestamp.fromDate(created));
      expect(map['expiresAt'], isNull);
      expect(map.containsKey('id'), isFalse);
    });
  });

  group('BinReport', () {
    test('reads an open report', () async {
      final report = BinReport.fromFirestore(await stored('rep1', {
        'residentId': 'res1',
        'lat': 6.93,
        'lng': 79.85,
        'note': 'Bin is overflowing',
        'status': 'open',
        'createdAt': Timestamp.fromDate(created),
      }));

      expect(report.id, 'rep1');
      expect(report.note, 'Bin is overflowing');
      expect(report.status, BinReportStatus.open);
      expect(report.createdAt, created);
      expect(report.resolvedBy, isNull);
      expect(report.resolvedAt, isNull);
    });

    test('reads who resolved a report and when', () async {
      final report = BinReport.fromFirestore(await stored('rep2', {
        'lat': 6.93,
        'lng': 79.85,
        'status': 'resolved',
        'resolvedBy': 'drv1',
        'resolutionNote': 'Emptied',
        'resolvedAt': Timestamp.fromDate(later),
      }));

      expect(report.status, BinReportStatus.resolved);
      expect(report.resolvedBy, 'drv1');
      expect(report.resolutionNote, 'Emptied');
      expect(report.resolvedAt, later);
    });

    test('is open when the status is missing', () async {
      final report = BinReport.fromFirestore(
        await stored('rep3', {'lat': 6.93, 'lng': 79.85}),
      );
      expect(report.status, BinReportStatus.open);
      expect(report.note, '');
    });
  });

  group('SmartBin', () {
    test('reads a bin reported by a device', () async {
      final bin = SmartBin.fromFirestore(await stored('bin00001', {
        'label': 'Main Street Bin',
        'lat': 6.9344,
        'lng': 79.8428,
        'priority': 'red',
        'criticalSince': Timestamp.fromDate(created),
      }));

      expect(bin.id, 'bin00001');
      expect(bin.label, 'Main Street Bin');
      expect(bin.lat, 6.9344);
      expect(bin.priority, BinPriority.red);
      expect(bin.criticalSince, created);
    });

    test('builds a label from the id when none is stored', () async {
      final bin = SmartBin.fromFirestore(
        await stored('abcd1234', {'lat': 6.9, 'lng': 79.8}),
      );
      expect(bin.label, 'Bin abcd');
    });

    test('treats a missing or unknown priority as red', () async {
      final missing = SmartBin.fromFirestore(
        await stored('bin00002', {'lat': 6.9, 'lng': 79.8}),
      );
      final unknown = SmartBin.fromFirestore(
        await stored('bin00003', {'lat': 6.9, 'lng': 79.8, 'priority': 'purple'}),
      );
      expect(missing.priority, BinPriority.red);
      expect(unknown.priority, BinPriority.red);
    });
  });

  group('AppNotification', () {
    test('reads an inbox record', () async {
      final notification = AppNotification.fromFirestore(await stored('n1', {
        'userId': 'res1',
        'title': 'Truck arrived',
        'body': 'The truck is at your pickup point.',
        'type': 'arrived',
        'relatedId': 'req1',
        'createdAt': Timestamp.fromDate(created),
        'read': true,
      }));

      expect(notification.id, 'n1');
      expect(notification.userId, 'res1');
      expect(notification.title, 'Truck arrived');
      expect(notification.type, 'arrived');
      expect(notification.relatedId, 'req1');
      expect(notification.createdAt, created);
      expect(notification.read, isTrue);
    });

    test('is unread by default', () async {
      final notification = AppNotification.fromFirestore(
        await stored('n2', {'userId': 'res1', 'title': 'Hello'}),
      );
      expect(notification.read, isFalse);
      expect(notification.body, '');
    });
  });

  group('RecoveryRequest', () {
    test('reads an open request', () async {
      final request = RecoveryRequest.fromFirestore(await stored('rec1', {
        'uid': 'res1',
        'email': 'r@example.com',
        'message': 'Please re-enable my account',
        'status': 'open',
        'createdAt': Timestamp.fromDate(created),
      }));

      expect(request.uid, 'res1');
      expect(request.email, 'r@example.com');
      expect(request.message, 'Please re-enable my account');
      expect(request.status, RecoveryRequestStatus.open);
      expect(request.reenabled, isNull);
    });

    test('reads how an admin resolved a request', () async {
      final request = RecoveryRequest.fromFirestore(await stored('rec2', {
        'status': 'resolved',
        'resolvedBy': 'admin1',
        'resolutionNote': 'Verified by phone',
        'reenabled': true,
        'resolvedAt': Timestamp.fromDate(later),
      }));

      expect(request.status, RecoveryRequestStatus.resolved);
      expect(request.resolvedBy, 'admin1');
      expect(request.reenabled, isTrue);
      expect(request.resolvedAt, later);
    });

    test('keeps a denied request apart from an unresolved one', () async {
      final denied = RecoveryRequest.fromFirestore(
        await stored('rec3', {'status': 'resolved', 'reenabled': false}),
      );
      expect(denied.reenabled, isFalse);
    });
  });

  group('CollectionAnnouncement', () {
    test('builds the same id for the same ward and date', () {
      final morning = DateTime(2026, 3, 5, 8);
      final evening = DateTime(2026, 3, 5, 21, 15);
      expect(
        CollectionAnnouncement.idFor('Fort', morning),
        CollectionAnnouncement.idFor('Fort', evening),
      );
    });

    test('pads the month and day and replaces spaces in the ward', () {
      expect(
        CollectionAnnouncement.idFor('Kotahena West', DateTime(2026, 3, 5)),
        'Kotahena_West_2026-03-05',
      );
    });

    test('builds different ids for different wards or dates', () {
      final date = DateTime(2026, 3, 5);
      final fort = CollectionAnnouncement.idFor('Fort', date);
      expect(CollectionAnnouncement.idFor('Maradana', date), isNot(fort));
      expect(CollectionAnnouncement.idFor('Fort', DateTime(2026, 3, 6)), isNot(fort));
    });

    test('reads a cancelled update', () async {
      final announcement = CollectionAnnouncement.fromFirestore(await stored('a1', {
        'driverId': 'drv1',
        'ward': 'Fort',
        'collectionDate': Timestamp.fromDate(DateTime(2026, 10, 13)),
        'note': 'Truck breakdown',
        'createdAt': Timestamp.fromDate(created),
        'sent': true,
        'cancelled': true,
        'isUpdate': true,
      }));

      expect(announcement.ward, 'Fort');
      expect(announcement.collectionDate, DateTime(2026, 10, 13));
      expect(announcement.note, 'Truck breakdown');
      expect(announcement.sent, isTrue);
      expect(announcement.cancelled, isTrue);
      expect(announcement.isUpdate, isTrue);
    });

    test('is a normal, un-sent announcement by default', () async {
      final announcement = CollectionAnnouncement.fromFirestore(await stored('a2', {
        'ward': 'Fort',
        'collectionDate': Timestamp.fromDate(DateTime(2026, 10, 13)),
      }));

      expect(announcement.sent, isFalse);
      expect(announcement.cancelled, isFalse);
      expect(announcement.isUpdate, isFalse);
      expect(announcement.note, '');
    });

    test('saves only the date and always as not yet sent', () {
      final map = CollectionAnnouncement(
        id: 'a3',
        driverId: 'drv1',
        ward: 'Fort',
        collectionDate: DateTime(2026, 10, 13, 17, 45),
        createdAt: created,
        sent: true,
      ).toMap();

      expect(map['collectionDate'], Timestamp.fromDate(DateTime(2026, 10, 13)));
      expect(map['sent'], isFalse);
      expect(map['ward'], 'Fort');
    });
  });
}
