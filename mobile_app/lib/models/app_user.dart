enum UserRole { resident, driver, admin }

class AppUser {
  final String uid;
  final String email;
  final UserRole role;
  final String name;
  final String phone;
  final String vehicleNumber;
  final bool disabled;
  // Resident's home ward (Colombo MC) — used to target next-day collection
  // announcements. Empty until they set it in their profile.
  final String ward;
  // Set by an admin's resolveRecoveryRequest call only when they re-enable
  // this account — shown once via AccountReenabledScreen, then cleared.
  final String? pendingRecoveryNotice;

  AppUser({
    required this.uid,
    required this.email,
    required this.role,
    this.name = '',
    this.phone = '',
    this.vehicleNumber = '',
    this.disabled = false,
    this.ward = '',
    this.pendingRecoveryNotice,
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
      disabled: data['disabled'] ?? false,
      ward: data['ward'] ?? '',
      pendingRecoveryNotice: data['pendingRecoveryNotice'],
    );
  }

  // clearRecoveryNotice is a separate flag (not just an omittable param)
  // because the notice's correct "no update" value is "leave as-is" while
  // its correct "cleared" value is null — a nullable param defaulting to
  // null can't distinguish those two cases.
  AppUser copyWith({
    String? name,
    String? phone,
    String? ward,
    bool clearRecoveryNotice = false,
  }) {
    return AppUser(
      uid: uid,
      email: email,
      role: role,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      vehicleNumber: vehicleNumber,
      disabled: disabled,
      ward: ward ?? this.ward,
      pendingRecoveryNotice: clearRecoveryNotice ? null : pendingRecoveryNotice,
    );
  }
}
