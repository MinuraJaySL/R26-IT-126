import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../models/pickup_request.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';

class ResidentDashboard extends StatefulWidget {
  const ResidentDashboard({super.key});

  @override
  State<ResidentDashboard> createState() => _ResidentDashboardState();
}

class _ResidentDashboardState extends State<ResidentDashboard> {
  final _fs = FirestoreService();
  StreamSubscription<List<PickupRequest>>? _sub;

  // Track which requests were previously active so we can detect collections.
  // This listener lives on the dashboard (not the pickups list screen) so it
  // keeps firing arrival/collection alerts no matter which resident screen
  // is currently open.
  final Set<String> _knownActiveIds = {};
  bool _initialLoad = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _startListening();
  }

  void _startListening() {
    _sub?.cancel();
    final auth = context.read<AuthProvider>();
    if (auth.user == null) return;

    _sub = _fs.watchMyRequests(auth.user!.uid).listen((requests) {
      if (!mounted) return;

      if (_initialLoad) {
        // Seed the known-active set without showing alerts on first load
        for (final r in requests) {
          if (r.status == RequestStatus.active) {
            _knownActiveIds.add(r.id);
          }
        }
        _initialLoad = false;
        return;
      }

      // Detect newly-arrived or collected requests
      for (final r in requests) {
        if ((r.status == RequestStatus.arrived ||
                r.status == RequestStatus.collected) &&
            _knownActiveIds.contains(r.id)) {
          _knownActiveIds.remove(r.id);
          _showCollectedAlert(r);
        }
        if (r.status == RequestStatus.active) {
          _knownActiveIds.add(r.id);
        }
      }
    });
  }

  void _showCollectedAlert(PickupRequest r) {
    if (!mounted) return;

    final isArrived = r.status == RequestStatus.arrived;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        icon: Icon(
          isArrived ? Icons.local_shipping : Icons.check_circle,
          color: isArrived ? Colors.indigo : Colors.green,
          size: 52,
        ),
        title: Text(isArrived
            ? '🚛 Truck is Here!'
            : 'Waste Collected!'),
        content: Text(
          isArrived
              ? 'The garbage truck has arrived at your pickup point!\n\n'
                  'Please bring your waste out now.'
              : 'Your waste has been successfully collected.\n\n'
                  'Thank you for using Smart Waste!',
          textAlign: TextAlign.center,
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: isArrived ? Colors.indigo : Colors.green,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
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
        title: const Text('Resident Dashboard'),
        backgroundColor: Colors.green,
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
            const SizedBox(height: 8),
            const Icon(Icons.eco, size: 64, color: Colors.green),
            const SizedBox(height: 12),
            Text(
              'Welcome',
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
            const SizedBox(height: 40),
            _DashCard(
              icon: Icons.inbox_outlined,
              title: 'My Pickups',
              subtitle: 'View & manage your pickup requests',
              color: Colors.green,
              onTap: () => context.push('/resident/pickups'),
            ),
            const SizedBox(height: 16),
            _DashCard(
              icon: Icons.local_shipping_outlined,
              title: 'Track Trucks Nearby',
              subtitle: 'See live collection trucks on the map',
              color: Colors.indigo,
              onTap: () => context.push('/resident/track'),
            ),
            const SizedBox(height: 16),
            _DashCard(
              icon: Icons.report_problem_outlined,
              title: 'My Reports',
              subtitle: 'Report a bin problem & see how it was resolved',
              color: Colors.red,
              onTap: () => context.push('/resident/reports'),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_location_alt),
        label: const Text('Request Pickup'),
        onPressed: () => context.push('/resident/flag'),
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

  const _DashCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
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
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
