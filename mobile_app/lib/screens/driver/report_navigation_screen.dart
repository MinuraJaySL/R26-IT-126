import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../../models/bin_report.dart';
import 'navigate_to_point_screen.dart';
import 'resolve_report_dialog.dart';

class ReportNavigationScreen extends StatelessWidget {
  final BinReport report;
  const ReportNavigationScreen({super.key, required this.report});

  @override
  Widget build(BuildContext context) {
    return NavigateToPointScreen(
      destination: LatLng(report.lat, report.lng),
      title: 'Navigate to Report',
      subtitle: report.note,
      accentColor: Colors.red,
      destinationIcon: Icons.report_problem,
      actionLabel: 'Resolve',
      onAction: (ctx) => showResolveReportDialog(ctx, report),
    );
  }
}
