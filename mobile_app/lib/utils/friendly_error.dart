import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import '../services/admin_service.dart';
import '../services/auth_service.dart';

const _noConnection = 'No internet connection. Please check it and try again.';

/// Turns a caught error into a sentence that can be shown to the user —
/// never the raw text, which for Firebase looks like
/// "[cloud_firestore/permission-denied] The caller does not have…".
/// [fallback] is used for anything not recognised here, so pass one that
/// names what failed ("Could not save the request. Please try again.").
String friendlyError(
  Object? error, {
  String fallback = 'Something went wrong. Please try again.',
}) {
  debugPrint('friendlyError: $error');

  // The Worker's own errors are already written for the user.
  if (error is AdminApiException) return error.message;
  if (error is VerificationApiException) return error.message;

  if (error is TimeoutException) return _noConnection;
  if (error is! FirebaseException) return fallback;

  // Firebase Auth and Firestore name some of the same problems differently.
  return switch (error.code) {
    'invalid-credential' ||
    'wrong-password' ||
    'user-not-found' ||
    'invalid-login-credentials' =>
      'Incorrect email or password.',
    'invalid-email' => 'Please enter a valid email address.',
    'user-disabled' => 'This account has been disabled.',
    'too-many-requests' ||
    'resource-exhausted' =>
      'Too many attempts. Please try again later.',
    'network-request-failed' || 'unavailable' || 'deadline-exceeded' =>
      _noConnection,
    'permission-denied' => 'You do not have permission to do this.',
    'unauthenticated' ||
    'user-token-expired' ||
    'requires-recent-login' =>
      'Your session has expired. Please log in again.',
    'not-found' => 'This item no longer exists.',
    _ => fallback,
  };
}
