import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../services/admin_service.dart';
import '../../widgets/confirm_logout_dialog.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final _adminService = AdminService();
  late Future<Map<String, int>> _countsFuture;

  @override
  void initState() {
    super.initState();
    _countsFuture = _adminService.fetchRoleCounts();
  }

  void _refresh() {
    setState(() => _countsFuture = _adminService.fetchRoleCounts());
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Log out',
            onPressed: () async {
              final confirmed = await confirmLogout(context);
              if (!confirmed || !context.mounted) return;
              await context.read<AuthProvider>().signOut();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              FutureBuilder<Map<String, int>>(
                future: _countsFuture,
                builder: (context, snapshot) {
                  final counts = snapshot.data;
                  return Row(
                    children: [
                      Expanded(
                        child: _StatCard(
                          scheme: scheme,
                          icon: Icons.people_outline,
                          label: 'Residents',
                          value: counts?['resident']?.toString() ?? '—',
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _StatCard(
                          scheme: scheme,
                          icon: Icons.local_shipping_outlined,
                          label: 'Drivers',
                          value: counts?['driver']?.toString() ?? '—',
                        ),
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 24),
              _ActionTile(
                scheme: scheme,
                icon: Icons.manage_accounts_outlined,
                title: 'User Management',
                subtitle: 'View and filter all registered users',
                onTap: () => context.push('/admin/users'),
              ),
              const SizedBox(height: 12),
              _ActionTile(
                scheme: scheme,
                icon: Icons.person_add_alt_1_outlined,
                title: 'Add Driver',
                subtitle: 'Create a new driver account',
                onTap: () async {
                  await context.push('/admin/add-driver');
                  _refresh();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.scheme,
    required this.icon,
    required this.label,
    required this.value,
  });

  final ColorScheme scheme;
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: scheme.primary, size: 28),
          const SizedBox(height: 12),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: scheme.onSurfaceVariant)),
        ],
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.scheme,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final ColorScheme scheme;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: scheme.primary.withValues(alpha: 0.15),
                child: Icon(icon, color: scheme.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}
