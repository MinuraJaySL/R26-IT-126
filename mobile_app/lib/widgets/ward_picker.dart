import 'package:flutter/material.dart';

import '../config/colombo_wards.dart';

/// Ward dropdown with type-to-filter. Tapping the field (or its arrow)
/// always opens the full list — even with a ward already chosen — so a
/// different one can be picked directly, without clearing the text first;
/// typing narrows the list.
///
/// Reports the chosen ward through [onChanged], or null whenever the text
/// isn't exactly one of [colomboWards] (the user typed something else or
/// cleared it), so callers can keep treating null as "nothing selected".
class WardPicker extends StatefulWidget {
  const WardPicker({
    super.key,
    this.initialWard,
    required this.decoration,
    required this.onChanged,
  });

  final String? initialWard;

  /// The field's look — passed in because the screens using this don't
  /// share one input style. Leave `suffixIcon` unset to get the arrow.
  final InputDecoration decoration;

  final ValueChanged<String?> onChanged;

  @override
  State<WardPicker> createState() => _WardPickerState();
}

class _WardPickerState extends State<WardPicker> {
  // Built once: handing DropdownMenu a fresh list on every rebuild makes it
  // reset its highlight and filtered entries mid-typing.
  static final List<DropdownMenuEntry<String>> _entries = [
    for (final ward in colomboWards) DropdownMenuEntry(value: ward, label: ward),
  ];

  late final TextEditingController _controller;
  // Only the ward this picker opened with. Callers typically pass their
  // live selection as initialWard, and forwarding each change back into
  // DropdownMenu.initialSelection would have it rewrite the field's text
  // during a rebuild.
  late final String? _initialWard = widget.initialWard;
  String? _current;

  @override
  void initState() {
    super.initState();
    _current = _initialWard;
    _controller = TextEditingController(text: _initialWard ?? '')
      ..addListener(_syncSelection);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  // Picking an entry and typing a name both end up as text in the field, so
  // the text is the single source of truth for what's selected.
  void _syncSelection() {
    final text = _controller.text.trim();
    final match = colomboWards.contains(text) ? text : null;
    if (match == _current) return;
    _current = match;
    widget.onChanged(match);
  }

  @override
  Widget build(BuildContext context) {
    return DropdownMenu<String>(
      controller: _controller,
      initialSelection: _initialWard,
      expandedInsets: EdgeInsets.zero,
      menuHeight: 280,
      enableFilter: true,
      requestFocusOnTap: true,
      decorationBuilder: (context, menuController) => widget.decoration,
      dropdownMenuEntries: _entries,
      // Drop focus once a ward is picked, so the keyboard closes and doesn't
      // come back when a dialog opened afterwards (e.g. the date picker)
      // returns focus to this field.
      onSelected: (_) => FocusManager.instance.primaryFocus?.unfocus(),
    );
  }
}
