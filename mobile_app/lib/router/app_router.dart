import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../models/app_user.dart';
import '../models/pickup_request.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/resident/resident_dashboard.dart';
import '../screens/resident/complete_profile_screen.dart';
import '../screens/resident/flag_placement_screen.dart';
import '../screens/resident/my_pickups_screen.dart';
import '../screens/resident/my_reports_screen.dart';
import '../screens/resident/report_issue_screen.dart';
import '../screens/resident/track_truck_screen.dart';
import '../screens/driver/driver_dashboard.dart';
import '../screens/driver/driver_bin_reports_screen.dart';
import '../screens/driver/driver_map_screen.dart';
import '../screens/driver/driver_requests_screen.dart';
import '../screens/driver/driver_missed_screen.dart';
import '../screens/admin/admin_dashboard_screen.dart';
import '../screens/admin/user_management_screen.dart';
import '../screens/admin/add_driver_screen.dart';
import '../screens/profile/profile_screen.dart';

GoRouter buildRouter() {
  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final auth = context.read<AuthProvider>();
      if (auth.loading) return null;
      final loggedIn = auth.isLoggedIn;
      final onAuth = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';

      if (!loggedIn && !onAuth) return '/login';
      if (loggedIn && onAuth) {
        switch (auth.user!.role) {
          case UserRole.admin:
            return '/admin';
          case UserRole.driver:
            return '/driver';
          case UserRole.resident:
            return '/resident';
        }
      }

      // Residents who self-registered only have email/password — gate them
      // into completing name/phone before they can reach any other
      // /resident/* route, but don't trap them on the gate once it's done.
      if (loggedIn && auth.user!.role == UserRole.resident) {
        final onCompleteProfile =
            state.matchedLocation == '/resident/complete-profile';
        if (!auth.user!.hasCompleteProfile && !onCompleteProfile) {
          return '/resident/complete-profile';
        }
        if (auth.user!.hasCompleteProfile && onCompleteProfile) {
          return '/resident';
        }
      }

      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (ctx, _) => const LoginScreen()),
      GoRoute(path: '/register', builder: (ctx, _) => const RegisterScreen()),
      GoRoute(path: '/resident', builder: (ctx, _) => const ResidentDashboard()),
      GoRoute(
        path: '/resident/complete-profile',
        builder: (ctx, _) => const CompleteProfileScreen(),
      ),
      GoRoute(
        path: '/resident/flag',
        builder: (ctx, _) => const FlagPlacementScreen(),
      ),
      GoRoute(
        path: '/resident/pickups',
        builder: (ctx, _) => const MyPickupsScreen(),
      ),
      GoRoute(
        path: '/resident/track',
        builder: (ctx, state) =>
            TrackTruckScreen(request: state.extra as PickupRequest?),
      ),
      GoRoute(
        path: '/resident/reports',
        builder: (ctx, _) => const MyReportsScreen(),
      ),
      GoRoute(
        path: '/resident/report',
        builder: (ctx, _) => const ReportIssueScreen(),
      ),
      GoRoute(path: '/driver', builder: (ctx, _) => const DriverDashboard()),
      GoRoute(path: '/driver/map', builder: (ctx, _) => const DriverMapScreen()),
      GoRoute(
        path: '/driver/requests',
        builder: (ctx, _) => const DriverRequestsScreen(),
      ),
      GoRoute(
        path: '/driver/missed',
        builder: (ctx, _) => const DriverMissedScreen(),
      ),
      GoRoute(
        path: '/driver/reports',
        builder: (ctx, _) => const DriverBinReportsScreen(),
      ),
      GoRoute(path: '/admin', builder: (ctx, _) => const AdminDashboardScreen()),
      GoRoute(
        path: '/admin/users',
        builder: (ctx, _) => const UserManagementScreen(),
      ),
      GoRoute(
        path: '/admin/add-driver',
        builder: (ctx, _) => const AddDriverScreen(),
      ),
      GoRoute(path: '/profile', builder: (ctx, _) => const ProfileScreen()),
    ],
  );
}
