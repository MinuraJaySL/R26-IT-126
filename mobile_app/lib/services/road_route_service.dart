import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

class RoadRouteService {
  static const _base = 'https://router.project-osrm.org/route/v1/driving';

  /// Builds a full route by fetching the shortest road path for each
  /// consecutive pair of waypoints individually — exactly like Google Maps
  /// multi-stop directions. Each segment ends precisely at its destination.
  Future<List<LatLng>> getRoadRoute(List<LatLng> waypoints) async {
    if (waypoints.length < 2) return waypoints;

    final List<LatLng> fullRoute = [];

    for (int i = 0; i < waypoints.length - 1; i++) {
      final segment =
          await _getSegment(waypoints[i], waypoints[i + 1]);

      if (i == 0) {
        fullRoute.addAll(segment);
      } else {
        // Skip the first point — it's the same as the last point
        // of the previous segment, so we avoid duplicate coordinates
        if (segment.length > 1) fullRoute.addAll(segment.skip(1));
      }
    }

    return fullRoute;
  }

  /// Fetches the shortest road route between two points from OSRM.
  /// Returns straight-line fallback on error.
  Future<List<LatLng>> _getSegment(LatLng from, LatLng to) async {
    final coords =
        '${from.longitude},${from.latitude};${to.longitude},${to.latitude}';
    final url = Uri.parse(
        '$_base/$coords?overview=full&geometries=geojson&steps=false');

    try {
      final response =
          await http.get(url).timeout(const Duration(seconds: 8));
      if (response.statusCode != 200) return [from, to];

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final routes = data['routes'] as List?;
      if (routes == null || routes.isEmpty) return [from, to];

      final geometry = routes[0]['geometry'] as Map<String, dynamic>?;
      if (geometry == null) return [from, to];

      final coordinates = geometry['coordinates'] as List;
      final points = coordinates
          .map((c) =>
              LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()))
          .toList();

      if (points.isEmpty) return [from, to];

      // Trim to the closest point to the destination, then snap exactly
      final trimIndex = _closestIndex(points, to);
      final trimmed = points.sublist(0, trimIndex + 1);
      trimmed[trimmed.length - 1] = to; // snap end exactly to destination
      return trimmed;
    } catch (_) {
      return [from, to]; // straight line fallback
    }
  }

  int _closestIndex(List<LatLng> points, LatLng target) {
    int best = 0;
    double bestDist = double.infinity;
    for (int i = 0; i < points.length; i++) {
      final d = _dist(points[i], target);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  double _dist(LatLng a, LatLng b) {
    final dLat = (b.latitude - a.latitude) * pi / 180;
    final dLng = (b.longitude - a.longitude) * pi / 180;
    final x = sin(dLat / 2) * sin(dLat / 2) +
        cos(a.latitude * pi / 180) *
            cos(b.latitude * pi / 180) *
            sin(dLng / 2) *
            sin(dLng / 2);
    return 6371000 * 2 * atan2(sqrt(x), sqrt(1 - x));
  }
}
