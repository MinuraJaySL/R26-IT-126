import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'models/app_user.dart';
import 'providers/auth_provider.dart';
import 'router/app_router.dart';
import 'theme/app_colors.dart';
import 'widgets/app_feedback.dart';
import 'widgets/gradient_background.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Crashlytics has no web SDK — only wire it up on Android/iOS/desktop, so
  // an unhandled error there still surfaces (in the console) rather than
  // throwing on a call the package doesn't support.
  if (!kIsWeb) {
    FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
    PlatformDispatcher.instance.onError = (error, stack) {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      return true;
    };
  }

  runApp(const WasteApp());
}

class WasteApp extends StatefulWidget {
  const WasteApp({super.key});

  @override
  State<WasteApp> createState() => _WasteAppState();
}

class _WasteAppState extends State<WasteApp> {
  static const _home = '/resident';
  static const _inbox = '/resident/notifications';

  final _auth = AuthProvider();
  final _router = buildRouter();
  final _messengerKey = GlobalKey<ScaffoldMessengerState>();
  final _pushSubs = <StreamSubscription<RemoteMessage>>[];

  @override
  void initState() {
    super.initState();
    _startUp();
  }

  @override
  void dispose() {
    for (final sub in _pushSubs) {
      sub.cancel();
    }
    _auth.dispose();
    super.dispose();
  }

  Future<void> _startUp() async {
    await _auth.initialize();
    try {
      _pushSubs.add(FirebaseMessaging.onMessage.listen(_showInApp));
      _pushSubs.add(
        FirebaseMessaging.onMessageOpenedApp.listen((_) => _openInbox()),
      );
      // Set when the app was closed and a tapped push is what started it.
      final launchedBy = await FirebaseMessaging.instance.getInitialMessage();
      if (launchedBy != null) _openInbox();
    } catch (_) {
      // Best-effort — FCM is not available on all platforms/configs
    }
  }

  // The screen on top right now, including ones opened with push().
  String get _currentRoute {
    final matches = _router.routerDelegate.currentConfiguration;
    return matches.isEmpty ? '' : matches.last.matchedLocation;
  }

  // Android only puts a push in the notification bar while the app is in
  // the background — one that arrives with the app open would otherwise
  // show nothing, so it's surfaced here instead.
  void _showInApp(RemoteMessage message) {
    final user = _auth.user;
    if (user == null) return;
    final notification = message.notification;
    final text = [notification?.title, notification?.body]
        .where((part) => part != null && part.isNotEmpty)
        .join('\n');
    if (text.isEmpty) return;

    // Only residents have a notifications inbox to open.
    final canView = user.role == UserRole.resident && _currentRoute != _inbox;
    _messengerKey.currentState?.showSnackBar(
      appSnackBar(
        text,
        duration: const Duration(seconds: 6),
        action: canView
            ? SnackBarAction(label: 'VIEW', onPressed: _openInbox)
            : null,
      ),
    );
  }

  // A tapped push takes a resident to their inbox, where the message is.
  void _openInbox() {
    if (_auth.user?.role != UserRole.resident || _currentRoute == _inbox) return;
    if (_currentRoute.isNotEmpty) {
      _router.push(_inbox);
      return;
    }
    // No screen yet: the tap is what started the app, and the router is
    // still behind the splash. Wait for its first screen and open the inbox
    // on top of the dashboard — unless a gate sent the user somewhere else
    // (disabled account, incomplete profile), in which case leave them there.
    final delegate = _router.routerDelegate;
    void onNavigated() {
      delegate.removeListener(onNavigated);
      if (_currentRoute == _home) scheduleMicrotask(() => _router.push(_inbox));
    }

    delegate.addListener(onNavigated);
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: _auth,
      child: MaterialApp.router(
        title: 'GreenSweep',
        debugShowCheckedModeBanner: false,
        scaffoldMessengerKey: _messengerKey,
        // Keeps the router off-screen until the saved session has been
        // checked, so its first redirect already knows who is signed in and
        // the login screen never flashes up for a returning user.
        builder: (context, child) =>
            context.watch<AuthProvider>().loading ? const _Splash() : child!,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primaryDark),
          scaffoldBackgroundColor: AppColors.backgroundLight,
          appBarTheme: const AppBarTheme(
            backgroundColor: AppColors.primaryDark,
            foregroundColor: Colors.white,
            elevation: 0,
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryDark,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          floatingActionButtonTheme: const FloatingActionButtonThemeData(
            backgroundColor: AppColors.primaryDark,
            foregroundColor: Colors.white,
          ),
          snackBarTheme: SnackBarThemeData(
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          cardTheme: CardThemeData(
            elevation: 2,
            color: AppColors.cardBackground,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
        routerConfig: _router,
      ),
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: GradientBackground(
        child: Center(child: CircularProgressIndicator(color: Colors.white)),
      ),
    );
  }
}
