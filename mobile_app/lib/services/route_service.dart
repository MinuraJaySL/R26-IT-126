import '../models/bin_model.dart';
import '../utils/geo_utils.dart';

class RouteService {
  /// Returns bins in nearest-neighbour collection order from the driver's
  /// position. Used to group by priority tier (red/yellow/green) when bins
  /// could be non-critical — now that only critical bins are ever stored
  /// (see the Worker's /bin-status endpoint), every bin is equally urgent,
  /// so this collapses to a single pass.
  List<SmartBin> suggestRoute(
    List<SmartBin> bins,
    double driverLat,
    double driverLng,
  ) {
    return _nearestNeighbour(bins, driverLat, driverLng);
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
