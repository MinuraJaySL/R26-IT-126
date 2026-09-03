import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/colombo_wards.dart';
import '../../models/app_user.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_input_decoration.dart';
import '../../widgets/confirm_logout_dialog.dart';

final _phoneRegex = RegExp(r'^\+?[0-9]{7,15}$');

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  late String? _selectedWard;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _nameCtrl = TextEditingController(text: user?.name ?? '');
    _phoneCtrl = TextEditingController(text: user?.phone ?? '');
    _selectedWard = (user?.ward.isNotEmpty ?? false) ? user!.ward : null;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedWard == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select your ward')),
      );
      return;
    }
    setState(() => _busy = true);
    final auth = context.read<AuthProvider>();
    final ok = await auth.completeProfile(
      _nameCtrl.text.trim(),
      _phoneCtrl.text.trim(),
      ward: _selectedWard,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(ok ? 'Profile updated' : (auth.error ?? 'Could not save changes')),
      ),
    );
  }

  Future<void> _signOut() async {
    final confirmed = await confirmLogout(context);
    if (!confirmed || !mounted) return;
    await context.read<AuthProvider>().signOut();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final user = context.watch<AuthProvider>().user;

    if (user == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final displayName = user.name.isNotEmpty ? user.name : user.email;
    final isDriver = user.role == UserRole.driver;

    return Scaffold(
      appBar: AppBar(title: const Text('My Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: scheme.primary,
                    child: Text(
                      displayName.isNotEmpty ? displayName[0].toUpperCase() : '?',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: scheme.onPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    displayName,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: scheme.secondaryContainer,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      user.role.name.toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: scheme.onSecondaryContainer,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            _ReadOnlyRow(icon: Icons.email_outlined, label: 'Email', value: user.email),
            const SizedBox(height: 24),
            if (isDriver) ...[
              _ReadOnlyRow(
                icon: Icons.person_outline,
                label: 'Name',
                value: user.name.isEmpty ? '—' : user.name,
              ),
              const SizedBox(height: 16),
              _ReadOnlyRow(
                icon: Icons.phone_outlined,
                label: 'Phone number',
                value: user.phone.isEmpty ? '—' : user.phone,
              ),
              const SizedBox(height: 16),
              _ReadOnlyRow(
                icon: Icons.local_shipping_outlined,
                label: 'Vehicle number',
                value: user.vehicleNumber.isEmpty ? '—' : user.vehicleNumber,
              ),
              const SizedBox(height: 12),
              Text(
                'These details are managed by your admin. Contact them to make changes.',
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12.5),
              ),
            ] else ...[
              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _nameCtrl,
                      decoration: appFieldDecoration(
                        scheme,
                        label: 'Full name',
                        icon: Icons.person_outline,
                      ),
                      validator: (v) => (v == null || v.trim().isEmpty)
                          ? 'Name is required'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _phoneCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: appFieldDecoration(
                        scheme,
                        label: 'Phone number',
                        icon: Icons.phone_outlined,
                      ),
                      validator: (v) {
                        final value = v?.trim() ?? '';
                        if (value.isEmpty) return 'Phone number is required';
                        if (!_phoneRegex.hasMatch(value)) return 'Enter a valid phone number';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    Autocomplete<String>(
                      initialValue: TextEditingValue(text: _selectedWard ?? ''),
                      optionsBuilder: (textValue) {
                        if (textValue.text.isEmpty) return colomboWards;
                        final query = textValue.text.toLowerCase();
                        return colomboWards
                            .where((w) => w.toLowerCase().contains(query));
                      },
                      onSelected: (selection) =>
                          setState(() => _selectedWard = selection),
                      fieldViewBuilder: (context, controller, focusNode, onSubmit) {
                        return TextFormField(
                          controller: controller,
                          focusNode: focusNode,
                          decoration: appFieldDecoration(
                            scheme,
                            label: 'Ward (Colombo MC)',
                            icon: Icons.location_city_outlined,
                          ),
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
                              constraints: const BoxConstraints(maxHeight: 240, maxWidth: 400),
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
                    SizedBox(
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _busy ? null : _save,
                        child: _busy
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.4,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Save Changes'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 40),
            const Divider(),
            const SizedBox(height: 12),
            SizedBox(
              height: 50,
              child: OutlinedButton.icon(
                onPressed: _signOut,
                icon: Icon(Icons.logout, color: scheme.error),
                label: Text('Log Out', style: TextStyle(color: scheme.error)),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: scheme.error),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReadOnlyRow extends StatelessWidget {
  const _ReadOnlyRow({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        Icon(icon, color: scheme.onSurfaceVariant, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ],
    );
  }
}
