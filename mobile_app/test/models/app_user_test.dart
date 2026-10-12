import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/models/app_user.dart';

void main() {
  group('AppUser.fromMap', () {
    test('reads every field of a driver document', () {
      final user = AppUser.fromMap('uid1', {
        'email': 'driver@example.com',
        'role': 'driver',
        'name': 'Nimal',
        'phone': '0771234567',
        'vehicleNumber': 'WP-1234',
        'disabled': true,
        'ward': 'Fort',
        'pendingRecoveryNotice': 'Welcome back',
        'mustChangePassword': true,
      });

      expect(user.uid, 'uid1');
      expect(user.email, 'driver@example.com');
      expect(user.role, UserRole.driver);
      expect(user.name, 'Nimal');
      expect(user.phone, '0771234567');
      expect(user.vehicleNumber, 'WP-1234');
      expect(user.disabled, isTrue);
      expect(user.ward, 'Fort');
      expect(user.pendingRecoveryNotice, 'Welcome back');
      expect(user.mustChangePassword, isTrue);
    });

    test('reads the admin role', () {
      expect(AppUser.fromMap('u', {'role': 'admin'}).role, UserRole.admin);
    });

    test('uses safe defaults for a document with no fields', () {
      final user = AppUser.fromMap('u', {});

      expect(user.role, UserRole.resident);
      expect(user.email, '');
      expect(user.name, '');
      expect(user.ward, '');
      expect(user.disabled, isFalse);
      expect(user.mustChangePassword, isFalse);
      expect(user.pendingRecoveryNotice, isNull);
    });

    test('treats an unknown role as a resident', () {
      expect(AppUser.fromMap('u', {'role': 'superuser'}).role, UserRole.resident);
    });
  });

  group('hasCompleteProfile', () {
    AppUser resident({String name = '', String ward = ''}) => AppUser(
          uid: 'u',
          email: 'r@example.com',
          role: UserRole.resident,
          name: name,
          ward: ward,
        );

    test('is false until both name and ward are set', () {
      expect(resident().hasCompleteProfile, isFalse);
      expect(resident(name: 'Kamal').hasCompleteProfile, isFalse);
      expect(resident(ward: 'Fort').hasCompleteProfile, isFalse);
    });

    test('is true with a name and a ward', () {
      expect(resident(name: 'Kamal', ward: 'Fort').hasCompleteProfile, isTrue);
    });
  });

  group('copyWith', () {
    final user = AppUser(
      uid: 'u',
      email: 'd@example.com',
      role: UserRole.driver,
      name: 'Nimal',
      phone: '077',
      ward: 'Fort',
      pendingRecoveryNotice: 'Welcome back',
      mustChangePassword: true,
    );

    test('changes only the fields it is given', () {
      final updated = user.copyWith(name: 'Sunil', mustChangePassword: false);

      expect(updated.name, 'Sunil');
      expect(updated.mustChangePassword, isFalse);
      expect(updated.phone, '077');
      expect(updated.ward, 'Fort');
      expect(updated.role, UserRole.driver);
      expect(updated.pendingRecoveryNotice, 'Welcome back');
    });

    test('clears the recovery notice only when asked to', () {
      expect(user.copyWith().pendingRecoveryNotice, 'Welcome back');
      expect(user.copyWith(clearRecoveryNotice: true).pendingRecoveryNotice, isNull);
    });
  });
}
