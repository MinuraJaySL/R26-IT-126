import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/gradient_background.dart';
import '../../widgets/gradient_button.dart';
import '../../widgets/styled_text_field.dart';

enum _Step { email, code, password }

final _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
const _resendCooldownSeconds = 60;

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen>
    with SingleTickerProviderStateMixin {
  final _emailCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  _Step _step = _Step.email;
  bool _busy = false;
  int _resendIn = 0;
  Timer? _resendTimer;

  late final AnimationController _fadeController;
  late final Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOut,
    );
    _fadeController.forward();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _codeCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    _resendTimer?.cancel();
    _fadeController.dispose();
    super.dispose();
  }

  void _startResendCooldown() {
    _resendTimer?.cancel();
    setState(() => _resendIn = _resendCooldownSeconds);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      setState(() => _resendIn--);
      if (_resendIn <= 0) timer.cancel();
    });
  }

  void _showError(String message) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        icon: const Icon(Icons.error_outline, color: AppColors.error, size: 44),
        title: const Text('Something Went Wrong'),
        content: Text(message, textAlign: TextAlign.center),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(dialogContext),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryDark,
              foregroundColor: Colors.white,
            ),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _sendCode() async {
    final email = _emailCtrl.text.trim();
    if (!_emailRegex.hasMatch(email)) {
      _showError('Please enter a valid email address.');
      return;
    }
    setState(() => _busy = true);
    final auth = context.read<AuthProvider>();
    final ok = await auth.requestVerificationCode(email);
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      setState(() => _step = _Step.code);
      _startResendCooldown();
    } else {
      _showError(auth.error ?? 'Could not send verification code.');
    }
  }

  Future<void> _verifyCode() async {
    final code = _codeCtrl.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      _showError('Enter the 6-digit code from your email.');
      return;
    }
    setState(() => _busy = true);
    final auth = context.read<AuthProvider>();
    final ok = await auth.confirmVerificationCode(_emailCtrl.text.trim(), code);
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      setState(() => _step = _Step.password);
    } else {
      _showError(auth.error ?? 'Incorrect or expired code.');
    }
  }

  Future<void> _createAccount() async {
    if (_passCtrl.text.length < 6) {
      _showError('Password must be at least 6 characters.');
      return;
    }
    if (_passCtrl.text != _confirmCtrl.text) {
      _showError('Passwords do not match.');
      return;
    }
    setState(() => _busy = true);
    final auth = context.read<AuthProvider>();
    final ok = await auth.completeRegistration(
      _emailCtrl.text.trim(),
      _passCtrl.text,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      context.go('/resident');
    } else {
      _showError(auth.error ?? 'Registration failed. Please try again.');
    }
  }

  void _handleBack() {
    if (_step == _Step.email) {
      context.go('/login');
    } else if (_step == _Step.code) {
      setState(() => _step = _Step.email);
    } else {
      setState(() => _step = _Step.code);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
            child: Center(
              child: ConstrainedBox(
                // Same reasoning as the login screen: caps the form at a
                // phone-like width on wide (desktop/PC) viewports instead
                // of stretching it edge-to-edge across the window.
                constraints: const BoxConstraints(maxWidth: 440),
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          _BackButton(onPressed: _handleBack),
                          const Expanded(
                            child: Text(
                              'Create Account',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(width: 40),
                        ],
                      ),
                      const SizedBox(height: 24),
                      _StepIndicator(step: _step),
                      const SizedBox(height: 24),
                      Container(
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
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 300),
                          transitionBuilder: (child, animation) =>
                              FadeTransition(
                                opacity: animation,
                                child: SlideTransition(
                                  position: Tween<Offset>(
                                    begin: const Offset(0.05, 0),
                                    end: Offset.zero,
                                  ).animate(animation),
                                  child: child,
                                ),
                              ),
                          child: switch (_step) {
                            _Step.email => _EmailStep(
                              key: const ValueKey('email'),
                              emailCtrl: _emailCtrl,
                              busy: _busy,
                              onSubmit: _sendCode,
                            ),
                            _Step.code => _CodeStep(
                              key: const ValueKey('code'),
                              email: _emailCtrl.text.trim(),
                              codeCtrl: _codeCtrl,
                              busy: _busy,
                              resendIn: _resendIn,
                              onVerify: _verifyCode,
                              onResend: _sendCode,
                            ),
                            _Step.password => _PasswordStep(
                              key: const ValueKey('password'),
                              passCtrl: _passCtrl,
                              confirmCtrl: _confirmCtrl,
                              busy: _busy,
                              onSubmit: _createAccount,
                            ),
                          },
                        ),
                      ),
                      const SizedBox(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            'Already have an account?',
                            style: TextStyle(color: Colors.white70),
                          ),
                          TextButton(
                            onPressed: () => context.go('/login'),
                            child: const Text(
                              'Sign In',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  const _BackButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.15),
      shape: const CircleBorder(),
      child: IconButton(
        icon: const Icon(Icons.arrow_back, color: Colors.white),
        onPressed: onPressed,
      ),
    );
  }
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.step});

  final _Step step;

  @override
  Widget build(BuildContext context) {
    final labels = const ['Email', 'Verify', 'Password'];
    return Row(
      children: List.generate(3, (i) {
        final active = i <= step.index;
        return Expanded(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      height: 6,
                      decoration: BoxDecoration(
                        color: active
                            ? AppColors.accent
                            : Colors.white.withValues(alpha: 0.35),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      labels[i],
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: active
                            ? FontWeight.w600
                            : FontWeight.normal,
                        color: active
                            ? Colors.white
                            : Colors.white.withValues(alpha: 0.6),
                      ),
                    ),
                  ],
                ),
              ),
              if (i < 2) const SizedBox(width: 8),
            ],
          ),
        );
      }),
    );
  }
}

