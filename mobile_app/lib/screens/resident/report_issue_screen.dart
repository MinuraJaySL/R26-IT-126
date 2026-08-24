import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../models/bin_report.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';
import '../../services/location_service.dart';

class ReportIssueScreen extends StatefulWidget {
  const ReportIssueScreen({super.key});

  @override
  State<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends State<ReportIssueScreen> {
  final _locationService = LocationService();
  final _fs = FirestoreService();
  final _mapController = MapController();
  final _noteCtrl = TextEditingController();

  LatLng? _selectedPoint;
  LatLng _initialPosition = const LatLng(6.9069, 79.9723);
  bool _loadingLocation = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadCurrentLocation();
  }

  @override
  void dispose() {
    _mapController.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCurrentLocation() async {
    final pos = await _locationService.getCurrentPosition();
    if (pos != null && mounted) {
      final loc = LatLng(pos.latitude, pos.longitude);
      setState(() {
        _initialPosition = loc;
        _selectedPoint = loc;
        _loadingLocation = false;
      });
      _mapController.move(loc, 16);
    } else {
      setState(() => _loadingLocation = false);
    }
  }

  Future<void> _submitReport() async {
    if (_selectedPoint == null) return;
    if (_noteCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please describe the problem.')),
      );
      return;
    }
    setState(() => _saving = true);
    final auth = context.read<AuthProvider>();
    final report = BinReport(
      id: const Uuid().v4(),
      residentId: auth.user!.uid,
      lat: _selectedPoint!.latitude,
      lng: _selectedPoint!.longitude,
      note: _noteCtrl.text.trim(),
      status: BinReportStatus.open,
      createdAt: DateTime.now(),
    );
    await _fs.createBinReport(report);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Report submitted — a driver will check it out.')),
      );
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report an Issue'),
        backgroundColor: Colors.red,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            child: _loadingLocation
                ? const Center(child: CircularProgressIndicator())
                : FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: _initialPosition,
                      initialZoom: 16,
                      onTap: (_, point) =>
                          setState(() => _selectedPoint = point),
                    ),
                    children: [
                      TileLayer(
                        urlTemplate:
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.r26it126.mobile_app',
                      ),
                      if (_selectedPoint != null)
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: _selectedPoint!,
                              width: 40,
                              height: 40,
                              child: const Icon(
                                Icons.report_problem,
                                color: Colors.red,
                                size: 40,
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(blurRadius: 8, color: Colors.black12)],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_selectedPoint != null)
                  Text(
                    'Location: ${_selectedPoint!.latitude.toStringAsFixed(4)}, ${_selectedPoint!.longitude.toStringAsFixed(4)}',
                    style: const TextStyle(fontSize: 13, color: Colors.grey),
                  )
                else
                  const Text(
                    'Tap on the map to mark where the problem is',
                    style: TextStyle(color: Colors.grey),
                  ),
                const SizedBox(height: 12),
                TextField(
                  controller: _noteCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'What\'s wrong?',
                    hintText: 'e.g. Bin overflowing near the gate',
                    filled: true,
                    fillColor: Colors.grey.withValues(alpha: 0.08),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 52,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.report_problem),
                    label: const Text('Submit Report'),
                    onPressed:
                        (_selectedPoint == null || _saving) ? null : _submitReport,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
