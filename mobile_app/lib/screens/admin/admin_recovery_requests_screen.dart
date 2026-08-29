import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/recovery_request.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';

class AdminRecoveryRequestsScreen extends StatelessWidget {
  const AdminRecoveryRequestsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Recovery Requests'),
          backgroundColor: Colors.deepPurple,
          foregroundColor: Colors.white,
          bottom: const TabBar(
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            tabs: [
              Tab(text: 'Open'),
              Tab(text: 'Resolved'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _OpenRequestsTab(),
            _ResolvedRequestsTab(),
          ],
        ),
      ),
    );
  }
}

const _quickReasons = ['Re-enabled', 'Enabled with Warning', 'Request Denied'];

class _OpenRequestsTab extends StatelessWidget {
  const _OpenRequestsTab();

  Future<void> _resolve(BuildContext context, RecoveryRequest req) async {
    final controller = TextEditingController();
    final adminId = context.read<AuthProvider>().user!.uid;
    var reenable = true;

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setState) => AlertDialog(
          title: const Text('Resolve This Request'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${req.email} says:', style: Theme.of(context).textTheme.labelMedium),
              const SizedBox(height: 4),
              Text('"${req.message}"', style: const TextStyle(fontStyle: FontStyle.italic)),
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
                            reenable = r != 'Request Denied';
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
              const SizedBox(height: 8),
              CheckboxListTile(
                value: reenable,
                onChanged: (v) => setState(() => reenable = v ?? false),
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                title: const Text('Re-enable this account'),
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
                  : () => Navigator.pop(dialogContext, {
                        'note': controller.text.trim(),
                        'reenable': reenable,
                      }),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.deepPurple,
                foregroundColor: Colors.white,
              ),
              child: const Text('Resolve'),
            ),
          ],
        ),
      ),
    );

    if (result == null || !context.mounted) return;
    try {
      await FirestoreService().resolveRecoveryRequest(
        requestId: req.id,
        uid: req.uid,
        adminId: adminId,
        resolutionNote: result['note'] as String,
        reenableAccount: result['reenable'] as bool,
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Request resolved'), backgroundColor: Colors.green),
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
    return StreamBuilder<List<RecoveryRequest>>(
      stream: fs.watchOpenRecoveryRequests(),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snap.hasError) {
          return Center(
            child: Text('Error: ${snap.error}', style: const TextStyle(color: Colors.red)),
          );
        }
        final requests = snap.data ?? [];
        if (requests.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_circle_outline, size: 64, color: Colors.green),
                SizedBox(height: 12),
                Text('No open recovery requests!',
                    style: TextStyle(color: Colors.green, fontSize: 16, fontWeight: FontWeight.w500)),
              ],
            ),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: requests.length,
          separatorBuilder: (ctx, _) => const SizedBox(height: 8),
          itemBuilder: (context, i) {
            final r = requests[i];
            return Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: BorderSide(color: Colors.deepPurple.withValues(alpha: 0.4)),
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
                            color: Colors.deepPurple.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.mail_outline, color: Colors.deepPurple, size: 14),
                              SizedBox(width: 4),
                              Text('OPEN',
                                  style: TextStyle(
                                      color: Colors.deepPurple,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12)),
                            ],
                          ),
                        ),
                        const Spacer(),
                        Text(_formatTime(r.createdAt),
                            style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(r.email, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    const SizedBox(height: 4),
                    Text(r.message, style: const TextStyle(fontSize: 13, color: Colors.black87)),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.check_circle_outline),
                        label: const Text('Resolve'),
                        onPressed: () => _resolve(context, r),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.deepPurple,
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

class _ResolvedRequestsTab extends StatelessWidget {
  const _ResolvedRequestsTab();

  @override
  Widget build(BuildContext context) {
    final fs = FirestoreService();
    return StreamBuilder<List<RecoveryRequest>>(
      stream: fs.watchResolvedRecoveryRequests(),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snap.hasError) {
          return Center(
            child: Text('Error: ${snap.error}', style: const TextStyle(color: Colors.red)),
          );
        }
        final requests = snap.data ?? [];
        if (requests.isEmpty) {
          return const Center(
            child: Text('No resolved requests yet.', style: TextStyle(color: Colors.grey)),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: requests.length,
          separatorBuilder: (ctx, _) => const SizedBox(height: 8),
          itemBuilder: (context, i) {
            final r = requests[i];
            final reenabled = r.reenabled ?? false;
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
                            color: (reenabled ? Colors.green : Colors.orange)
                                .withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(reenabled ? Icons.check_circle : Icons.block,
                                  color: reenabled ? Colors.green : Colors.orange, size: 14),
                              const SizedBox(width: 4),
                              Text(
                                reenabled ? 'RE-ENABLED' : 'DENIED',
                                style: TextStyle(
                                    color: reenabled ? Colors.green : Colors.orange,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12),
                              ),
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
                    Text(r.email, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    const SizedBox(height: 4),
                    Text('Requested: ${r.message}', style: const TextStyle(fontSize: 13)),
                    if (r.resolutionNote != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        'Resolution: ${r.resolutionNote}',
                        style: TextStyle(
                          fontSize: 13,
                          color: reenabled ? Colors.green : Colors.orange,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
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
