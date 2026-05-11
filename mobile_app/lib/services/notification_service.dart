import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

class NotificationService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;

  Future<void> initialize() async {
    await _fcm.requestPermission(alert: true, badge: true, sound: true);

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      // Foreground notification — handled via in-app snackbar (see main)
      debugPrint('FCM foreground: ${message.notification?.title}');
    });
  }

  Future<String?> getToken() => _fcm.getToken();

  // Save FCM token to Firestore so backend can target this device
  // Called after login — wired in AuthProvider
  Stream<String> get tokenRefreshStream => _fcm.onTokenRefresh;
}
