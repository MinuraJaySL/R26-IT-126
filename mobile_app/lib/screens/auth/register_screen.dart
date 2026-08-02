import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_input_decoration.dart';

enum _Step { email, code, password }

final _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
const _resendCooldownSeconds = 60;

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _emailCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  _Step _step = _Step.email;
  bool _busy = false;
  int _resendIn = 0;
  Timer? _resendTimer;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _codeCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    _resendTimer?.cancel();
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
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
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

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(
        title: const Text('Create Account'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_step == _Step.email) {
              context.go('/login');
            } else if (_step == _Step.code) {
              setState(() => _step = _Step.email);
            } else {
              setState(() => _step = _Step.code);
            }
          },
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _StepIndicator(step: _step),
              const SizedBox(height: 32),
              switch (_step) {
                _Step.email => _EmailStep(
                    scheme: scheme,
                    emailCtrl: _emailCtrl,
                    busy: _busy,
                    onSubmit: _sendCode,
                  ),
                _Step.code => _CodeStep(
                    scheme: scheme,
                    email: _emailCtrl.text.trim(),
                    codeCtrl: _codeCtrl,
                    busy: _busy,
                    resendIn: _resendIn,
                    onVerify: _verifyCode,
                    onResend: _sendCode,
                  ),
                _Step.password => _PasswordStep(
                    scheme: scheme,
                    passCtrl: _passCtrl,
                    confirmCtrl: _confirmCtrl,
                    busy: _busy,
                    onSubmit: _createAccount,
                  ),
              },
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Already have an account?',
                    style: TextStyle(color: scheme.onSurfaceVariant),
                  ),
                  TextButton(
                    onPressed: () => context.go('/login'),
                    child: const Text(
                      'Sign In',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.step});

  final _Step step;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
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
                    Container(
                      height: 4,
                      decoration: BoxDecoration(
                        color: active ? scheme.primary : scheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      labels[i],
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: active ? FontWeight.w600 : FontWeight.normal,
                        color: active ? scheme.primary : scheme.onSurfaceVariant,
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
    required this.scheme,
    required this.emailCtrl,
    required this.busy,
    required this.onSubmit,
  });

  final ColorScheme scheme;
  final TextEditingController emailCtrl;
  final bool busy;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'What\'s your email?',
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          'We\'ll send a 6-digit code to verify it\'s really you.',
          style: TextStyle(color: scheme.onSurfaceVariant),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: emailCtrl,
          keyboardType: TextInputType.emailAddress,
          autofocus: true,
          decoration: appFieldDecoration(
            scheme,
            label: 'Email',
            icon: Icons.email_outlined,
          ),
        ),
        const SizedBox(height: 24),
        _PrimaryButton(
          label: 'Send Code',
          busy: busy,
          scheme: scheme,
          onPressed: onSubmit,
        ),
      ],
    );
  }
}

class _CodeStep extends StatelessWidget {
  const _CodeStep({
    required this.scheme,
    required this.email,
    required this.codeCtrl,
    required this.busy,
    required this.resendIn,
    required this.onVerify,
    required this.onResend,
  });

  final ColorScheme scheme;
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
        Text(
          'Enter verification code',
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          'We sent a code to $email',
          style: TextStyle(color: scheme.onSurfaceVariant),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: codeCtrl,
          keyboardType: TextInputType.number,
          autofocus: true,
          maxLength: 6,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 24, letterSpacing: 8),
          decoration: appFieldDecoration(
            scheme,
            label: '6-digit code',
            icon: Icons.password_outlined,
          ).copyWith(counterText: ''),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: resendIn > 0 ? null : onResend,
            child: Text(
              resendIn > 0 ? 'Resend code in ${resendIn}s' : 'Resend code',
            ),
          ),
        ),
        const SizedBox(height: 8),
        _PrimaryButton(
          label: 'Verify',
          busy: busy,
          scheme: scheme,
          onPressed: onVerify,
        ),
      ],
    );
  }
}

class _PasswordStep extends StatelessWidget {
  const _PasswordStep({
    required this.scheme,
    required this.passCtrl,
    required this.confirmCtrl,
    required this.busy,
    required this.onSubmit,
  });

  final ColorScheme scheme;
  final TextEditingController passCtrl;
  final TextEditingController confirmCtrl;
  final bool busy;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Set a password',
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          'Email verified. Choose a password to finish creating your account.',
          style: TextStyle(color: scheme.onSurfaceVariant),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: passCtrl,
          obscureText: true,
          decoration: appFieldDecoration(
            scheme,
            label: 'Password',
            icon: Icons.lock_outline,
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: confirmCtrl,
          obscureText: true,
          decoration: appFieldDecoration(
            scheme,
            label: 'Confirm password',
            icon: Icons.lock_outline,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'New accounts are created as Resident. Driver accounts are created by admin.',
          style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
        ),
        const SizedBox(height: 16),
        _PrimaryButton(
          label: 'Create Account',
          busy: busy,
          scheme: scheme,
          onPressed: onSubmit,
        ),
      ],
    );
  }
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton({
    required this.label,
    required this.busy,
    required this.scheme,
    required this.onPressed,
  });

  final String label;
  final bool busy;
  final ColorScheme scheme;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 54,
      child: ElevatedButton(
        onPressed: busy ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 2,
        ),
        child: busy
            ? SizedBox(
                height: 22,
                width: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.4,
                  color: scheme.onPrimary,
                ),
              )
            : Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
