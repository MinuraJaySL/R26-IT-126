import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../config/verification_api_config.dart';

/// Thrown when the admin Worker endpoint rejects a request or can't be reached.
class AdminApiException implements Exception {
  AdminApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Lightweight read model for the User Management screen — separate from
/// `AppUser` (which represents the signed-in user's own identity) because
/// listings need a display name, which only driver docs currently carry.
class AdminUserSummary {
  AdminUserSummary({
    required this.uid,
    required this.email,
    required this.name,
    required this.role,
    required this.phone,
    required this.vehicleNumber,
  });

  final String uid;
  final String email;
  final String name;
  final String role;
  final String phone;
  final String vehicleNumber;

  factory AdminUserSummary.fromDoc(String uid, Map<String, dynamic> data) {
    return AdminUserSummary(
      uid: uid,
      email: (data['email'] as String?) ?? '',
      name: (data['name'] as String?) ?? '',
      role: (data['role'] as String?) ?? 'resident',
      phone: (data['phone'] as String?) ?? '',
      vehicleNumber: (data['vehicleNumber'] as String?) ?? '',
    );
  }
}

class AdminService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Fetches every user doc. Only succeeds for a signed-in admin — enforced
  /// server-side by firestore.rules (`isAdmin()`), not by this client code.
  Future<List<AdminUserSummary>> fetchAllUsers() async {
    final snapshot = await _db.collection('users').get();
    return snapshot.docs
        .map((doc) => AdminUserSummary.fromDoc(doc.id, doc.data()))
        .toList();
  }

  /// Counts users by role from the same collection fetch used for the
  /// User Management list — cheap enough at this app's scale to avoid a
  /// second round trip or a separate counters document.
  Future<Map<String, int>> fetchRoleCounts() async {
    final users = await fetchAllUsers();
    final counts = <String, int>{'resident': 0, 'driver': 0, 'admin': 0};
    for (final u in users) {
      counts[u.role] = (counts[u.role] ?? 0) + 1;
    }
    return counts;
  }

  /// Updates an existing driver's own profile fields. Unlike createDriver,
  /// this doesn't need the Worker — it's just a Firestore write, and
  /// firestore.rules already grants admins unconditional update access to
  /// any user doc, so this can go straight through the client SDK.
  Future<void> updateDriverDetails({
    required String uid,
    required String name,
    required String phone,
    required String vehicleNumber,
  }) {
    return _db.collection('users').doc(uid).update({
      'name': name,
      'phone': phone,
      'vehicleNumber': vehicleNumber,
    });
  }

  /// Calls the Worker's admin-only endpoint to create a driver account.
  /// Sends the current user's Firebase ID token so the Worker can verify
  /// the caller is really an admin — this client-side call is not itself a
  /// security boundary; the Worker's server-side role check is.
  Future<void> createDriver({
    required String driverName,
    required String driverEmail,
    required String driverPhone,
    required String vehicleNumber,
  }) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw AdminApiException('You must be signed in to do this.');
    }
    final idToken = await user.getIdToken();

    late final http.Response res;
    try {
      res = await http
          .post(
            Uri.parse('${VerificationApiConfig.baseUrl}/admin/create-driver'),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({
              'idToken': idToken,
              'driverName': driverName,
              'driverEmail': driverEmail,
              'driverPhone': driverPhone,
              'vehicleNumber': vehicleNumber,
            }),
          )
          .timeout(const Duration(seconds: 20));
    } catch (_) {
      throw AdminApiException(
        'Could not reach the server. Check your connection and try again.',
      );
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    throw AdminApiException(
      data['error'] as String? ?? 'Something went wrong. Please try again.',
    );
  }
}
