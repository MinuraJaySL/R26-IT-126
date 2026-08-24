import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/bin_report.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';

const _quickReasons = ['Collected', 'Already Clear', 'False Alarm'];

class DriverBinReportsScreen extends StatelessWidget {
  const DriverBinReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Critical Reports'),
          backgroundColor: Colors.red,
          foregroundColor: Colors.white,
          bottom: const TabBar(
            indicatorColor: Colors.white,
            tabs: [
              Tab(text: 'Open'),
              Tab(text: 'Resolved'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _OpenReportsTab(),
            _ResolvedReportsTab(),
          ],
        ),
      ),
    );
  }
}

class _OpenReportsTab extends StatelessWidget {
  const _OpenReportsTab();

  Future<void> _resolve(BuildContext context, BinReport report) async {
    final controller = TextEditingController();
    final driverId = context.read<AuthProvider>().user!.uid;

    final note = await showDialog<String>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setState) => AlertDialog(
          title: const Text('Resolve This Report'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Resident\'s note:', style: Theme.of(context).textTheme.labelMedium),
              const SizedBox(height: 4),
              Text('"${report.note}"', style: const TextStyle(fontStyle: FontStyle.italic)),
              const SizedBox(height: 16),
              const Text('Quick reasons:'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _quickReasons
                    .map((r) => ActionChip(
                          label: Text(r),
                          onPressed: () => setState(() {
                            controller.text = r;
                          }),
                        ))
                    .toList(),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Your note',
                  hintText: 'Tap a reason above, or type your own',
                  border: OutlineInputBorder(),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: controller.text.trim().isEmpty
                  ? null
                  : () => Navigator.pop(dialogContext, controller.text.trim()),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
              ),
              child: const Text('Resolve'),
            ),
          ],
        ),
      ),
    );

    if (note == null || !context.mounted) return;
    try {
      await FirestoreService().resolveBinReport(report.id, driverId, note);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Report resolved'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final fs = FirestoreService();
    return StreamBuilder<List<BinReport>>(
      stream: fs.watchOpenBinReports(),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snap.hasError) {
          return Center(
            child: Text('Error: ${snap.error}', style: const TextStyle(color: Colors.red)),
          );
        }
        final reports = snap.data ?? [];
        if (reports.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_circle_outline, size: 64, color: Colors.green),
                SizedBox(height: 12),
                Text('No open reports!',
                    style: TextStyle(color: Colors.green, fontSize: 16, fontWeight: FontWeight.w500)),
              ],
            ),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: reports.length,
          separatorBuilder: (ctx, _) => const SizedBox(height: 8),
          itemBuilder: (context, i) {
            final r = reports[i];
            return Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: BorderSide(color: Colors.red.withValues(alpha: 0.4)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.red.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.report_problem, color: Colors.red, size: 14),
                              SizedBox(width: 4),
                              Text('OPEN',
                                  style: TextStyle(
                                      color: Colors.red, fontWeight: FontWeight.bold, fontSize: 12)),
                            ],
                          ),
                        ),
                        const Spacer(),
                        Text(_formatTime(r.createdAt),
                            style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(r.note, style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.location_on, size: 16, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text('${r.lat.toStringAsFixed(5)}, ${r.lng.toStringAsFixed(5)}',
                            style: const TextStyle(fontSize: 13)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.check_circle_outline),
                        label: const Text('Resolve'),
                        onPressed: () => _resolve(context, r),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  String _formatTime(DateTime dt) {
    return '${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

class _ResolvedReportsTab extends StatelessWidget {
  const _ResolvedReportsTab();

  @override
  Widget build(BuildContext context) {
    final fs = FirestoreService();
    return StreamBuilder<List<BinReport>>(
      stream: fs.watchResolvedBinReports(),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snap.hasError) {
          return Center(
            child: Text('Error: ${snap.error}', style: const TextStyle(color: Colors.red)),
          );
        }
        final reports = snap.data ?? [];
        if (reports.isEmpty) {
          return const Center(
            child: Text('No resolved reports yet.', style: TextStyle(color: Colors.grey)),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: reports.length,
          separatorBuilder: (ctx, _) => const SizedBox(height: 8),
          itemBuilder: (context, i) {
            final r = reports[i];
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.green.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.check_circle, color: Colors.green, size: 14),
                              SizedBox(width: 4),
                              Text('RESOLVED',
                                  style: TextStyle(
                                      color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12)),
                            ],
                          ),
                        ),
                        const Spacer(),
                        if (r.resolvedAt != null)
                          Text(_formatTime(r.resolvedAt!),
                              style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text('Reported: ${r.note}', style: const TextStyle(fontSize: 14)),
                    if (r.resolutionNote != null) ...[
                      const SizedBox(height: 6),
                      Text('Resolved: ${r.resolutionNote}',
                          style: const TextStyle(
                              fontSize: 13, color: Colors.green, fontWeight: FontWeight.w500)),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  String _formatTime(DateTime dt) {
    return '${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
