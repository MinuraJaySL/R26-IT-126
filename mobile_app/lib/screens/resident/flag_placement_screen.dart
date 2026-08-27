import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../models/pickup_request.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';
import '../../services/location_service.dart';
import '../../widgets/map_recenter_button.dart';

class FlagPlacementScreen extends StatefulWidget {
  const FlagPlacementScreen({super.key});

  @override
  State<FlagPlacementScreen> createState() => _FlagPlacementScreenState();
}

class _FlagPlacementScreenState extends State<FlagPlacementScreen> {
  final _locationService = LocationService();
  final _fs = FirestoreService();
  final _mapController = MapController();

  LatLng? _selectedPoint;
  LatLng _initialPosition = const LatLng(6.9069, 79.9723);
  bool _loadingLocation = true;
  bool _saving = false;
  int _timeWindowHours = 1;

  @override
  void initState() {
    super.initState();
    _loadCurrentLocation();
  }

  @override
  void dispose() {
    _mapController.dispose();
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

  Future<void> _saveRequest() async {
    if (_selectedPoint == null) return;
    setState(() => _saving = true);
    final auth = context.read<AuthProvider>();
    final req = PickupRequest(
      id: const Uuid().v4(),
      residentId: auth.user!.uid,
      lat: _selectedPoint!.latitude,
      lng: _selectedPoint!.longitude,
      status: RequestStatus.active,
      createdAt: DateTime.now(),
      expiresAt: DateTime.now().add(Duration(hours: _timeWindowHours)),
    );
    await _fs.createPickupRequest(req);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pickup request placed!')),
      );
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Place Pickup Flag'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            child: _loadingLocation
                ? const Center(child: CircularProgressIndicator())
                : Stack(
                    children: [
                      FlutterMap(
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
                                    Icons.flag,
                                    color: Colors.green,
                                    size: 40,
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                      Positioned(
                        bottom: 16,
                        right: 16,
                        child: MapRecenterButton(
                          color: Colors.green,
                          onPressed: () async {
                            final pos = await _locationService.getCurrentPosition();
                            if (pos != null && mounted) {
                              _mapController.move(
                                LatLng(pos.latitude, pos.longitude),
                                _mapController.camera.zoom,
                              );
                            }
                          },
                        ),
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
                    'Selected: ${_selectedPoint!.latitude.toStringAsFixed(4)}, ${_selectedPoint!.longitude.toStringAsFixed(4)}',
                    style: const TextStyle(fontSize: 13, color: Colors.grey),
                  )
                else
                  const Text(
                    'Tap on the map to place your pickup flag',
                    style: TextStyle(color: Colors.grey),
                  ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Text('Time window: '),
                    DropdownButton<int>(
                      value: _timeWindowHours,
                      items: [1, 2, 3]
                          .map((h) => DropdownMenuItem(
                                value: h,
                                child: Text('$h hour${h > 1 ? 's' : ''}'),
                              ))
                          .toList(),
                      onChanged: (int? v) {
                        if (v != null) setState(() => _timeWindowHours = v);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 52,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.flag),
                    label: const Text('Confirm Pickup Request'),
                    onPressed: (_selectedPoint == null || _saving)
                        ? null
                        : _saveRequest,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
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
