import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config/verification_api_config.dart';

class NotificationService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;

  Future<void> initialize() async {
    // Showing a push that arrives while the app is open, and reacting to a
    // tapped one, is wired once for the whole app in main.dart.
    await _fcm.requestPermission(alert: true, badge: true, sound: true);
  }

  Future<String?> getToken() => _fcm.getToken();

  // Save FCM token to Firestore so backend can target this device
  // Called after login — wired in AuthProvider
  Stream<String> get tokenRefreshStream => _fcm.onTokenRefresh;

  /// Asks the Worker's /notify endpoint to push a notification for one of
  /// its 5 known events (see cf-worker's handleNotify) — the Worker itself
  /// re-derives the target user and message from [id]'s real document, so
  /// this call only ever supplies an event name and a doc id, never
  /// arbitrary notification text.
  ///
  /// Fire-and-forget by design: a failed push (no network, stale token,
  /// etc) must never block or fail the real action that triggered it — the
  /// caller already completed that before this runs. Errors are swallowed,
  /// not surfaced, matching how _saveFcmToken already treats FCM as
  /// best-effort elsewhere in this app.
  Future<void> notifyEvent(String event, String id) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;
      final idToken = await user.getIdToken();
      await http
          .post(
            Uri.parse('${VerificationApiConfig.baseUrl}/notify'),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({'idToken': idToken, 'event': event, 'id': id}),
          )
          .timeout(const Duration(seconds: 10));
    } catch (e) {
      debugPrint('notifyEvent($event, $id) failed: $e');
    }
  }

  /// Asks the Worker to send an announcement *update* to residents right
  /// now instead of at the next scheduled run (see cf-worker's
  /// handleSendAnnouncementUpdate — it only agrees for an update to an
  /// announcement residents were already notified about, and only before
  /// the evening deadline). Returns whether it was sent; on false the
  /// Worker's retry run at that deadline still picks it up, so the caller
  /// only needs this to word its confirmation message.
  Future<bool> sendAnnouncementUpdate(String id) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return false;
      final idToken = await user.getIdToken();
      final res = await http
          .post(
            Uri.parse('${VerificationApiConfig.baseUrl}/send-announcement-update'),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({'idToken': idToken, 'id': id}),
          )
          .timeout(const Duration(seconds: 30));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (e) {
      debugPrint('sendAnnouncementUpdate($id) failed: $e');
      return false;
    }
  }
}
