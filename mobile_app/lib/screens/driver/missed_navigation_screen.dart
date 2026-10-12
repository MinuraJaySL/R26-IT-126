import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../../models/pickup_request.dart';
import '../../services/firestore_service.dart';
import 'navigate_to_point_screen.dart';
import '../../widgets/app_feedback.dart';
import '../../utils/friendly_error.dart';

class MissedNavigationScreen extends StatelessWidget {
  final PickupRequest request;
  const MissedNavigationScreen({super.key, required this.request});

  Future<bool> _reactivate(BuildContext context) async {
    try {
      await FirestoreService().updateRequestStatus(request.id, RequestStatus.active);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          appSnackBar(
            'Request reactivated — resident will be notified when truck arrives.',
            kind: SnackKind.success,
          ),
        );
      }
      return true;
    } catch (e) {
      if (context.mounted) {
        showErrorDialog(context, friendlyError(e));
      }
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final date = '${request.createdAt.day}/${request.createdAt.month}/${request.createdAt.year}';
    return NavigateToPointScreen(
      destination: LatLng(request.lat, request.lng),
      title: 'Navigate to Missed Pickup',
      subtitle: 'Missed pickup — placed $date',
      accentColor: Colors.orange,
      destinationIcon: Icons.warning_amber_rounded,
      actionLabel: 'Schedule for Next Visit',
      onAction: _reactivate,
    );
  }
}
