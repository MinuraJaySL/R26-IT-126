import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// Whether the phone's location can be read right now and, if not, what is
/// in the way: the phone's location switch, or the app's permission (which
/// Android stops asking about after repeated refusals — `deniedForever`).
enum LocationAccess { ready, serviceOff, denied, deniedForever }

class LocationService {
  /// With [request] the system's permission pop-up is shown when the
  /// permission hasn't been given yet; without it this only looks.
  Future<LocationAccess> checkAccess({bool request = true}) async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return LocationAccess.serviceOff;
    }
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied && request) {
      permission = await Geolocator.requestPermission();
    }
    return switch (permission) {
      LocationPermission.denied => LocationAccess.denied,
      LocationPermission.deniedForever => LocationAccess.deniedForever,
      _ => LocationAccess.ready,
    };
  }

  /// Emits whenever the phone's location switch is turned on (true) or off.
  Stream<bool> serviceEnabledStream() {
    return Geolocator.getServiceStatusStream()
        .map((status) => status == ServiceStatus.enabled);
  }

  Future<bool> openLocationSettings() => Geolocator.openLocationSettings();

  Future<bool> openAppSettings() => Geolocator.openAppSettings();

  Future<Position?> getCurrentPosition() async {
    if (await checkAccess() != LocationAccess.ready) return null;

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
