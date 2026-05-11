import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';

class DriverDashboard extends StatefulWidget {
  const DriverDashboard({super.key});

  @override
  State<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends State<DriverDashboard> {
  final _fs = FirestoreService();
  bool _seeding = false;

  Future<void> _seedBins() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Seed Demo Bins?'),
        content: const Text(
          'This will add 3 demo bins (Red, Yellow, Green) to Firestore.\n\n'
          'Run this only once — tap again to add more if needed.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Seed'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    setState(() => _seeding = true);
    try {
      await _fs.seedDemoBins();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('3 demo bins added to Firestore!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Seed failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _seeding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (auth.loading || auth.user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver Dashboard'),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await auth.signOut();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 24),
            const Icon(Icons.local_shipping, size: 72, color: Colors.indigo),
            const SizedBox(height: 12),
            Text(
              'Welcome, Driver',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              auth.user?.email ?? '',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 48),
            _DashCard(
              icon: Icons.map,
              title: 'Bin Priority Map',
              subtitle: 'View Red/Yellow/Green bins + suggested route',
              color: Colors.indigo,
              onTap: () => context.push('/driver/map'),
            ),
            const SizedBox(height: 16),
            _DashCard(
              icon: Icons.flag,
              title: 'Pickup Requests',
              subtitle: 'View & collect active resident requests',
              color: Colors.green,
              onTap: () => context.push('/driver/requests'),
            ),
            const SizedBox(height: 16),
            const SizedBox(height: 16),
            _DashCard(
              icon: Icons.warning_amber_rounded,
              title: 'Missed Requests',
              subtitle: 'View pickups residents marked as missed',
              color: Colors.orange,
              onTap: () => context.push('/driver/missed'),
            ),
            const SizedBox(height: 16),
            _DashCard(
              icon: _seeding ? Icons.hourglass_top : Icons.science_outlined,
              title: 'Seed Demo Bins',
              subtitle: 'Add 3 test bins (Red/Yellow/Green) to Firestore',
              color: Colors.teal,
              onTap: _seeding ? () {} : _seedBins,
              trailing: _seeding
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : null,
            ),
            const SizedBox(height: 16),
            _DashCard(
              icon: Icons.info_outline,
              title: 'About',
              subtitle: 'R26-IT-126 Smart Waste — Driver Module',
              color: Colors.grey,
              onTap: () => _showAbout(context),
            ),
          ],
        ),
      ),
    );
  }

  void _showAbout(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('About'),
        content: const Text(
          'Smart Waste Management System\n'
          'Driver Module — R26-IT-126\n\n'
          'View bin priorities, methane status, and get a suggested collection route.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

class _DashCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;
  final Widget? trailing;

  const _DashCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.15),
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle),
        trailing: trailing ?? const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
