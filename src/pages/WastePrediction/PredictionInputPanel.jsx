import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, CloudRain, Calendar, CalendarDays, Sparkles,
  Building, Umbrella, Users, Droplets, Package, Loader2,
  Truck, Zap, RefreshCw, CheckCircle, AlertCircle,
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import WeekPicker from './WeekPicker';
import { fetchRainfallForecast, fetchPreviousWeekData } from '../../utils/api';

const ZONE_INFO = [
  { key: 'Kalutara North', icon: Building, color: '#10b981', areaLabel: 'Town' },
  { key: 'Kalutara South', icon: Umbrella, color: '#06b6d4', areaLabel: 'Beach' },
  { key: 'Katukurunda 1', icon: Users, color: '#f59e0b', areaLabel: 'Muslim Area' },
  { key: 'Katukurunda 2', icon: Building, color: '#8b5cf6', areaLabel: 'Town' },
];

const weekTypes = [
  { value: 'normal', label: 'Normal Week', description: 'Standard collection schedule', icon: CalendarDays },
  { value: 'holiday', label: 'Holiday / Poya', description: 'Public holiday or Poya day in the week', icon: Sparkles },
  { value: 'festival', label: 'Festival Week', description: 'Cultural, religious or local events', icon: Zap },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Utility: get next Monday from today
function getNextMonday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return d;
}

// Format Date → YYYY-MM-DD
function toISO(date) {
  return date.toISOString().slice(0, 10);
}

// Check if week is within Open-Meteo forecast window (16 days)
function isWithinForecast(monday) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((monday - today) / 86400000);
  return days <= 15;
}

