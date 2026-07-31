import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../models/app_user.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  Future<AppUser?> signIn(String email, String password) async {
    final cred = await _auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    return _fetchUser(cred.user!.uid);
  }

  /// Step 1 of sign-up: asks the backend to email a 6-digit code to [email].
  /// Throws [FirebaseFunctionsException] with a user-facing message on failure
  /// (invalid email, account already exists, rate limited, etc).
  Future<void> requestVerificationCode(String email) async {
    await _functions
        .httpsCallable('requestVerificationCode')
        .call({'email': email});
  }

  /// Step 2 of sign-up: confirms the code the user typed in matches the one
  /// that was emailed. Throws [FirebaseFunctionsException] on mismatch/expiry.
  Future<void> confirmVerificationCode(String email, String code) async {
    await _functions
        .httpsCallable('confirmVerificationCode')
        .call({'email': email, 'code': code});
  }

  /// Step 3 of sign-up: only succeeds if the backend has this email marked as
  /// verified. Creates the Firebase Auth account + Firestore profile, signs
  /// the client in via a custom token, and returns the new user.
  Future<AppUser?> completeRegistration(String email, String password) async {
    final result = await _functions
        .httpsCallable('completeRegistration')
        .call({'email': email, 'password': password});
    final customToken = result.data['customToken'] as String;
    final cred = await _auth.signInWithCustomToken(customToken);
    return _fetchUser(cred.user!.uid);
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

  Future<void> signOut() => _auth.signOut();
}
