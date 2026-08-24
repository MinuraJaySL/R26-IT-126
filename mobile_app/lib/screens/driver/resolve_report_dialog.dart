import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/bin_report.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';

const _quickReasons = ['Collected', 'Already Clear', 'False Alarm'];

/// Shared by the Critical Reports list and the report navigation map —
/// same resolve flow (quick-pick chips + free text) from either entry point.
/// Returns true only if the report was actually resolved (not cancelled or
/// failed), so callers with somewhere to go afterward (the nav map) know
/// when it's safe to navigate away.
Future<bool> showResolveReportDialog(BuildContext context, BinReport report) async {
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

  if (note == null || !context.mounted) return false;
  try {
    await FirestoreService().resolveBinReport(report.id, driverId, note);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Report resolved'), backgroundColor: Colors.green),
      );
    }
    return true;
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
    return false;
  }
}
