import 'package:flutter/material.dart';

import '../../services/admin_service.dart';

class UserManagementScreen extends StatefulWidget {
  const UserManagementScreen({super.key});

  @override
  State<UserManagementScreen> createState() => _UserManagementScreenState();
}

class _UserManagementScreenState extends State<UserManagementScreen> {
  final _adminService = AdminService();
  late Future<List<AdminUserSummary>> _usersFuture;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _usersFuture = _adminService.fetchAllUsers();
  }

  void _refresh() {
    setState(() => _usersFuture = _adminService.fetchAllUsers());
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(title: const Text('User Management')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterChip(
                    label: 'All',
                    selected: _filter == 'all',
                    onSelected: () => setState(() => _filter = 'all'),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Residents',
                    selected: _filter == 'resident',
                    onSelected: () => setState(() => _filter = 'resident'),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Drivers',
                    selected: _filter == 'driver',
                    onSelected: () => setState(() => _filter = 'driver'),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Admins',
                    selected: _filter == 'admin',
                    onSelected: () => setState(() => _filter = 'admin'),
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: FutureBuilder<List<AdminUserSummary>>(
              future: _usersFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text('Failed to load users: ${snapshot.error}'));
                }
                final users = (snapshot.data ?? [])
                    .where((u) => _filter == 'all' || u.role == _filter)
                    .toList()
                  ..sort((a, b) => a.email.compareTo(b.email));

                if (users.isEmpty) {
                  return const Center(child: Text('No users found.'));
                }

                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: users.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) => _UserTile(
                    user: users[i],
                    scheme: scheme,
                    onEdited: _refresh,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onSelected(),
    );
  }
}

class _UserTile extends StatelessWidget {
  const _UserTile({required this.user, required this.scheme, required this.onEdited});

  final AdminUserSummary user;
  final ColorScheme scheme;
  final VoidCallback onEdited;

  Color _roleColor() {
    switch (user.role) {
      case 'admin':
        return Colors.deepPurple;
      case 'driver':
        return Colors.indigo;
      default:
        return Colors.green;
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayName = user.name.isNotEmpty ? user.name : user.email;
    final isDriver = user.role == 'driver';

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: isDriver
          ? () => showDialog(
                context: context,
                builder: (_) => _EditDriverDialog(user: user, onSaved: onEdited),
              )
          : null,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: _roleColor().withValues(alpha: 0.15),
              child: Text(
                displayName.isNotEmpty ? displayName[0].toUpperCase() : '?',
                style: TextStyle(color: _roleColor(), fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(displayName, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(
                    user.email,
                    style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 13),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: _roleColor().withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                user.role,
                style: TextStyle(
                  color: _roleColor(),
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
            ),
            if (isDriver) ...[
              const SizedBox(width: 8),
              Icon(Icons.edit_outlined, size: 18, color: scheme.onSurfaceVariant),
            ],
          ],
        ),
      ),
    );
  }
}

class _EditDriverDialog extends StatefulWidget {
  const _EditDriverDialog({required this.user, required this.onSaved});

  final AdminUserSummary user;
  final VoidCallback onSaved;

  @override
  State<_EditDriverDialog> createState() => _EditDriverDialogState();
}

class _EditDriverDialogState extends State<_EditDriverDialog> {
  late final _nameCtrl = TextEditingController(text: widget.user.name);
  late final _phoneCtrl = TextEditingController(text: widget.user.phone);
  late final _vehicleCtrl = TextEditingController(text: widget.user.vehicleNumber);
  bool _busy = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _vehicleCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty ||
        _phoneCtrl.text.trim().isEmpty ||
        _vehicleCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('All fields are required.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      await AdminService().updateDriverDetails(
        uid: widget.user.uid,
        name: _nameCtrl.text.trim(),
        phone: _phoneCtrl.text.trim(),
        vehicleNumber: _vehicleCtrl.text.trim(),
      );
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Driver details updated'), backgroundColor: Colors.green),
        );
        widget.onSaved();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Edit ${widget.user.email}'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _nameCtrl,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Phone number'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _vehicleCtrl,
            decoration: const InputDecoration(labelText: 'Vehicle number'),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _busy ? null : _save,
          child: _busy
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Save'),
        ),
      ],
    );
  }
}
