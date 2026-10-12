import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/app_user.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';
import '../utils/friendly_error.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final NotificationService _notifService = NotificationService();
  StreamSubscription<String>? _tokenRefreshSub;

  AppUser? _user;
  bool _loading = true;
  String? _error;

  AppUser? get user => _user;
  bool get loading => _loading;
  String? get error => _error;
  bool get isLoggedIn => _user != null;

  // Restores the session Firebase kept from the last sign-in, so the app
  // opens on the user's dashboard rather than the login screen (main.dart
  // shows a splash until this finishes; the router does the rest).
  Future<void> initialize() async {
    try {
      _user = await _authService.getCurrentUser();
      if (_user != null) _saveFcmToken(); // fire-and-forget, as on sign-in
    } catch (_) {
      // Couldn't load the profile (e.g. first start with no connection) —
      // fall through to the login screen rather than hang on the splash.
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> signIn(String email, String password) async {
    _error = null;
    try {
      final user = await _authService.signIn(email, password);
      if (user == null) {
        _error = 'Account not found. Please register first.';
        notifyListeners();
        return false;
      }
      _user = user;
      _saveFcmToken(); // fire-and-forget — FCM must not block auth
      notifyListeners();
      return true;
    } catch (e) {
      _error = friendlyError(e, fallback: 'Could not log in. Please try again.');
      notifyListeners();
      return false;
    }
  }

  /// Step 1 of sign-up: request a 6-digit code be emailed to [email].
  /// Returns true on success; on failure sets [error] and returns false.
  Future<bool> requestVerificationCode(String email) async {
    _error = null;
    try {
      await _authService.requestVerificationCode(email);
      return true;
    } on VerificationApiException catch (e) {
      _error = e.message;
      notifyListeners();
      return false;
    }
  }

  /// Step 2 of sign-up: confirm the code the user typed matches.
  Future<bool> confirmVerificationCode(String email, String code) async {
    _error = null;
    try {
      await _authService.confirmVerificationCode(email, code);
      return true;
    } on VerificationApiException catch (e) {
      _error = e.message;
      notifyListeners();
      return false;
    }
  }

  /// Step 3 of sign-up: create the account now that the email is verified.
  Future<bool> completeRegistration(String email, String password) async {
    _error = null;
    try {
      final user = await _authService.completeRegistration(email, password);
      if (user == null) {
        _error = 'Registration failed. Please try again.';
        notifyListeners();
        return false;
      }
      _user = user;
      _saveFcmToken(); // fire-and-forget
      notifyListeners();
      return true;
    } on VerificationApiException catch (e) {
      _error = e.message;
      notifyListeners();
      return false;
    }
  }

  /// Completes a resident's profile (name + phone [+ ward]) after
  /// self-registration, or updates it later from the profile screen. Only
  /// ever touches `name`/`phone`/`ward` — never `role`, so it stays within
  /// what a signed-in user is allowed to update on their own doc.
  Future<bool> completeProfile(String name, String phone, {String? ward}) async {
    if (_user == null) return false;
    _error = null;
    try {
      final data = <String, dynamic>{'name': name, 'phone': phone};
      if (ward != null) data['ward'] = ward;
      await FirebaseFirestore.instance
          .collection('users')
          .doc(_user!.uid)
          .update(data);
      _user = _user!.copyWith(name: name, phone: phone, ward: ward);
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Could not save your profile. Please try again.';
      notifyListeners();
      return false;
    }
  }

  /// Returns true when the request went through cleanly enough to show the
  /// "check your inbox" message — including when the email isn't actually
  /// registered, so we never reveal that to the caller (only a genuinely
  /// malformed email address is reported back as an error).
  Future<bool> sendPasswordResetEmail(String email) async {
    _error = null;
    try {
      await _authService.sendPasswordResetEmail(email);
      return true;
    } on FirebaseAuthException catch (e) {
      if (e.code == 'invalid-email') {
        _error = 'Please enter a valid email address.';
        notifyListeners();
        return false;
      }
      return true;
    } catch (_) {
      return true;
    }
  }

  /// Changes the signed-in user's password. Also lifts the first-login
  /// gate for a driver still on their temporary password.
  Future<bool> changePassword(String currentPassword, String newPassword) async {
    if (_user == null) return false;
    _error = null;
    try {
      await _authService.changePassword(currentPassword, newPassword);
    } on FirebaseAuthException catch (e) {
      _error = switch (e.code) {
        'wrong-password' || 'invalid-credential' =>
          'The password you entered is incorrect.',
        'weak-password' => 'Please choose a stronger password.',
        'too-many-requests' => 'Too many attempts. Please try again later.',
        'network-request-failed' =>
          'No internet connection. Please try again.',
        _ => 'Could not change your password. Please try again.',
      };
      notifyListeners();
      return false;
    } catch (_) {
      _error = 'Could not change your password. Please try again.';
      notifyListeners();
      return false;
    }

    if (_user!.mustChangePassword) {
      try {
        await FirebaseFirestore.instance
            .collection('users')
            .doc(_user!.uid)
            .update({'mustChangePassword': false});
      } catch (_) {
        // Best-effort — worst case they're asked once more next start.
      }
      _user = _user!.copyWith(mustChangePassword: false);
    }
    notifyListeners();
    return true;
  }

  /// Clears the one-time "your account was re-enabled" notice after the
  /// user has seen it on AccountReenabledScreen, so the router gate lets
  /// them through to their real dashboard on the next check.
  Future<void> acknowledgeRecoveryNotice() async {
    if (_user == null) return;
    try {
      await FirebaseFirestore.instance
          .collection('users')
          .doc(_user!.uid)
          .update({'pendingRecoveryNotice': FieldValue.delete()});
    } catch (_) {
      // Best-effort — worst case they see the notice once more next login.
    }
    _user = _user!.copyWith(clearRecoveryNotice: true);
    notifyListeners();
  }

  Future<void> signOut() async {
    _tokenRefreshSub?.cancel();
    _tokenRefreshSub = null;
    await _clearFcmToken();
    await _authService.signOut();
    _user = null;
    notifyListeners();
  }

  // Unregisters this device from the account being signed out, so its
  // pushes stop arriving here (the next person to sign in on this phone
  // would otherwise see them). Only removes the token if it is this
  // device's — the account may since have signed in on another phone, and
  // that one must keep receiving. Has to run before the sign-out: the rules
  // only let a signed-in user update their own doc.
  Future<void> _clearFcmToken() async {
    final uid = _user?.uid;
    if (uid == null) return;
    try {
      final doc = FirebaseFirestore.instance.collection('users').doc(uid);
      await Future(() async {
        final token = await _notifService.getToken();
        if (token == null) return;
        final saved = (await doc.get()).data()?['fcmToken'];
        if (saved == token) await doc.update({'fcmToken': FieldValue.delete()});
      }).timeout(const Duration(seconds: 5));
    } catch (_) {
      // Best-effort — being offline must not stop someone signing out.
    }
  }

  // Requests notification permission, saves the current FCM token, and
  // keeps it fresh if the token rotates (FCM tokens aren't permanent —
  // they can change after a reinstall, an OS-level cache clear, etc). None
  // of this actually SENDS anything — it just gets this device registered
  // to receive a push the Worker later sends via /notify.
  Future<void> _saveFcmToken() async {
    try {
      if (_user == null) return;
      await _notifService.initialize();
      final token = await _notifService.getToken();
      if (token != null) {
        await FirebaseFirestore.instance
            .collection('users')
            .doc(_user!.uid)
            .update({'fcmToken': token});
      }

      _tokenRefreshSub?.cancel();
      _tokenRefreshSub = _notifService.tokenRefreshStream.listen((newToken) {
        if (_user == null) return;
        FirebaseFirestore.instance
            .collection('users')
            .doc(_user!.uid)
            .update({'fcmToken': newToken})
            .catchError((_) {});
      });
    } catch (_) {
      // Best-effort — FCM is not available on all platforms/configs
    }
  }
}
