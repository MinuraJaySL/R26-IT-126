import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../models/app_user.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/resident/resident_dashboard.dart';
import '../screens/resident/flag_placement_screen.dart';
import '../screens/driver/driver_dashboard.dart';
import '../screens/driver/driver_map_screen.dart';
import '../screens/driver/driver_requests_screen.dart';
import '../screens/driver/driver_missed_screen.dart';

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
        return auth.user!.role == UserRole.driver
            ? '/driver'
            : '/resident';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (ctx, _) => const LoginScreen()),
      GoRoute(path: '/register', builder: (ctx, _) => const RegisterScreen()),
      GoRoute(path: '/resident', builder: (ctx, _) => const ResidentDashboard()),
      GoRoute(
        path: '/resident/flag',
        builder: (ctx, _) => const FlagPlacementScreen(),
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
    ],
  );
}
