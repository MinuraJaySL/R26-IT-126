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
                  itemBuilder: (context, i) => _UserTile(user: users[i], scheme: scheme),
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
  const _UserTile({required this.user, required this.scheme});

  final AdminUserSummary user;
  final ColorScheme scheme;

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
    return Container(
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
        ],
      ),
    );
  }
}