class _EmailStep extends StatelessWidget {
  const _EmailStep({
    super.key,
    required this.emailCtrl,
    required this.busy,
    required this.onSubmit,
  });

  final TextEditingController emailCtrl;
  final bool busy;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'What\'s your email?',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.textHeading,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'We\'ll send a 6-digit code to verify it\'s really you.',
          style: TextStyle(color: AppColors.textSubtitle),
        ),
        const SizedBox(height: 24),
        StyledTextField(
          controller: emailCtrl,
          label: 'Email',
          icon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
          autofocus: true,
        ),
        const SizedBox(height: 24),
        GradientButton(label: 'Send Code', busy: busy, onPressed: onSubmit),
      ],
    );
  }
}

class _CodeStep extends StatelessWidget {
  const _CodeStep({
    super.key,
    required this.email,
    required this.codeCtrl,
    required this.busy,
    required this.resendIn,
    required this.onVerify,
    required this.onResend,
  });

  final String email;
  final TextEditingController codeCtrl;
  final bool busy;
  final int resendIn;
  final VoidCallback onVerify;
  final VoidCallback onResend;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Enter verification code',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.textHeading,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'We sent a code to $email',
          style: const TextStyle(color: AppColors.textSubtitle),
        ),
        const SizedBox(height: 24),
        StyledTextField(
          controller: codeCtrl,
          label: '6-digit code',
          icon: Icons.password_outlined,
          keyboardType: TextInputType.number,
          autofocus: true,
          maxLength: 6,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 24,
            letterSpacing: 8,
            color: AppColors.textHeading,
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: resendIn > 0 ? null : onResend,
            child: Text(
              resendIn > 0 ? 'Resend code in ${resendIn}s' : 'Resend code',
              style: const TextStyle(color: AppColors.primaryDark),
            ),
          ),
        ),
        const SizedBox(height: 8),
        GradientButton(label: 'Verify', busy: busy, onPressed: onVerify),
      ],
    );
  }
}

class _PasswordStep extends StatelessWidget {
  const _PasswordStep({
    super.key,
    required this.passCtrl,
    required this.confirmCtrl,
    required this.busy,
    required this.onSubmit,
  });

  final TextEditingController passCtrl;
  final TextEditingController confirmCtrl;
  final bool busy;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Set a password',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.textHeading,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Email verified. Choose a password to finish creating your account.',
          style: TextStyle(color: AppColors.textSubtitle),
        ),
        const SizedBox(height: 24),
        StyledTextField(
          controller: passCtrl,
          label: 'Password',
          icon: Icons.lock_outline,
          obscureText: true,
        ),
        const SizedBox(height: 16),
        StyledTextField(
          controller: confirmCtrl,
          label: 'Confirm password',
          icon: Icons.lock_outline,
          obscureText: true,
        ),
        const SizedBox(height: 8),
        const Text(
          'New accounts are created as Resident. Driver accounts are created by admin.',
          style: TextStyle(color: AppColors.textSubtitle, fontSize: 12),
        ),
        const SizedBox(height: 16),
        GradientButton(
          label: 'Create Account',
          busy: busy,
          onPressed: onSubmit,
        ),
      ],
    );
  }
}
