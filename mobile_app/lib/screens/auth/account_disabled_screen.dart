import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../models/recovery_request.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/gradient_background.dart';

class AccountDisabledScreen extends StatefulWidget {
  const AccountDisabledScreen({super.key});

  @override
  State<AccountDisabledScreen> createState() => _AccountDisabledScreenState();
}

class _AccountDisabledScreenState extends State<AccountDisabledScreen> {
  RecoveryRequest? _deniedRequest;
  bool _loadingNote = true;

  @override
  void initState() {
    super.initState();
    _loadDeniedNote();
  }

  Future<void> _loadDeniedNote() async {
    final uid = context.read<AuthProvider>().user?.uid;
    if (uid == null) {
      setState(() => _loadingNote = false);
      return;
    }
    final denied = await FirestoreService().fetchLatestDeniedRequest(uid);
    if (mounted) {
      setState(() {
        _deniedRequest = denied;
        _loadingNote = false;
      });
    }
  }

  Future<void> _signOutToLogin() async {
    await context.read<AuthProvider>().signOut();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
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
                      child: const Icon(Icons.block, size: 48, color: Colors.white),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Account Disabled',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Your account has been disabled by an administrator. '
                      'You will not be able to sign in until it is re-enabled.',
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
                          if (_loadingNote) ...[
                            const Center(
                              child: Padding(
                                padding: EdgeInsets.symmetric(vertical: 12),
                                child: SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                              ),
                            ),
                          ] else if (_deniedRequest?.resolutionNote != null) ...[
                            const Text(
                              'An administrator reviewed your request',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSubtitle,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _deniedRequest!.resolutionNote!,
                              style: const TextStyle(
                                fontSize: 15,
                                color: AppColors.textHeading,
                                height: 1.4,
                              ),
                            ),
                            const SizedBox(height: 20),
                          ],
                          SizedBox(
                            height: 50,
                            child: OutlinedButton.icon(
                              icon: const Icon(Icons.support_agent),
                              label: const Text('Contact Admin'),
                              onPressed: () =>
                                  context.push('/account-disabled/request'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.primaryDark,
                                side: const BorderSide(color: AppColors.primaryDark),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            height: 50,
                            child: ElevatedButton(
                              onPressed: _signOutToLogin,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primaryDark,
                                foregroundColor: Colors.white,
                              ),
                              child: const Text('OK'),
                            ),
                          ),
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
