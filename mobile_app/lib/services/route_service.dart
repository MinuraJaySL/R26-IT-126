import '../models/bin_model.dart';
import '../utils/geo_utils.dart';

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
      double nearestDist = haversineMeters(curLat, curLng, nearest.lat, nearest.lng);
      for (int i = 1; i < remaining.length; i++) {
        final d = haversineMeters(curLat, curLng, remaining[i].lat, remaining[i].lng);
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

  /// Total straight-line route distance in metres (for the snackbar summary).
  double totalDistance(List<SmartBin> route, double startLat, double startLng) {
    if (route.isEmpty) return 0;
    double total = haversineMeters(startLat, startLng, route.first.lat, route.first.lng);
    for (int i = 0; i < route.length - 1; i++) {
      total += haversineMeters(route[i].lat, route[i].lng, route[i + 1].lat, route[i + 1].lng);
    }
    return total;
  }
}
