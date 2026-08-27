import 'package:flutter/material.dart';

/// Small floating "my location" button used on every map screen to jump the
/// camera back to the relevant live position after the user has panned away
/// — same pattern as Google Maps' recenter control.
class MapRecenterButton extends StatelessWidget {
  const MapRecenterButton({super.key, required this.onPressed, this.color = Colors.indigo});

  final VoidCallback onPressed;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton.small(
      heroTag: null,
      onPressed: onPressed,
      backgroundColor: Colors.white,
      foregroundColor: color,
      elevation: 3,
      child: const Icon(Icons.my_location),
    );
  }
}
