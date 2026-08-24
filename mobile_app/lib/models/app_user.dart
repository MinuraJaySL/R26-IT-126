enum UserRole { resident, driver, admin }

class AppUser {
  final String uid;
  final String email;
  final UserRole role;
  final String name;
  final String phone;
  final String vehicleNumber;

  AppUser({
    required this.uid,
    required this.email,
    required this.role,
    this.name = '',
    this.phone = '',
    this.vehicleNumber = '',
  });

  // Residents self-register with just email/password (see the OTP signup
  // flow) — name and phone are collected afterward via the profile
  // completion gate, so an empty name here means that gate hasn't run yet.
  bool get hasCompleteProfile => name.isNotEmpty;

  factory AppUser.fromMap(String uid, Map<String, dynamic> data) {
    return AppUser(
      uid: uid,
      email: data['email'] ?? '',
      role: UserRole.values.firstWhere(
        (e) => e.name == (data['role'] ?? 'resident'),
        orElse: () => UserRole.resident,
      ),
      name: data['name'] ?? '',
      phone: data['phone'] ?? '',
      vehicleNumber: data['vehicleNumber'] ?? '',
    );
  }

  AppUser copyWith({String? name, String? phone}) {
    return AppUser(
      uid: uid,
      email: email,
      role: role,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      vehicleNumber: vehicleNumber,
    );
  }
}
