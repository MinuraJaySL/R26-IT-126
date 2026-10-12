import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_feedback.dart';
import '../../widgets/app_input_decoration.dart';
import '../../widgets/confirm_logout_dialog.dart';

/// Reached two ways: from the Profile screen by choice, or through the
/// router's gate when a driver first signs in with the temporary password
/// their admin emailed them — in which case there's no way out of this
/// screen except setting a new password or logging out.
class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  // Same minimum the sign-up screen enforces.
  static const _minLength = 6;

  final _formKey = GlobalKey<FormState>();
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  // Read once: a successful change clears the flag, and the screen must not
  // flip to its by-choice layout in the moment before it navigates away.
  late final bool _forced;
  bool _obscure = true;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _forced = context.read<AuthProvider>().user?.mustChangePassword ?? false;
  }

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    final auth = context.read<AuthProvider>();
    final ok = await auth.changePassword(_currentCtrl.text, _newCtrl.text);
    if (!mounted) return;
    setState(() => _busy = false);
    if (!ok) {
      showErrorDialog(
        context,
        auth.error ?? 'Could not change your password. Please try again.',
        title: 'Password Not Changed',
      );
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      appSnackBar('Password changed', kind: SnackKind.success),
    );
    if (_forced) {
      // The router sends a signed-in user who lands on /login on to their
      // own role's dashboard.
      context.go('/login');
    } else {
      context.pop();
    }
  }

  Future<void> _signOut() async {
    final confirmed = await confirmLogout(context);
    if (!confirmed || !mounted) return;
    await context.read<AuthProvider>().signOut();
    if (mounted) context.go('/login');
  }

  InputDecoration _decoration(ColorScheme scheme, String label) {
    return appFieldDecoration(
      scheme,
      label: label,
      icon: Icons.lock_outline,
      suffixIcon: IconButton(
        icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
        tooltip: _obscure ? 'Show passwords' : 'Hide passwords',
        onPressed: () => setState(() => _obscure = !_obscure),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final currentLabel = _forced ? 'Temporary password' : 'Current password';

    return Scaffold(
      appBar: AppBar(
        title: Text(_forced ? 'Set Your Password' : 'Change Password'),
        automaticallyImplyLeading: !_forced,
        actions: [
          if (_forced)
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Log Out',
              onPressed: _busy ? null : _signOut,
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                _forced
                    ? 'You signed in with the temporary password from your '
                        'admin\'s email. Choose your own password to continue.'
                    : 'Enter your current password, then choose a new one.',
                style: TextStyle(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _currentCtrl,
                obscureText: _obscure,
                decoration: _decoration(scheme, currentLabel),
                validator: (v) =>
                    (v == null || v.isEmpty) ? '$currentLabel is required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _newCtrl,
                obscureText: _obscure,
                decoration: _decoration(scheme, 'New password'),
                validator: (v) {
                  final value = v ?? '';
                  if (value.length < _minLength) {
                    return 'Use at least $_minLength characters';
                  }
                  if (value == _currentCtrl.text) {
                    return 'Choose a password different from the ${currentLabel.toLowerCase()}';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _confirmCtrl,
                obscureText: _obscure,
                decoration: _decoration(scheme, 'Confirm new password'),
                validator: (v) =>
                    v == _newCtrl.text ? null : 'Passwords do not match',
              ),
              const SizedBox(height: 28),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: _busy ? null : _submit,
                  child: _busy
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.4,
                            color: Colors.white,
                          ),
                        )
                      : Text(_forced ? 'Set Password' : 'Change Password'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
