import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'providers/auth_provider.dart';
import 'router/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const WasteApp());
}

class WasteApp extends StatelessWidget {
  const WasteApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider()..initialize(),
      child: Builder(
        builder: (context) {
          final router = buildRouter();
          return MaterialApp.router(
            title: 'Smart Waste',
            debugShowCheckedModeBanner: false,
            theme: ThemeData(
              colorScheme: ColorScheme.fromSeed(seedColor: Colors.green),
              useMaterial3: true,
            ),
            routerConfig: router,
          );
        },
      ),
    );
  }
}
