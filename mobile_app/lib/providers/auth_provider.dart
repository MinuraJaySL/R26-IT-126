import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
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

  Future<bool> register(String email, String password) async {
    _error = null;
    try {
      final user = await _authService.register(email, password);
      if (user == null) {
        _error = 'Registration failed. Please try again.';
        notifyListeners();
        return false;
      }
      _user = user;
      _saveFcmToken(); // fire-and-forget
      notifyListeners();
      return true;
    } on Exception catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
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
