import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

class LocationService {
  Future<Position?> getCurrentPosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return null;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return null;
    }
    if (permission == LocationPermission.deniedForever) return null;

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
    );
  }

  Stream<Position> positionStream() {
    return Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 0,
      ),
    );
  }

  /// Position stream for a driver's running trip. On Android it runs as a
  /// foreground service, so positions keep arriving — and being uploaded for
  /// residents tracking the truck — while the phone is locked or another app
  /// is open. Android shows a permanent notification for as long as the
  /// stream is listened to; cancelling the subscription removes it.
  Stream<Position> tripPositionStream() {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return positionStream();
    }
    return Geolocator.getPositionStream(
      locationSettings: AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 0,
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: 'Trip in progress',
          notificationText:
              'GreenSweep is sharing your location until you end the trip.',
          notificationChannelName: 'Trip tracking',
          notificationIcon: AndroidResource(name: 'ic_stat_tracking'),
          setOngoing: true,
          // Keeps the CPU awake with the screen off, so uploads don't stall.
          enableWakeLock: true,
        ),
      ),
    );
  }

  double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
    return Geolocator.distanceBetween(lat1, lng1, lat2, lng2);
  }
}
