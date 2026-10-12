import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/models/bin_model.dart';
import 'package:mobile_app/services/route_service.dart';
import 'package:mobile_app/utils/geo_utils.dart';

// The driver starts here in every test; bins are placed north (+) or south
// (-) of this point by a latitude offset.
const _lat = 6.9000;
const _lng = 79.8600;

SmartBin _bin(String id, double latOffset) => SmartBin(
      id: id,
      label: 'Bin $id',
      lat: _lat + latOffset,
      lng: _lng,
      priority: BinPriority.red,
    );

List<String> _ids(List<SmartBin> bins) => bins.map((b) => b.id).toList();

void main() {
  final service = RouteService();

  group('suggestRoute', () {
    test('returns an empty route when there are no bins', () {
      expect(service.suggestRoute([], _lat, _lng), isEmpty);
    });

    test('returns the only bin when there is one', () {
      final route = service.suggestRoute([_bin('a', 0.01)], _lat, _lng);
      expect(_ids(route), ['a']);
    });

    test('visits bins along a road from nearest to farthest', () {
      final bins = [_bin('far', 0.03), _bin('near', 0.01), _bin('mid', 0.02)];
      final route = service.suggestRoute(bins, _lat, _lng);
      expect(_ids(route), ['near', 'mid', 'far']);
    });

    test('picks each next stop from the previous bin, not from the start', () {
      // From the start the order by distance is north, south, farNorth —
      // but once at "north", "farNorth" is the closer of the two left.
      final bins = [_bin('south', -0.011), _bin('farNorth', 0.025), _bin('north', 0.010)];
      final route = service.suggestRoute(bins, _lat, _lng);
      expect(_ids(route), ['north', 'farNorth', 'south']);
    });

    test('includes every bin exactly once', () {
      final bins = [for (var i = 1; i <= 6; i++) _bin('$i', i.isEven ? i * 0.004 : -i * 0.003)];
      final route = service.suggestRoute(bins, _lat, _lng);
      expect(_ids(route).toSet(), _ids(bins).toSet());
      expect(route, hasLength(bins.length));
    });

    test('does not change the list it was given', () {
      final bins = [_bin('far', 0.03), _bin('near', 0.01)];
      service.suggestRoute(bins, _lat, _lng);
      expect(_ids(bins), ['far', 'near']);
    });
  });

  group('totalDistance', () {
    test('is zero for an empty route', () {
      expect(service.totalDistance([], _lat, _lng), 0);
    });

    test('adds the leg from the driver and the legs between bins', () {
      final route = [_bin('a', 0.01), _bin('b', 0.03)];
      final expected = haversineMeters(_lat, _lng, _lat + 0.01, _lng) +
          haversineMeters(_lat + 0.01, _lng, _lat + 0.03, _lng);
      expect(service.totalDistance(route, _lat, _lng), closeTo(expected, 0.001));
    });
  });
}
