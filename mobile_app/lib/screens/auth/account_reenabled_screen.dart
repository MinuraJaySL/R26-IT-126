import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../models/app_user.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/gradient_background.dart';
import '../../widgets/gradient_button.dart';

class AccountReenabledScreen extends StatefulWidget {
  const AccountReenabledScreen({super.key});

  @override
  State<AccountReenabledScreen> createState() => _AccountReenabledScreenState();
}

class _AccountReenabledScreenState extends State<AccountReenabledScreen> {
  bool _busy = false;

  Future<void> _continue() async {
    setState(() => _busy = true);
    final auth = context.read<AuthProvider>();
    await auth.acknowledgeRecoveryNotice();
    if (!mounted) return;
    setState(() => _busy = false);
    switch (auth.user?.role) {
      case UserRole.admin:
        context.go('/admin');
        break;
      case UserRole.driver:
        context.go('/driver');
        break;
      case UserRole.resident:
      case null:
        context.go('/resident');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final note = context.watch<AuthProvider>().user?.pendingRecoveryNotice;

    return Scaffold(
      body: GradientBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check_circle, size: 48, color: Colors.white),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Your Account Has Been Re-enabled',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'You can now sign in and use the app as normal.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white70, height: 1.4),
                    ),
                    const SizedBox(height: 32),
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.cardBackground,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.12),
                            blurRadius: 24,
                            offset: const Offset(0, 12),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (note != null && note.isNotEmpty) ...[
                            const Text(
                              'Note from your administrator',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSubtitle,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              note,
                              style: const TextStyle(
                                fontSize: 15,
                                color: AppColors.textHeading,
                                height: 1.4,
                              ),
                            ),
                            const SizedBox(height: 20),
                          ],
                          GradientButton(label: 'Continue', busy: _busy, onPressed: _continue),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