export default function PredictionInputPanel({ onPredict, loading }) {
  const [weekType, setWeekType] = useState('normal');
  const [selectedMonday, setSelectedMonday] = useState(() => getNextMonday());
  const [showCalendar, setShowCalendar] = useState(false);

  const [rainfall, setRainfall] = useState(null);
  const [rainfallLoading, setRainfallLoading] = useState(true);
  const [rainfallError, setRainfallError] = useState(null);
  const [prevWeek, setPrevWeek] = useState(null);
  const [prevWeekLoading, setPrevWeekLoading] = useState(true);

  const weekEnd = new Date(selectedMonday);
  weekEnd.setDate(selectedMonday.getDate() + 6);
  const month = selectedMonday.getMonth();
  const monthName = MONTHS[month];
  const isMonsoon = (month + 1) >= 5 && (month + 1) <= 10;
  const liveData = isWithinForecast(selectedMonday);

  // Fetch rainfall and prior week data whenever selected week changes
  useEffect(() => {
    loadRainfall();
    loadPreviousWeek();
  }, [selectedMonday]);

  const loadRainfall = async () => {
    setRainfallLoading(true);
    setRainfallError(null);
    try {
      const data = await fetchRainfallForecast(toISO(selectedMonday));
      setRainfall(data);
    } catch (err) {
      setRainfallError(err.message);
      setRainfall({ total_mm: 20, success: false, daily: [], sourceType: 'fallback' });
    } finally {
      setRainfallLoading(false);
    }
  };

  const loadPreviousWeek = async () => {
    setPrevWeekLoading(true);
    try {
      const data = await fetchPreviousWeekData(toISO(selectedMonday));
      setPrevWeek(data.zones || {});
    } catch {
      setPrevWeek(null);
    } finally {
      setPrevWeekLoading(false);
    }
  };

  const handleWeekChange = (monday, suggestedType) => {
    setSelectedMonday(monday);
    setWeekType(suggestedType);
    setShowCalendar(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onPredict({ weekType, weekStartDate: toISO(selectedMonday) });
  };

  const weekLabel = `${selectedMonday.toLocaleDateString('en-LK', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Council Header */}
      <AnimatedCard delay={0.05} hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 text-white shadow-md shadow-green-700/20">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Kalutara Municipal Council
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Weekly waste prediction powered by XGBoost ML models
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-emerald-500">4</p>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Zones</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-cyan-500">{monthName.slice(0, 3)}</p>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                {selectedMonday.getFullYear()}
              </p>
            </div>
            {isMonsoon && (
              <div className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-500">
                Monsoon
              </div>
            )}
          </div>
        </div>
      </AnimatedCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT: Week Selector + Week Type */}
        <div className="space-y-4">
          {/* Week Date Picker */}
          <AnimatedCard delay={0.1} hover={false}>
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Calendar size={18} className="text-emerald-500" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Select Week
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Pick any week to predict for
                </p>
              </div>
            </div>

            {/* Selected week display / toggle */}
            <button
              type="button"
              onClick={() => setShowCalendar(v => !v)}
              className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                showCalendar ? 'border-emerald-500 bg-emerald-500/10' : 'hover:border-emerald-500/30'
              }`}
              style={{ borderColor: showCalendar ? '#10b981' : 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-500">Selected Week</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {weekLabel}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {monthName} {selectedMonday.getFullYear()} · Click to change
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {rainfall?.sourceType === 'historical_actual' ? (
                    <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-cyan-500/10 text-cyan-500">Dataset</span>
                  ) : liveData ? (
                    <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-500">Live</span>
                  ) : (
                    <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-500">Avg</span>
                  )}
                  <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </button>

            {/* Calendar dropdown */}
            {showCalendar && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-xl border p-3"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}
              >
                <WeekPicker
                  selectedMonday={selectedMonday}
                  onChange={handleWeekChange}
                />
              </motion.div>
            )}

            {/* Auto-derived info */}
            <div className="mt-3 space-y-2 rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Month</span>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{monthName} {selectedMonday.getFullYear()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Rainfall Source</span>
                <span className={`font-bold ${
                  rainfall?.sourceType === 'historical_actual'
                    ? 'text-cyan-500'
                    : liveData
                      ? 'text-emerald-500'
                      : 'text-amber-500'
                }`}>
                  {rainfall?.sourceType === 'historical_actual'
                    ? 'Recorded Dataset'
                    : liveData
                      ? 'Live Forecast'
                      : 'Historical Monthly Avg'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Season</span>
                <span className={`font-bold ${isMonsoon ? 'text-cyan-500' : ''}`} style={!isMonsoon ? { color: 'var(--text-secondary)' } : {}}>
                  {isMonsoon ? 'Monsoon' : 'Dry Season'}
                </span>
              </div>
            </div>
          </AnimatedCard>

          {/* Week Type */}
          <AnimatedCard delay={0.15} hover={false}>
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <CalendarDays size={18} className="text-violet-500" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Week Type
                </h3>
              </div>
            </div>
            <div className="space-y-2">
              {weekTypes.map((wt) => {
                const isSelected = weekType === wt.value;
                const Icon = wt.icon;
                return (
                  <button
                    key={wt.value}
                    type="button"
                    onClick={() => setWeekType(wt.value)}
                    className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                      isSelected ? 'border-emerald-500 bg-emerald-500/10' : 'border-transparent hover:border-emerald-500/20'
                    }`}
                    style={!isSelected ? { backgroundColor: 'var(--bg-tertiary)' } : {}}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isSelected ? 'bg-emerald-500/20' : ''}`}
                        style={!isSelected ? { backgroundColor: 'var(--bg-secondary)' } : {}}>
                        <Icon size={16} className={isSelected ? 'text-emerald-500' : ''} style={!isSelected ? { color: 'var(--text-muted)' } : {}} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-bold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                          style={!isSelected ? { color: 'var(--text-primary)' } : {}}>
                          {wt.label}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{wt.description}</p>
                      </div>
                      {isSelected && <CheckCircle size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </AnimatedCard>
        </div>

        {/* CENTER: Rainfall Forecast */}
        <AnimatedCard delay={0.2} hover={false}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
                <CloudRain size={18} className="text-cyan-500" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Rainfall Forecast
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {liveData ? 'Open-Meteo Live API' : 'Historical Monthly Average'}
                </p>
              </div>
            </div>
            <button type="button" onClick={loadRainfall} disabled={rainfallLoading}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-cyan-500 transition hover:bg-cyan-500/10">
              <RefreshCw size={14} className={rainfallLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {rainfallLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-cyan-500" />
              <p className="mt-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {liveData ? 'Fetching live forecast...' : 'Loading historical average...'}
              </p>
            </div>
          ) : (
            <>
              {/* Source badge */}
              <div className={`mb-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                rainfall?.sourceType === 'forecast'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : rainfall?.sourceType === 'historical_actual'
                    ? 'bg-cyan-500/10 text-cyan-500'
                    : 'bg-amber-500/10 text-amber-500'
              }`}>
                {rainfall?.sourceType === 'forecast' || rainfall?.sourceType === 'historical_actual' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                {rainfall?.source}
              </div>

              {/* Total rainfall hero */}
              <div className="mb-4 rounded-xl p-4 text-center" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(6,182,212,0.05))' }}>
                <p className="text-3xl font-extrabold text-cyan-500">
                  {rainfall?.total_mm || 0}
                  <span className="ml-1 text-sm font-medium text-cyan-400/60">mm</span>
                </p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {weekLabel}
                </p>
              </div>

              {/* Daily breakdown bars */}
              {rainfall?.daily && rainfall.daily.length > 0 && (
                <div className="space-y-1.5">
                  {rainfall.daily.map((day, i) => {
                    const maxPrecip = Math.max(...rainfall.daily.map(d => d.precipitation_mm), 1);
                    const pct = (day.precipitation_mm / maxPrecip) * 100;
                    const dayName = new Date(day.date).toLocaleDateString('en-LK', { weekday: 'short', day: 'numeric', month: 'short' });
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-24 font-medium" style={{ color: 'var(--text-secondary)' }}>{dayName}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.15 + i * 0.05, duration: 0.4 }}
                            className="h-full rounded-full bg-cyan-500"
                          />
                        </div>
                        <span className="w-12 text-right font-bold text-cyan-500">{day.precipitation_mm}mm</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {rainfall?.note && (
                <p className="mt-3 text-[10px] italic" style={{ color: 'var(--text-muted)' }}>{rainfall.note}</p>
              )}
            </>
          )}
        </AnimatedCard>

        {/* RIGHT: Previous Week Data */}
        <AnimatedCard delay={0.25} hover={false}>
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
              <Package size={18} className="text-violet-500" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Previous Week Data
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Auto-loaded from historical dataset
              </p>
            </div>
          </div>

          {prevWeekLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-violet-500" />
              <p className="mt-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Loading zone data...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ZONE_INFO.map((zone) => {
                const Icon = zone.icon;
                const data = prevWeek?.[zone.key];
                const wet = data?.previousWet || 0;
                const dry = data?.previousDry || 0;
                const total = wet + dry;
                return (
                  <div key={zone.key} className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon size={14} style={{ color: zone.color }} />
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{zone.key}</span>
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${zone.color}15`, color: zone.color }}>
                          {zone.areaLabel}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold" style={{ color: zone.color }}>{total.toFixed(1)}t</span>
                    </div>
                    <div className="flex gap-4 text-[11px]">
                      <div className="flex items-center gap-1">
                        <Droplets size={10} className="text-cyan-500" />
                        <span style={{ color: 'var(--text-muted)' }}>Wet:</span>
                        <span className="font-bold text-cyan-500">{wet}t</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package size={10} className="text-violet-500" />
                        <span style={{ color: 'var(--text-muted)' }}>Dry:</span>
                        <span className="font-bold text-violet-500">{dry}t</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {prevWeek && (
                <div className="flex items-center justify-between rounded-xl border p-3 text-xs font-bold" style={{ borderColor: 'var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Council Total (prev. week)</span>
                  <span className="text-sm text-emerald-500">
                    {Object.values(prevWeek).reduce((s, z) => s + (z.previousWet || 0) + (z.previousDry || 0), 0).toFixed(1)}t
                  </span>
                </div>
              )}
            </div>
          )}
        </AnimatedCard>
      </div>

      {/* Submit */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="flex justify-center pt-2">
        <button
          type="submit"
          disabled={loading || rainfallLoading}
          className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 px-12 py-4 text-base sm:text-lg font-bold text-white shadow-xl shadow-green-600/25 transition-all hover:scale-[1.02] hover:shadow-green-600/35 active:scale-95 ${
            loading || rainfallLoading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <><Loader2 size={22} className="animate-spin" /><span>Running ML Prediction...</span></>
          ) : (
            <><Truck size={22} /><span>Predict Week of {weekLabel}</span></>
          )}
        </button>
      </motion.div>
    </form>
  );
}
