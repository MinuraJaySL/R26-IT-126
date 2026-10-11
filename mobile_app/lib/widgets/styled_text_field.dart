import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Rounded, white-filled text field used across the gradient auth screens.
/// The focused border color transitions smoothly via [OutlineInputBorder]'s
/// built-in animation.
class StyledTextField extends StatelessWidget {
  const StyledTextField({
    super.key,
    required this.controller,
    required this.label,
    required this.icon,
    this.obscureText = false,
    this.keyboardType,
    this.suffixIcon,
    this.autofocus = false,
    this.maxLength,
    this.textAlign = TextAlign.start,
    this.style,
  });

  final TextEditingController controller;
  final String label;
  final IconData icon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final Widget? suffixIcon;
  final bool autofocus;
  final int? maxLength;
  final TextAlign textAlign;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      autofocus: autofocus,
      maxLength: maxLength,
      textAlign: textAlign,
      style: style,
      decoration: styledFieldDecoration(
        label: label,
        icon: icon,
        suffixIcon: suffixIcon,
        hideCounter: maxLength != null,
      ),
    );
  }
}

/// The decoration [StyledTextField] uses, for widgets that need the same
/// look but aren't a plain [TextField] (e.g. the ward dropdown).
InputDecoration styledFieldDecoration({
  required String label,
  required IconData icon,
  Widget? suffixIcon,
  bool hideCounter = false,
}) {
  return InputDecoration(
    labelText: label,
    prefixIcon: Icon(icon, color: AppColors.primaryDark),
    suffixIcon: suffixIcon,
    filled: true,
    fillColor: AppColors.backgroundWhite,
    counterText: hideCounter ? '' : null,
    labelStyle: const TextStyle(
      color: AppColors.textSubtitle,
      fontSize: 14,
      fontWeight: FontWeight.w500,
    ),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: AppColors.primaryDark, width: 1.8),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: AppColors.error),
    ),
    contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
  );
}
