import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../models/bin_report.dart';
import '../../models/pickup_request.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';

class DriverDashboard extends StatefulWidget {
  const DriverDashboard({super.key});

  @override
  State<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends State<DriverDashboard> {
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
            icon: const Icon(Icons.person_outline),
            tooltip: 'Profile',
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: SingleChildScrollView(
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
              icon: Icons.campaign_outlined,
              title: 'Announce Collection',
              subtitle: 'Tell a ward when your truck is coming tomorrow',
              color: Colors.teal,
              onTap: () => context.push('/driver/announce'),
            ),
            const SizedBox(height: 16),
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
            StreamBuilder<List<PickupRequest>>(
              stream: FirestoreService().watchMissedRequests(),
              builder: (context, snap) {
                final missedCount = snap.data?.length ?? 0;
                return _DashCard(
                  icon: Icons.warning_amber_rounded,
                  title: 'Missed Requests',
                  subtitle: 'View pickups residents marked as missed',
                  color: Colors.orange,
                  badgeCount: missedCount,
                  onTap: () => context.push('/driver/missed'),
                );
              },
            ),
            const SizedBox(height: 16),
            StreamBuilder<List<BinReport>>(
              stream: FirestoreService().watchOpenBinReports(),
              builder: (context, snap) {
                final openCount = snap.data?.length ?? 0;
                return _DashCard(
                  icon: Icons.report_problem_outlined,
                  title: 'Critical Reports',
                  subtitle: 'Resident-reported bin problems',
                  color: Colors.red,
                  badgeCount: openCount,
                  onTap: () => context.push('/driver/reports'),
                );
              },
            ),
          ],
        ),
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
  final int badgeCount;

  const _DashCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
    this.badgeCount = 0,
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
        trailing: badgeCount > 0
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '$badgeCount',
                      style: const TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(Icons.chevron_right),
                ],
              )
            : const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
