import 'package:flutter/material.dart';

enum SnackKind { info, success, error }

/// The app's one snackbar look: an icon plus the message, tinted by [kind].
/// For small confirmations and form checks only — a failed action goes
/// through [showErrorDialog] instead, since a snackbar is gone in a few
/// seconds and is easy to miss. (The floating, rounded shape comes from the
/// snackBarTheme in main.dart.)
SnackBar appSnackBar(
  String message, {
  SnackKind kind = SnackKind.info,
  Duration duration = const Duration(seconds: 4),
}) {
  final (IconData icon, Color? color) = switch (kind) {
    SnackKind.success => (Icons.check_circle_outline, Colors.green.shade700),
    SnackKind.error => (Icons.error_outline, Colors.red.shade700),
    SnackKind.info => (Icons.info_outline, null),
  };
  return SnackBar(
    backgroundColor: color,
    duration: duration,
    content: Row(
      children: [
        Icon(icon, color: Colors.white, size: 20),
        const SizedBox(width: 12),
        Expanded(child: Text(message)),
      ],
    ),
  );
}

/// Pop-up for a failed action — stays until the user taps OK.
Future<void> showErrorDialog(
  BuildContext context,
  String message, {
  String title = 'Something Went Wrong',
}) {
  return _showMessageDialog(
    context,
    title: title,
    message: message,
    icon: const Icon(Icons.error_outline, color: Colors.red, size: 44),
  );
}

/// Pop-up for an outcome the user must not miss — stays until they tap OK.
Future<void> showSuccessDialog(
  BuildContext context,
  String message, {
  required String title,
}) {
  return _showMessageDialog(
    context,
    title: title,
    message: message,
    icon: const Icon(Icons.check_circle_outline, color: Colors.green, size: 44),
  );
}

Future<void> _showMessageDialog(
  BuildContext context, {
  required String title,
  required String message,
  required Widget icon,
}) {
  return showDialog<void>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      icon: icon,
      title: Text(title),
      content: Text(message, textAlign: TextAlign.center),
      actions: [
        ElevatedButton(
          onPressed: () => Navigator.pop(dialogContext),
          child: const Text('OK'),
        ),
      ],
    ),
  );
}
