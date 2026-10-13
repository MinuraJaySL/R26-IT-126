import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/pickup_request.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';
import '../../utils/friendly_error.dart';
import '../../widgets/app_feedback.dart';

const _quickReasons = [
  'No waste at the location',
  'Could not find the location',
  'Resident was not available',
];

const _maxReasonLength = 200;

/// Lets a driver end a missed request for good instead of rescheduling it —
/// for when another visit would be pointless (they went, and there was
/// nothing to collect). The reason is required: it is what the resident is
/// shown and notified with. Same quick-pick-or-type flow as resolving a bin
/// report. Returns true only if the request was actually closed.
Future<bool> showCloseRequestDialog(BuildContext context, PickupRequest request) async {
  final controller = TextEditingController();
  final driverId = context.read<AuthProvider>().user!.uid;

  final reason = await showDialog<String>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (dialogContext, setState) => AlertDialog(
        title: const Text('Close This Request'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'The request will be closed without another visit, and the '
                'resident will be told why. They can place a new request '
                'when their waste is ready.',
              ),
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
                maxLength: _maxReasonLength,
                decoration: const InputDecoration(
                  labelText: 'Reason',
                  hintText: 'Tap a reason above, or type your own',
                  border: OutlineInputBorder(),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ],
          ),
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
            child: const Text('Close Request'),
          ),
        ],
      ),
    ),
  );

  if (reason == null || !context.mounted) return false;
  try {
    await FirestoreService().closeMissedRequest(request.id, driverId, reason);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        appSnackBar(
          'Request closed — the resident has been told why.',
          kind: SnackKind.success,
        ),
      );
    }
    return true;
  } catch (e) {
    if (context.mounted) {
      showErrorDialog(
        context,
        friendlyError(e, fallback: 'Could not close the request. Please try again.'),
      );
    }
    return false;
  }
}
