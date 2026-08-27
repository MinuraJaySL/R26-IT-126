import 'package:flutter/material.dart';

/// Shows a Yes/Cancel confirmation before signing out. Returns true only if
/// the user confirmed — callers should do nothing (not even navigate) on a
/// false/null result, since that means Cancel or the dialog was dismissed.
Future<bool> confirmLogout(BuildContext context) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Log Out?'),
      content: const Text('Are you sure you want to log out?'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(dialogContext, false),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(dialogContext, true),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
          ),
          child: const Text('Log Out'),
        ),
      ],
    ),
  );
  return confirmed ?? false;
}
