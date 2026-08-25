import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/app_user.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final NotificationService _notifService = NotificationService();

  AppUser? _user;
  bool _loading = true;
  String? _error;

  AppUser? get user => _user;
  bool get loading => _loading;
  String? get error => _error;
  bool get isLoggedIn => _user != null;

  Future<void> initialize() async {
    _user = await _authService.getCurrentUser();
    _loading = false;
    notifyListeners();
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
    } on Exception catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
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

  /// Completes a resident's profile (name + phone) after self-registration.
  /// Only ever touches `name`/`phone` — never `role`, so it stays within
  /// what a signed-in user is allowed to update on their own doc.
  Future<bool> completeProfile(String name, String phone) async {
    if (_user == null) return false;
    _error = null;
    try {
      await FirebaseFirestore.instance
          .collection('users')
          .doc(_user!.uid)
          .update({'name': name, 'phone': phone});
      _user = _user!.copyWith(name: name, phone: phone);
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

  Future<void> signOut() async {
    await _authService.signOut();
    _user = null;
    notifyListeners();
  }

  Future<void> _saveFcmToken() async {
    try {
      if (_user == null) return;
      final token = await _notifService.getToken();
      if (token != null) {
        await FirebaseFirestore.instance
            .collection('users')
            .doc(_user!.uid)
            .update({'fcmToken': token});
      }
    } catch (_) {
      // Best-effort — FCM is not available on all platforms/configs
    }
  }
}
