import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../models/recovery_request.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/gradient_background.dart';
import '../../widgets/gradient_button.dart';

const _defaultMessage =
    'I believe my account was disabled in error. Please review and '
    're-enable it if appropriate.';

class AccountRecoveryRequestScreen extends StatefulWidget {
  const AccountRecoveryRequestScreen({super.key});

  @override
  State<AccountRecoveryRequestScreen> createState() =>
      _AccountRecoveryRequestScreenState();
}

class _AccountRecoveryRequestScreenState
    extends State<AccountRecoveryRequestScreen> {
  final _messageCtrl = TextEditingController(text: _defaultMessage);
  bool _busy = false;
  bool _sent = false;

  @override
  void dispose() {
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_messageCtrl.text.trim().isEmpty) return;
    setState(() => _busy = true);
    final auth = context.read<AuthProvider>();
    final user = auth.user!;
    try {
      await FirestoreService().createRecoveryRequest(
        RecoveryRequest(
          id: const Uuid().v4(),
          uid: user.uid,
          email: user.email,
          message: _messageCtrl.text.trim(),
          status: RecoveryRequestStatus.open,
          createdAt: DateTime.now(),
        ),
      );
      if (mounted) setState(() => _sent = true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not send request: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
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
                child: Container(
                  padding: const EdgeInsets.all(24),
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
                  child: _sent ? _buildSentView() : _buildFormView(),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFormView() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Request Account Recovery',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppColors.textHeading,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'This message goes to your administrator.',
          style: TextStyle(color: AppColors.textSubtitle),
        ),
        const SizedBox(height: 20),
        TextField(
          controller: _messageCtrl,
          maxLines: 5,
          decoration: InputDecoration(
            labelText: 'Message',
            filled: true,
            fillColor: AppColors.backgroundWhite,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _busy ? null : () => context.pop(),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.textSubtitle,
                  side: const BorderSide(color: Color(0xFFE0E0E0)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('Back'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: GradientButton(label: 'Send', busy: _busy, onPressed: _send),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSentView() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.mark_email_read, size: 48, color: AppColors.primaryDark),
        const SizedBox(height: 16),
        const Text(
          'Request Sent',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppColors.textHeading,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Our team typically responds within 2–3 working days.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textSubtitle),
        ),
        const SizedBox(height: 24),
        GradientButton(label: 'OK', onPressed: _signOutToLogin),
      ],
    );
  }
}
