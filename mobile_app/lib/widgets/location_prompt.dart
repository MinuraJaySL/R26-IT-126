import 'dart:async';
import 'package:flutter/material.dart';
import '../services/location_service.dart';

/// Makes sure the phone's location can be read before a screen relies on it:
/// asks for the permission if it hasn't been given yet and, when location is
/// switched off or the permission is refused, shows a pop-up that takes the
/// user to the right setting instead of failing silently. The pop-up closes
/// by itself once location becomes usable.
///
/// [purpose] is the sentence explaining why this screen needs the location.
/// Returns true when location is ready, false if the user chose not to.
Future<bool> ensureLocationAccess(
  BuildContext context, {
  required String purpose,
}) async {
  final access = await LocationService().checkAccess();
  if (access == LocationAccess.ready) return true;
  if (!context.mounted) return false;

  final ready = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (_) => _LocationPromptDialog(initial: access, purpose: purpose),
  );
  return ready ?? false;
}

class _LocationPromptDialog extends StatefulWidget {
  final LocationAccess initial;
  final String purpose;

  const _LocationPromptDialog({required this.initial, required this.purpose});

  @override
  State<_LocationPromptDialog> createState() => _LocationPromptDialogState();
}

class _LocationPromptDialogState extends State<_LocationPromptDialog>
    with WidgetsBindingObserver {
  final _locationService = LocationService();
  StreamSubscription<bool>? _serviceSub;
  late LocationAccess _access = widget.initial;
  bool _closed = false;

  @override
  void initState() {
    super.initState();
    // Coming back from the settings page resumes the app; switching location
    // on from the quick-settings panel doesn't, so the switch itself is
    // watched too.
    WidgetsBinding.instance.addObserver(this);
    _serviceSub = _locationService.serviceEnabledStream().listen(
          (_) => _recheck(),
          onError: (_) {},
        );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _serviceSub?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _recheck();
  }

  // Never asks for the permission itself — this also runs when the system's
  // own permission pop-up closes, and asking again from there would loop.
  Future<void> _recheck({bool request = false}) async {
    final access = await _locationService.checkAccess(request: request);
    if (!mounted || _closed) return;
    if (access == LocationAccess.ready) {
      _closed = true;
      Navigator.pop(context, true);
    } else {
      setState(() => _access = access);
    }
  }

  Future<void> _act() async {
    switch (_access) {
      case LocationAccess.serviceOff:
        await _locationService.openLocationSettings();
      case LocationAccess.denied:
        await _recheck(request: true);
      case LocationAccess.deniedForever:
        await _locationService.openAppSettings();
      case LocationAccess.ready:
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final (String title, String message, String action) = switch (_access) {
      LocationAccess.serviceOff => (
          'Location Is Turned Off',
          '${widget.purpose} Turn on location on your phone to continue.',
          'Turn On',
        ),
      LocationAccess.deniedForever => (
          'Location Permission Needed',
          '${widget.purpose} Location access is blocked for GreenSweep — '
              'open the app settings and allow Location under Permissions.',
          'Open Settings',
        ),
      _ => (
          'Location Permission Needed',
          '${widget.purpose} Please allow GreenSweep to use your location.',
          'Allow',
        ),
    };

    return AlertDialog(
      icon: const Icon(Icons.location_off, color: Colors.orange, size: 44),
      title: Text(title),
      content: Text(message, textAlign: TextAlign.center),
      actions: [
        TextButton(
          onPressed: () {
            _closed = true;
            Navigator.pop(context, false);
          },
          child: const Text('Not Now'),
        ),
        ElevatedButton(onPressed: _act, child: Text(action)),
      ],
    );
  }
}
