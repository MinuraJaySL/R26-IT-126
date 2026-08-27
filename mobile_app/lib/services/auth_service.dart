import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:http/http.dart' as http;
import '../config/verification_api_config.dart';
import '../models/app_user.dart';

/// Thrown when the verification Worker rejects a request (invalid email,
/// wrong code, expired, rate limited, etc) or can't be reached at all.
class VerificationApiException implements Exception {
  VerificationApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // A disabled account is still allowed to authenticate here — the router's
  // redirect gate is what actually stops them, the same way the resident
  // profile-completion gate works. That keeps them signed in just long
  // enough to submit their own account-recovery request (see
  // AccountDisabledScreen), which needs a real session so Firestore rules
  // can verify request.auth.uid == the request's own uid.
  Future<AppUser?> signIn(String email, String password) async {
    final cred = await _auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    return _fetchUser(cred.user!.uid);
  }

  /// Step 1 of sign-up: asks the verification Worker to email a 6-digit
  /// code to [email]. Throws [VerificationApiException] on failure.
  Future<void> requestVerificationCode(String email) async {
    await _postToWorker('/request-code', {'email': email});
  }

  /// Step 2 of sign-up: confirms the code the user typed matches the one
  /// emailed to them. The comparison happens entirely inside the Worker —
  /// this call never learns the correct code, only whether it matched.
  Future<void> confirmVerificationCode(String email, String code) async {
    await _postToWorker('/confirm-code', {'email': email, 'code': code});
  }

  /// Step 3 of sign-up: the Worker only creates the Firebase Auth account if
  /// its own server-side record shows this email was verified (step 2
  /// actually succeeded). Once created, this client signs itself in with the
  /// same email/password — the Worker never hands back a token, since the
  /// public Identity Toolkit signUp endpoint it uses needs no admin
  /// privileges and neither does a normal sign-in.
  Future<AppUser?> completeRegistration(String email, String password) async {
    await _postToWorker('/complete-registration', {
      'email': email,
      'password': password,
    });
    final cred = await _auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    return _fetchUser(cred.user!.uid);
  }

  Future<Map<String, dynamic>> _postToWorker(
    String path,
    Map<String, dynamic> body,
  ) async {
    late final http.Response res;
    try {
      res = await http
          .post(
            Uri.parse('${VerificationApiConfig.baseUrl}$path'),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 20));
    } catch (_) {
      throw VerificationApiException(
        'Could not reach the server. Check your connection and try again.',
      );
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return data;
    }
    throw VerificationApiException(
      data['error'] as String? ?? 'Something went wrong. Please try again.',
    );
  }

  Future<AppUser?> getCurrentUser() async {
    final user = _auth.currentUser;
    if (user == null) return null;
    return _fetchUser(user.uid);
  }

  Future<AppUser?> _fetchUser(String uid) async {
    final doc = await _db.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    return AppUser.fromMap(uid, doc.data()!);
  }

  /// Firebase's own built-in reset flow — sends the user an email with a
  /// link to a Firebase-hosted page where they set a new password. Nothing
  /// sensitive passes through our own backend for this.
  Future<void> sendPasswordResetEmail(String email) {
    return _auth.sendPasswordResetEmail(email: email);
  }

  Future<void> signOut() => _auth.signOut();
}
