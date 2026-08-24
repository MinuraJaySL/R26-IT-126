import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, CloudRain, Calendar, CalendarDays, Sparkles,
  Building, Umbrella, Users, Droplets, Package, Loader2,
  Truck, Zap, RefreshCw, CheckCircle, AlertCircle,
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import { fetchRainfallForecast, fetchPreviousWeekData } from '../../utils/api';

const ZONE_INFO = [
  { key: 'Kalutara North', icon: Building, color: '#10b981', areaLabel: 'Town' },
  { key: 'Kalutara South', icon: Umbrella, color: '#06b6d4', areaLabel: 'Beach' },
  { key: 'Katukurunda 1', icon: Users, color: '#f59e0b', areaLabel: 'Muslim Area' },
  { key: 'Katukurunda 2', icon: Building, color: '#8b5cf6', areaLabel: 'Town' },
];

const weekTypes = [
  { value: 'normal', label: 'Normal Week', description: 'Standard collection schedule', icon: CalendarDays },
  { value: 'holiday', label: 'Holiday Week', description: 'Public or school holidays', icon: Sparkles },
  { value: 'festival', label: 'Festival Week', description: 'Cultural, religious or local events', icon: Zap },
];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PredictionInputPanel({ onPredict, loading }) {
  const [weekType, setWeekType] = useState('normal');
  const [rainfall, setRainfall] = useState(null);
  const [rainfallLoading, setRainfallLoading] = useState(true);
  const [rainfallError, setRainfallError] = useState(null);
  const [prevWeek, setPrevWeek] = useState(null);
  const [prevWeekLoading, setPrevWeekLoading] = useState(true);

  // Auto-determine next week's month
  const nextWeekDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = months[nextWeekDate.getMonth()];
  const nextMonthNum = nextWeekDate.getMonth() + 1;
  const isMonsoon = nextMonthNum >= 5 && nextMonthNum <= 10;

  // Fetch rainfall on mount
  useEffect(() => {
    loadRainfall();
    loadPreviousWeek();
  }, []);

  const loadRainfall = async () => {
    setRainfallLoading(true);
    setRainfallError(null);
    try {
      const data = await fetchRainfallForecast();
      setRainfall(data);
    } catch (err) {
      setRainfallError(err.message);
      setRainfall({ total_mm: 20, success: false, daily: [] });
    } finally {
      setRainfallLoading(false);
    }
  };

  const loadPreviousWeek = async () => {
    setPrevWeekLoading(true);
    try {
      const data = await fetchPreviousWeekData();
      setPrevWeek(data.zones || {});
    } catch {
      setPrevWeek(null);
    } finally {
      setPrevWeekLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onPredict({ weekType });
  };

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
              <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                Automated next-week waste prediction powered by XGBoost ML models
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-emerald-500">4</p>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Zones</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-cyan-500">{nextMonth.slice(0, 3)}</p>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Next Week</p>
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
        {/* LEFT: Week Type Selection (only user input) */}
        <AnimatedCard delay={0.1} hover={false}>
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Calendar size={18} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Next Week Type
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Select the type of upcoming week
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {weekTypes.map((wt) => {
              const isSelected = weekType === wt.value;
              const Icon = wt.icon;
              return (
                <button
                  key={wt.value}
                  type="button"
                  onClick={() => setWeekType(wt.value)}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                      : 'border-transparent hover:border-emerald-500/20'
                  }`}
                  style={!isSelected ? { backgroundColor: 'var(--bg-tertiary)' } : {}}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isSelected ? 'bg-emerald-500/20' : 'bg-surface-100 dark:bg-surface-700/50'
                    }`}>
                      <Icon size={20} className={isSelected ? 'text-emerald-500' : ''} style={!isSelected ? { color: 'var(--text-muted)' } : {}} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : ''}`} style={!isSelected ? { color: 'var(--text-primary)' } : {}}>
                        {wt.label}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{wt.description}</p>
                    </div>
                    {isSelected && <CheckCircle size={20} className="text-emerald-500 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Auto-derived info */}
          <div className="mt-5 space-y-2.5 rounded-xl border p-3.5 text-xs" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Prediction Month</span>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {nextMonth} {nextWeekDate.getFullYear()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Special Event</span>
              <span className={`font-bold ${weekType === 'festival' ? 'text-amber-500' : ''}`} style={weekType !== 'festival' ? { color: 'var(--text-secondary)' } : {}}>
                {weekType === 'festival' ? 'Yes (auto)' : 'No'}
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

        {/* CENTER: Rainfall Forecast (auto-fetched) */}
        <AnimatedCard delay={0.15} hover={false}>
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
                  Auto-fetched via Open-Meteo API
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadRainfall}
              disabled={rainfallLoading}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-cyan-500 transition hover:bg-cyan-500/10"
              title="Refresh forecast"
            >
              <RefreshCw size={14} className={rainfallLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {rainfallLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-cyan-500" />
              <p className="mt-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Fetching weather data...</p>
            </div>
          ) : (
            <>
              {/* Total rainfall hero */}
              <div className="mb-4 rounded-xl p-4 text-center" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(6,182,212,0.05))' }}>
                <p className="text-3xl font-extrabold text-cyan-500">
                  {rainfall?.total_mm || 0}
                  <span className="ml-1 text-sm font-medium text-cyan-400/60">mm</span>
                </p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Next 7-day total precipitation
                </p>
              </div>

              {/* Daily breakdown */}
              {rainfall?.daily && rainfall.daily.length > 0 && (
                <div className="space-y-1.5">
                  {rainfall.daily.map((day, i) => {
                    const maxPrecip = Math.max(...rainfall.daily.map(d => d.precipitation_mm), 1);
                    const pct = (day.precipitation_mm / maxPrecip) * 100;
                    const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-24 font-medium" style={{ color: 'var(--text-secondary)' }}>{dayName}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.2 + i * 0.05, duration: 0.4 }}
                            className="h-full rounded-full bg-cyan-500"
                          />
                        </div>
                        <span className="w-12 text-right font-bold text-cyan-500">{day.precipitation_mm}mm</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Source badge */}
              <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                {rainfall?.success ? (
                  <><CheckCircle size={12} className="text-emerald-500" /> Live data from Open-Meteo</>
                ) : (
                  <><AlertCircle size={12} className="text-amber-500" /> Using fallback estimate</>
                )}
              </div>
            </>
          )}
        </AnimatedCard>

        {/* RIGHT: Previous Week Data (auto-loaded from CSV) */}
        <AnimatedCard delay={0.2} hover={false}>
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
                  <div
                    key={zone.key}
                    className="rounded-xl p-3 transition-all"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
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

              {/* Total */}
              {prevWeek && (
                <div className="flex items-center justify-between rounded-xl border p-3 text-xs font-bold" style={{ borderColor: 'var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Previous Week Total</span>
                  <span className="text-sm text-emerald-500">
                    {Object.values(prevWeek).reduce((s, z) => s + (z.previousWet || 0) + (z.previousDry || 0), 0).toFixed(1)}t
                  </span>
                </div>
              )}
            </div>
          )}
        </AnimatedCard>
      </div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center pt-2"
      >
        <button
          type="submit"
          disabled={loading || rainfallLoading}
          className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 px-12 py-4 text-base sm:text-lg font-bold text-white shadow-xl shadow-green-600/25 transition-all hover:scale-[1.02] hover:shadow-green-600/35 active:scale-95 ${
            loading || rainfallLoading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span>Fetching Weather & Running ML Models...</span>
            </>
          ) : (
            <>
              <Truck size={22} />
              <span>Predict Waste & Fleet Requirements</span>
            </>
          )}
        </button>
      </motion.div>
    </form>
  );
}
