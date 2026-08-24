/**
 * WeekPicker.jsx
 * Sri Lanka–aware calendar week picker.
 * - Supports selecting any week across 2023, 2024, 2025, 2026, and 2027
 * - Includes quick Year switcher buttons (2023, 2024, 2025, 2026, 2027)
 * - Marks Sri Lanka public holidays & Poya (full-moon) days
 * - Identifies Dataset Split: Training (2023-May 2025), Test Set (May-Dec 2025), or Future
 * - Auto-suggests week type based on holidays in selected week
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Moon, Star, Calendar } from 'lucide-react';

// ── Sri Lanka public holidays (fixed-date) ───────────────────────────────────
const SL_PUBLIC_HOLIDAYS = {
  '01-15': 'Thai Pongal',
  '02-04': 'Independence Day',
  '04-13': 'Sinhala & Tamil New Year Eve',
  '04-14': 'Sinhala & Tamil New Year',
  '05-01': 'May Day',
  '12-25': 'Christmas',
  '12-31': 'New Year Eve',
};

// ── Sri Lanka Poya days (2023 - 2027) ─────────────────────────────────────────
const POYA_DATES = new Set([
  // 2023
  '2023-01-06', '2023-02-05', '2023-03-06', '2023-04-05', '2023-05-05',
  '2023-06-03', '2023-07-03', '2023-08-01', '2023-08-30', '2023-09-29',
  '2023-10-28', '2023-11-26', '2023-12-26',
  // 2024
  '2024-01-25', '2024-02-23', '2024-03-24', '2024-04-23', '2024-05-23',
  '2024-06-21', '2024-07-20', '2024-08-19', '2024-09-17', '2024-10-17',
  '2024-11-15', '2024-12-14',
  // 2025
  '2025-01-13', '2025-02-12', '2025-03-13', '2025-04-12', '2025-05-12',
  '2025-06-10', '2025-07-10', '2025-08-08', '2025-09-07', '2025-10-06',
  '2025-11-05', '2025-12-04',
  // 2026
  '2026-01-13', '2026-02-12', '2026-03-14', '2026-04-12', '2026-05-12',
  '2026-06-11', '2026-07-10', '2026-08-09', '2026-09-07', '2026-10-07',
  '2026-11-05', '2026-12-04',
  // 2027
  '2027-01-03', '2027-02-01', '2027-03-03', '2027-04-01', '2027-04-30',
  '2027-05-30', '2027-06-28', '2027-07-28', '2027-08-26', '2027-09-25',
  '2027-10-24', '2027-11-23', '2027-12-22',
]);

const POYA_NAMES = {
  1: 'Duruthu Poya', 2: 'Navam Poya', 3: 'Medin Poya', 4: 'Bak Poya',
  5: 'Vesak Poya', 6: 'Poson Poya', 7: 'Esala Poya', 8: 'Nikini Poya',
  9: 'Binara Poya', 10: 'Vap Poya', 11: 'Il Poya', 12: 'Unduvap Poya',
};

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const AVAILABLE_YEARS = [2023, 2024, 2025, 2026, 2027];

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function isPoya(dateStr) {
  return POYA_DATES.has(dateStr);
}

function getHolidayLabel(dateStr) {
  const mmdd = dateStr.slice(5);
  if (SL_PUBLIC_HOLIDAYS[mmdd]) return SL_PUBLIC_HOLIDAYS[mmdd];
  if (isPoya(dateStr)) {
    const month = parseInt(dateStr.slice(5, 7), 10);
    return POYA_NAMES[month] || 'Poya Day';
  }
  return null;
}

function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function detectWeekType(monday) {
  const days = getWeekDays(monday);
  for (const d of days) {
    const dateStr = toYMD(d);
    const mmdd = dateStr.slice(5);
    if (SL_PUBLIC_HOLIDAYS[mmdd]) return 'holiday';
    if (isPoya(dateStr)) return 'holiday';
  }
  return 'normal';
}

function getPeriodBadge(monday) {
  const dateStr = toYMD(monday);
<<<<<<< HEAD
  const todayStr = toYMD(new Date());
=======
>>>>>>> c70ba2b (Model improvements)
  if (dateStr < '2025-05-19' && dateStr >= '2023-01-01') {
    return { label: 'Training Set Data (2023–2025)', color: '#06b6d4', type: 'train' };
  }
  if (dateStr >= '2025-05-19' && dateStr <= '2025-12-31') {
    return { label: 'Held-Out Test Set (Validation)', color: '#10b981', type: 'test' };
  }
<<<<<<< HEAD
  if (dateStr < todayStr) {
    return { label: 'Recorded Weather Data (2026)', color: '#06b6d4', type: 'history' };
  }
=======
>>>>>>> c70ba2b (Model improvements)
  return { label: 'Live / Future Forecast', color: '#8b5cf6', type: 'future' };
}

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const startMonday = getMondayOf(firstDay);
  const days = [];
  const cursor = new Date(startMonday);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export default function WeekPicker({ selectedMonday, onChange }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Initialize view to selected week's year/month or today's
  const [viewYear, setViewYear] = useState(() => (selectedMonday ? selectedMonday.getFullYear() : today.getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (selectedMonday ? selectedMonday.getMonth() : today.getMonth()));
  const [hoveredMonday, setHoveredMonday] = useState(null);

  const calDays = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => Math.max(2023, y - 1));
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => Math.min(2027, y + 1));
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleDayClick = (day) => {
    const monday = getMondayOf(day);
    onChange(monday, detectWeekType(monday));
  };

  const handleDayHover = (day) => {
    const monday = getMondayOf(day);
    setHoveredMonday(monday);
  };

  const dayMeta = useMemo(() => {
    const meta = {};
    calDays.forEach(d => {
      const ds = toYMD(d);
      meta[ds] = { holiday: getHolidayLabel(ds), isPoya: isPoya(ds) };
    });
    return meta;
  }, [calDays]);

  const selectedWeekLabel = useMemo(() => {
    if (!selectedMonday) return null;
    const end = new Date(selectedMonday);
    end.setDate(selectedMonday.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(selectedMonday)} – ${fmt(end)}`;
  }, [selectedMonday]);

  const selectedWeekHolidays = useMemo(() => {
    if (!selectedMonday) return [];
    return getWeekDays(selectedMonday)
      .map(d => getHolidayLabel(toYMD(d)))
      .filter(Boolean);
  }, [selectedMonday]);

  const periodInfo = useMemo(() => {
    if (!selectedMonday) return null;
    return getPeriodBadge(selectedMonday);
  }, [selectedMonday]);

  // Group into weeks
  const weeks = [];
  for (let i = 0; i < calDays.length; i += 7) {
    weeks.push(calDays.slice(i, i + 7));
  }

  return (
    <div className="select-none">
      {/* Year Quick Selector */}
      <div className="mb-3 flex items-center justify-between gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        {AVAILABLE_YEARS.map(yr => (
          <button
            key={yr}
            type="button"
            onClick={() => setViewYear(yr)}
            className={`flex-1 rounded-lg py-1 text-xs font-extrabold transition-all ${
              viewYear === yr
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'hover:bg-emerald-500/10'
            }`}
            style={viewYear !== yr ? { color: 'var(--text-secondary)' } : {}}
          >
            {yr}
          </button>
        ))}
      </div>

      {/* Month Navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-emerald-500/10 text-emerald-500"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
            {MONTH_NAMES_EN[viewMonth]} {viewYear}
          </p>
          <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            Sri Lanka Calendar · Select Any Week
          </p>
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-emerald-500/10 text-emerald-500"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day labels */}
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {DAY_LABELS.map(d => (
          <div key={d} className="py-1 text-center text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="space-y-0.5">
        {weeks.map((week, wi) => {
          const wMonday = getMondayOf(week[0]);
          const isSelected = selectedMonday && isSameDay(wMonday, selectedMonday);
          const isHovered = hoveredMonday && isSameDay(wMonday, hoveredMonday);

          return (
            <motion.div
              key={wi}
              onClick={() => handleDayClick(week[0])}
              onMouseEnter={() => handleDayHover(week[0])}
              onMouseLeave={() => setHoveredMonday(null)}
              className="grid grid-cols-7 gap-0.5 rounded-lg transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: isSelected
                  ? 'rgba(16,185,129,0.18)'
                  : isHovered
                    ? 'rgba(16,185,129,0.08)'
                    : 'transparent',
                outline: isSelected ? '2px solid rgba(16,185,129,0.6)' : 'none',
                outlineOffset: '1px',
                borderRadius: '10px',
              }}
            >
              {week.map((day, di) => {
                const dateStr = toYMD(day);
                const meta = dayMeta[dateStr] || {};
                const isCurrentMonth = day.getMonth() === viewMonth;
                const isToday = isSameDay(day, today);

                return (
                  <div
                    key={di}
                    className="relative flex flex-col items-center justify-center rounded-lg py-1.5 px-0.5"
                    title={meta.holiday || ''}
                  >
                    <span
                      className={`text-xs font-semibold leading-tight ${
                        !isCurrentMonth ? 'opacity-30' : ''
                      } ${isToday ? 'font-extrabold' : ''}`}
                      style={{
                        color: isToday
                          ? '#10b981'
                          : meta.isPoya
                            ? '#f59e0b'
                            : meta.holiday
                              ? '#06b6d4'
                              : 'var(--text-primary)',
                      }}
                    >
                      {day.getDate()}
                    </span>
                    {isToday && (
                      <div className="absolute bottom-0.5 h-1 w-1 rounded-full bg-emerald-500" />
                    )}
                    {meta.isPoya && isCurrentMonth && (
                      <Moon size={7} className="text-amber-400 mt-0.5" />
                    )}
                    {meta.holiday && !meta.isPoya && isCurrentMonth && (
                      <Star size={7} className="text-cyan-400 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1"><span className="font-bold text-emerald-500">•</span> Today</span>
        <span className="flex items-center gap-1"><Moon size={9} className="text-amber-400" /> Poya Day</span>
        <span className="flex items-center gap-1"><Star size={9} className="text-cyan-400" /> Public Holiday</span>
      </div>

      {/* Selected week info card */}
      <AnimatePresence>
        {selectedMonday && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden rounded-xl border p-3"
            style={{ borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.08)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-emerald-500">Selected Week</p>
              {periodInfo && (
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-extrabold"
                  style={{ backgroundColor: `${periodInfo.color}20`, color: periodInfo.color }}
                >
                  {periodInfo.label}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
              {selectedWeekLabel}
            </p>
            {selectedWeekHolidays.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {selectedWeekHolidays.map((h, i) => (
                  <span key={i} className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-500">
                    {h}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
