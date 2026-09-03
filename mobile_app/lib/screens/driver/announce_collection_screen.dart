import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../config/colombo_wards.dart';
import '../../models/collection_announcement.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';
import '../../widgets/app_input_decoration.dart';

class AnnounceCollectionScreen extends StatefulWidget {
  const AnnounceCollectionScreen({super.key});

  @override
  State<AnnounceCollectionScreen> createState() => _AnnounceCollectionScreenState();
}

class _AnnounceCollectionScreenState extends State<AnnounceCollectionScreen> {
  // Residents get the fixed-time push at 6 PM the day before collection (see
  // the Worker's scheduled handler) — so a post only makes it into that
  // window if it's submitted before this same cutoff. Reusing one constant
  // for both the send time and the submission deadline keeps them in sync.
  static const _cutoffHour = 18;

  final _formKey = GlobalKey<FormState>();
  final _noteCtrl = TextEditingController();
  final _fs = FirestoreService();

  String? _selectedWard;
  late DateTime _selectedDate;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _selectedDate = _dateOnly(DateTime.now().add(const Duration(days: 1)));
  }

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

  DateTime _cutoffFor(DateTime collectionDate) {
    final dayBefore = collectionDate.subtract(const Duration(days: 1));
    return DateTime(dayBefore.year, dayBefore.month, dayBefore.day, _cutoffHour);
  }

  Future<void> _pickDate() async {
    final tomorrow = _dateOnly(DateTime.now().add(const Duration(days: 1)));
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate.isBefore(tomorrow) ? tomorrow : _selectedDate,
      firstDate: tomorrow,
      lastDate: tomorrow.add(const Duration(days: 30)),
    );
    if (picked != null) setState(() => _selectedDate = _dateOnly(picked));
  }

  void _showError(String message) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        icon: const Icon(Icons.error_outline, color: Colors.red, size: 44),
        title: const Text('Cannot Post Announcement'),
        content: Text(message, textAlign: TextAlign.center),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedWard == null) {
      _showError('Please select a ward.');
      return;
    }

    final cutoff = _cutoffFor(_selectedDate);
    if (!DateTime.now().isBefore(cutoff)) {
      _showError(
        'Too late to announce collection for ${_formatDate(_selectedDate)}. '
        'Announcements must be posted before ${_formatCutoff(cutoff)} the day '
        'before collection, so residents get their notice in time. '
        'Pick a later date instead.',
      );
      return;
    }

    setState(() => _busy = true);
    final driverId = context.read<AuthProvider>().user!.uid;
    final announcement = CollectionAnnouncement(
      id: const Uuid().v4(),
      driverId: driverId,
      ward: _selectedWard!,
      collectionDate: _selectedDate,
      note: _noteCtrl.text.trim(),
      createdAt: DateTime.now(),
    );

    try {
      await _fs.createCollectionAnnouncement(announcement);
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          icon: const Icon(Icons.check_circle_outline, color: Colors.green, size: 44),
          title: const Text('Announcement Posted'),
          content: Text(
            'Residents in $_selectedWard will be notified at '
            '${_formatCutoff(_cutoffFor(_selectedDate))} on '
            '${_formatDate(_selectedDate.subtract(const Duration(days: 1)))}.',
            textAlign: TextAlign.center,
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) _showError('Could not post announcement: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _formatDate(DateTime d) => '${d.day}/${d.month}/${d.year}';

  String _formatCutoff(DateTime d) => _formatHour(d.hour, d.minute);

  String _formatHour(int hour, int minute) {
    final hour12 = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    final period = hour >= 12 ? 'PM' : 'AM';
    return '$hour12:${minute.toString().padLeft(2, '0')} $period';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(
        title: const Text('Announce Collection'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'My Announcements',
            onPressed: () => context.push('/driver/announcements'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Let residents in a ward know your truck is coming. '
                'They\'ll see it in-app immediately, and get a notification '
                'at ${_formatHour(_cutoffHour, 0)} the evening before.',
                style: TextStyle(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 24),
              Autocomplete<String>(
                optionsBuilder: (textValue) {
                  if (textValue.text.isEmpty) return colomboWards;
                  final query = textValue.text.toLowerCase();
                  return colomboWards.where((w) => w.toLowerCase().contains(query));
                },
                onSelected: (selection) => setState(() => _selectedWard = selection),
                fieldViewBuilder: (context, controller, focusNode, onSubmit) {
                  return TextFormField(
                    controller: controller,
                    focusNode: focusNode,
                    decoration: appFieldDecoration(
                      scheme,
                      label: 'Ward',
                      icon: Icons.location_city_outlined,
                    ),
                    onChanged: (_) => _selectedWard = null,
                  );
                },
                optionsViewBuilder: (context, onSelected, options) {
                  return Align(
                    alignment: Alignment.topLeft,
                    child: Material(
                      elevation: 4,
                      borderRadius: BorderRadius.circular(12),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxHeight: 240, maxWidth: 400),
                        child: ListView.builder(
                          padding: EdgeInsets.zero,
                          shrinkWrap: true,
                          itemCount: options.length,
                          itemBuilder: (context, i) {
                            final option = options.elementAt(i);
                            return ListTile(
                              dense: true,
                              title: Text(option),
                              onTap: () => onSelected(option),
                            );
                          },
                        ),
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),
              InkWell(
                onTap: _pickDate,
                child: InputDecorator(
                  decoration: appFieldDecoration(
                    scheme,
                    label: 'Collection date',
                    icon: Icons.event_outlined,
                  ),
                  child: Text(_formatDate(_selectedDate)),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _noteCtrl,
                maxLines: 2,
                decoration: appFieldDecoration(
                  scheme,
                  label: 'Note (optional)',
                  icon: Icons.notes_outlined,
                ),
              ),
              const SizedBox(height: 28),
              SizedBox(
                height: 54,
                child: ElevatedButton(
                  onPressed: _busy ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: scheme.primary,
                    foregroundColor: scheme.onPrimary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 2,
                  ),
                  child: _busy
                      ? SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.4,
                            color: scheme.onPrimary,
                          ),
                        )
                      : const Text(
                          'Post Announcement',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
