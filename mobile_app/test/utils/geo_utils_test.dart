import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mobile_app/utils/geo_utils.dart';

void main() {
  // One degree along a great circle on the 6,371 km sphere the app uses.
  const metresPerDegree = 111194.93;

  group('haversineMeters', () {
    test('is zero for the same point', () {
      expect(haversineMeters(6.9271, 79.8612, 6.9271, 79.8612), 0);
    });

    test('measures one degree of latitude', () {
      expect(haversineMeters(6, 80, 7, 80), closeTo(metresPerDegree, 1));
    });

    test('measures one degree of longitude on the equator', () {
      expect(haversineMeters(0, 79, 0, 80), closeTo(metresPerDegree, 1));
    });

    test('a degree of longitude is half as long at 60 degrees north', () {
      expect(haversineMeters(60, 10, 60, 11), closeTo(metresPerDegree / 2, 5));
    });

    test('gives the same distance in both directions', () {
      final there = haversineMeters(6.9271, 79.8612, 6.9344, 79.8428);
      final back = haversineMeters(6.9344, 79.8428, 6.9271, 79.8612);
      expect(there, closeTo(back, 0.001));
    });
  });

  test('haversineLatLng matches haversineMeters', () {
    const a = LatLng(6.9271, 79.8612);
    const b = LatLng(6.9344, 79.8428);
    expect(
      haversineLatLng(a, b),
      haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude),
    );
  });

  group('minDistanceToRoute', () {
    test('returns the distance to the closest route point', () {
      const route = [LatLng(6.90, 79.86), LatLng(6.91, 79.86), LatLng(6.95, 79.86)];
      const driver = LatLng(6.912, 79.86);
      expect(
        minDistanceToRoute(driver, route),
        closeTo(haversineLatLng(driver, route[1]), 0.001),
      );
    });

    test('is infinite for an empty route', () {
      expect(minDistanceToRoute(const LatLng(6.9, 79.86), const []), double.infinity);
    });
  });
}
