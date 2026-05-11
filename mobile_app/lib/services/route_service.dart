import 'dart:math';
import '../models/bin_model.dart';

class RouteService {
  /// Returns bins in optimised collection order:
  /// 1. RED + high-methane bins — nearest-neighbour from driver
  /// 2. YELLOW bins          — nearest-neighbour from last RED stop
  /// 3. GREEN bins           — nearest-neighbour from last YELLOW stop
  ///
  /// Each group's handoff position comes from the ORDERED result of the
  /// previous group, not the raw list — this is the key to avoiding zigzags.
  List<SmartBin> suggestRoute(
    List<SmartBin> bins,
    double driverLat,
    double driverLng,
  ) {
    if (bins.isEmpty) return [];

    // --- Group bins by priority ---
    final urgent = bins
        .where((b) =>
            b.priority == BinPriority.red ||
            b.methaneStatus == MethaneStatus.high)
        .toList();
    final medium = bins
        .where((b) => b.priority == BinPriority.yellow && !urgent.contains(b))
        .toList();
    final low = bins
        .where((b) => b.priority == BinPriority.green && !urgent.contains(b))
        .toList();

    // --- Nearest-neighbour within each group ---
    // Start from driver position for urgent
    final orderedUrgent =
        _nearestNeighbour(urgent, driverLat, driverLng);

    // Start medium from the LAST bin in the ordered urgent result
    final afterUrgentLat =
        orderedUrgent.isNotEmpty ? orderedUrgent.last.lat : driverLat;
    final afterUrgentLng =
        orderedUrgent.isNotEmpty ? orderedUrgent.last.lng : driverLng;
    final orderedMedium =
        _nearestNeighbour(medium, afterUrgentLat, afterUrgentLng);

    // Start low from the LAST bin in the ordered medium result
    final afterMediumLat =
        orderedMedium.isNotEmpty ? orderedMedium.last.lat : afterUrgentLat;
    final afterMediumLng =
        orderedMedium.isNotEmpty ? orderedMedium.last.lng : afterUrgentLng;
    final orderedLow =
        _nearestNeighbour(low, afterMediumLat, afterMediumLng);

    return [...orderedUrgent, ...orderedMedium, ...orderedLow];
  }

  /// Greedy nearest-neighbour TSP heuristic.
  /// Always picks the closest unvisited bin from the current position.
  List<SmartBin> _nearestNeighbour(
      List<SmartBin> bins, double startLat, double startLng) {
    if (bins.isEmpty) return [];
    final remaining = List<SmartBin>.from(bins);
    final ordered = <SmartBin>[];
    double curLat = startLat, curLng = startLng;

    while (remaining.isNotEmpty) {
      // Find the closest bin to current position
      SmartBin nearest = remaining[0];
      double nearestDist = _dist(curLat, curLng, nearest.lat, nearest.lng);
      for (int i = 1; i < remaining.length; i++) {
        final d = _dist(curLat, curLng, remaining[i].lat, remaining[i].lng);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = remaining[i];
        }
      }
      remaining.remove(nearest);
      ordered.add(nearest);
      curLat = nearest.lat;
      curLng = nearest.lng;
    }
    return ordered;
  }

  /// Haversine distance in metres between two lat/lng points.
  double _dist(double lat1, double lng1, double lat2, double lng2) {
    const r = 6371000.0;
    final dLat = _rad(lat2 - lat1);
    final dLng = _rad(lng2 - lng1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_rad(lat1)) * cos(_rad(lat2)) * sin(dLng / 2) * sin(dLng / 2);
    return r * 2 * atan2(sqrt(a), sqrt(1 - a));
  }

  double _rad(double deg) => deg * pi / 180;

  /// Total straight-line route distance in metres (for the snackbar summary).
  double totalDistance(List<SmartBin> route, double startLat, double startLng) {
    if (route.isEmpty) return 0;
    double total = _dist(startLat, startLng, route.first.lat, route.first.lng);
    for (int i = 0; i < route.length - 1; i++) {
      total += _dist(route[i].lat, route[i].lng, route[i + 1].lat, route[i + 1].lng);
    }
    return total;
  }
}
