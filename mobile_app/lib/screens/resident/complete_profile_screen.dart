import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/colombo_wards.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/gradient_background.dart';
import '../../widgets/gradient_button.dart';
import '../../widgets/confirm_logout_dialog.dart';
import '../../widgets/styled_text_field.dart';

final _phoneRegex = RegExp(r'^\+?[0-9]{7,15}$');

class CompleteProfileScreen extends StatefulWidget {
  const CompleteProfileScreen({super.key});

  @override
  State<CompleteProfileScreen> createState() => _CompleteProfileScreenState();
}

class _CompleteProfileScreenState extends State<CompleteProfileScreen> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  String? _selectedWard;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    // Residents who finished this gate before ward was part of it land here
    // again with name/phone already saved — prefill so they only add a ward.
    final user = context.read<AuthProvider>().user;
    _nameCtrl.text = user?.name ?? '';
    _phoneCtrl.text = user?.phone ?? '';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    if (name.isEmpty) {
      _showError('Please enter your name.');
      return;
    }
    if (!_phoneRegex.hasMatch(phone)) {
      _showError('Please enter a valid phone number.');
      return;
    }
    if (_selectedWard == null) {
      _showError('Please select your ward from the list.');
      return;
    }
    setState(() => _busy = true);
    final auth = context.read<AuthProvider>();
    final ok = await auth.completeProfile(name, phone, ward: _selectedWard);
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      context.go('/resident');
    } else {
      _showError(auth.error ?? 'Could not save your profile. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.person_pin_circle, color: Colors.white, size: 56),
                const SizedBox(height: 12),
                const Text(
                  'Complete Your Profile',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'A couple more details before you start requesting pickups.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70),
                ),
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      StyledTextField(
                        controller: _nameCtrl,
                        label: 'Full name',
                        icon: Icons.person_outline,
                        autofocus: _nameCtrl.text.isEmpty,
                      ),
                      const SizedBox(height: 16),
                      StyledTextField(
                        controller: _phoneCtrl,
                        label: 'Phone number',
                        icon: Icons.phone_outlined,
                        keyboardType: TextInputType.phone,
                      ),
                      const SizedBox(height: 16),
                      // Required here (not just on the Profile screen) —
                      // collection announcements are targeted by ward, so a
                      // resident without one would never see or be pushed any.
                      Autocomplete<String>(
                        optionsBuilder: (textValue) {
                          if (textValue.text.isEmpty) return colomboWards;
                          final query = textValue.text.toLowerCase();
                          return colomboWards
                              .where((w) => w.toLowerCase().contains(query));
                        },
                        onSelected: (selection) =>
                            setState(() => _selectedWard = selection),
                        fieldViewBuilder: (context, controller, focusNode, onSubmit) {
                          return StyledTextField(
                            controller: controller,
                            focusNode: focusNode,
                            label: 'Ward (Colombo MC)',
                            icon: Icons.location_city_outlined,
                            onChanged: (_) => _selectedWard = null,
                          );
                        },
                        optionsViewBuilder: (context, onSelected, options) {
                          return Align(
                            alignment: Alignment.topLeft,
                            child: Material(
                              elevation: 4,
                              borderRadius: BorderRadius.circular(12),
                              child: ConstrainedBox(
                                constraints:
                                    const BoxConstraints(maxHeight: 240, maxWidth: 400),
                                child: ListView.builder(
                                  padding: EdgeInsets.zero,
                                  shrinkWrap: true,
                                  itemCount: options.length,
                                  itemBuilder: (context, i) {
                                    final option = options.elementAt(i);
                                    return ListTile(
                                      dense: true,
                                      title: Text(option),
                                      onTap: () => onSelected(option),
                                    );
                                  },
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 20),
                      GradientButton(
                        label: 'Continue',
                        busy: _busy,
                        onPressed: _submit,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: TextButton(
                    onPressed: _busy
                        ? null
                        : () async {
                            final confirmed = await confirmLogout(context);
                            if (!confirmed || !context.mounted) return;
                            await context.read<AuthProvider>().signOut();
                            if (context.mounted) context.go('/login');
                          },
                    child: const Text(
                      'Not you? Sign out',
                      style: TextStyle(color: Colors.white70),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
