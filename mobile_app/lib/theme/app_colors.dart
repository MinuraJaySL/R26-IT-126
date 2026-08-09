import 'package:flutter/material.dart';

/// Centralized color palette for the GreenSweep gradient UI.
class AppColors {
  AppColors._();

  static const Color primaryDark = Color(0xFF2E7D32);
  static const Color primaryLight = Color(0xFF66BB6A);

  static const Color secondaryDark = Color(0xFF1B5E20);
  static const Color secondaryMedium = Color(0xFF43A047);

  static const Color accent = Color(0xFFFFD54F);

  static const Color backgroundLight = Color(0xFFE8F5E9);
  static const Color backgroundWhite = Color(0xFFFFFFFF);

  static const Color textHeading = Color(0xFF212121);
  static const Color textSubtitle = Color(0xFF757575);

  static const Color error = Color(0xFFEF5350);

  static const Color cardBackground = Color(0xFFFFFFFF);

  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [primaryDark, primaryLight],
  );

  static const LinearGradient secondaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [secondaryDark, secondaryMedium],
  );

  static const LinearGradient buttonGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [primaryDark, primaryLight],
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [backgroundLight, backgroundWhite],
  );
}
