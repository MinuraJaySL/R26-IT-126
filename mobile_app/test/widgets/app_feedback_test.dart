import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/widgets/app_feedback.dart';

// A screen with one button that runs [onTap] with a context that has a
// Scaffold above it.
Widget _screen(void Function(BuildContext context) onTap) {
  return MaterialApp(
    home: Scaffold(
      body: Builder(
        builder: (context) => TextButton(
          onPressed: () => onTap(context),
          child: const Text('Go'),
        ),
      ),
    ),
  );
}

void main() {
  group('appSnackBar', () {
    testWidgets('shows the message with a green tick for a success', (tester) async {
      await tester.pumpWidget(_screen((context) {
        ScaffoldMessenger.of(context).showSnackBar(
          appSnackBar('Profile saved', kind: SnackKind.success),
        );
      }));
      await tester.tap(find.text('Go'));
      await tester.pump();

      expect(find.text('Profile saved'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle_outline), findsOneWidget);
      expect(
        tester.widget<SnackBar>(find.byType(SnackBar)).backgroundColor,
        Colors.green.shade700,
      );
    });

    testWidgets('shows a red error icon for an error', (tester) async {
      await tester.pumpWidget(_screen((context) {
        ScaffoldMessenger.of(context).showSnackBar(
          appSnackBar('Please select your ward', kind: SnackKind.error),
        );
      }));
      await tester.tap(find.text('Go'));
      await tester.pump();

      expect(find.text('Please select your ward'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
      expect(
        tester.widget<SnackBar>(find.byType(SnackBar)).backgroundColor,
        Colors.red.shade700,
      );
    });

    test('is a plain four-second info message by default', () {
      final snackBar = appSnackBar('3 stops');
      expect(snackBar.duration, const Duration(seconds: 4));
      expect(snackBar.backgroundColor, isNull);
      expect(snackBar.action, isNull);
    });
  });

  group('showErrorDialog', () {
    testWidgets('stays on screen until OK is tapped', (tester) async {
      await tester.pumpWidget(_screen((context) {
        showErrorDialog(context, 'No internet connection.');
      }));
      await tester.tap(find.text('Go'));
      await tester.pumpAndSettle();

      expect(find.text('Something Went Wrong'), findsOneWidget);
      expect(find.text('No internet connection.'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);

      await tester.tap(find.text('OK'));
      await tester.pumpAndSettle();

      expect(find.byType(AlertDialog), findsNothing);
    });

    testWidgets('uses the title it is given', (tester) async {
      await tester.pumpWidget(_screen((context) {
        showErrorDialog(context, 'Incorrect email or password.', title: 'Login Failed');
      }));
      await tester.tap(find.text('Go'));
      await tester.pumpAndSettle();

      expect(find.text('Login Failed'), findsOneWidget);
      expect(find.text('Something Went Wrong'), findsNothing);
    });
  });

  testWidgets('showSuccessDialog shows its title, message and a tick', (tester) async {
    await tester.pumpWidget(_screen((context) {
      showSuccessDialog(context, '12 residents were notified.', title: 'Announcement Sent');
    }));
    await tester.tap(find.text('Go'));
    await tester.pumpAndSettle();

    expect(find.text('Announcement Sent'), findsOneWidget);
    expect(find.text('12 residents were notified.'), findsOneWidget);
    expect(find.byIcon(Icons.check_circle_outline), findsOneWidget);
  });
}
