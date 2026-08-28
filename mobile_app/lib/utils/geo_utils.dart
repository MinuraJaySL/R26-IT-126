import 'dart:math';
import 'package:latlong2/latlong.dart';

/// Great-circle distance between two points, in metres.
double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371000.0;
  final dLat = (lat2 - lat1) * pi / 180;
  final dLng = (lng2 - lng1) * pi / 180;
  final a = sin(dLat / 2) * sin(dLat / 2) +
      cos(lat1 * pi / 180) *
          cos(lat2 * pi / 180) *
          sin(dLng / 2) *
          sin(dLng / 2);
  return r * 2 * atan2(sqrt(a), sqrt(1 - a));
}

/// [haversineMeters], for [LatLng] points.
double haversineLatLng(LatLng a, LatLng b) =>
    haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);

/// Shortest distance from [point] to any point along [route], in metres —
/// what every off-route check (driver reroute, resident truck-switch)
/// ultimately compares against its own threshold.
double minDistanceToRoute(LatLng point, List<LatLng> route) {
  double minDist = double.infinity;
  for (final p in route) {
    final d = haversineLatLng(point, p);
    if (d < minDist) minDist = d;
  }
  return minDist;
}
