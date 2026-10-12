import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/services/admin_service.dart';
import 'package:mobile_app/services/auth_service.dart';
import 'package:mobile_app/utils/friendly_error.dart';

FirebaseException _firestore(String code) => FirebaseException(
      plugin: 'cloud_firestore',
      code: code,
      message: 'raw technical text',
    );

void main() {
  const noConnection = 'No internet connection. Please check it and try again.';

  group('friendlyError', () {
    test('explains a wrong email or password', () {
      for (final code in ['invalid-credential', 'wrong-password', 'user-not-found']) {
        expect(
          friendlyError(FirebaseAuthException(code: code)),
          'Incorrect email or password.',
        );
      }
    });

    test('explains a badly written email address', () {
      expect(
        friendlyError(FirebaseAuthException(code: 'invalid-email')),
        'Please enter a valid email address.',
      );
    });

    test('explains too many attempts', () {
      expect(
        friendlyError(FirebaseAuthException(code: 'too-many-requests')),
        'Too many attempts. Please try again later.',
      );
    });

    test('explains a missing connection during sign-in', () {
      expect(
        friendlyError(FirebaseAuthException(code: 'network-request-failed')),
        noConnection,
      );
    });

    test('explains a missing connection to the database', () {
      expect(friendlyError(_firestore('unavailable')), noConnection);
      expect(friendlyError(_firestore('deadline-exceeded')), noConnection);
    });

    test('explains a timeout as a missing connection', () {
      expect(friendlyError(TimeoutException('slow')), noConnection);
    });

    test('explains a refused database action', () {
      expect(
        friendlyError(_firestore('permission-denied')),
        'You do not have permission to do this.',
      );
    });

    test('passes on messages the server already wrote for the user', () {
      expect(friendlyError(AdminApiException('Email already in use.')), 'Email already in use.');
      expect(friendlyError(VerificationApiException('Code expired.')), 'Code expired.');
    });

    test('uses the fallback for errors it does not recognise', () {
      expect(
        friendlyError(StateError('boom'), fallback: 'Could not save.'),
        'Could not save.',
      );
      expect(
        friendlyError(_firestore('data-loss'), fallback: 'Could not save.'),
        'Could not save.',
      );
      expect(friendlyError(null), 'Something went wrong. Please try again.');
    });

    test('never shows the raw technical text', () {
      for (final code in ['permission-denied', 'unavailable', 'not-found', 'data-loss']) {
        expect(friendlyError(_firestore(code)), isNot(contains('raw technical text')));
        expect(friendlyError(_firestore(code)), isNot(contains('cloud_firestore')));
      }
    });
  });
}
