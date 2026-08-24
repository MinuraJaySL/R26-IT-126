import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  GitCompare, Loader2, AlertCircle, CheckCircle, Building,
  Umbrella, Users, Filter, TrendingUp, Target, BarChart3,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter, ReferenceLine,
} from 'recharts';
import AnimatedCard from '../../components/ui/AnimatedCard';
import { fetchBacktest } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';

const ZONES = ['All Zones', 'Kalutara North', 'Kalutara South', 'Katukurunda 1', 'Katukurunda 2'];
const ZONE_COLORS = {
  'Kalutara North': '#10b981',
  'Kalutara South': '#06b6d4',
  'Katukurunda 1': '#f59e0b',
  'Katukurunda 2': '#8b5cf6',
};
const ZONE_ICONS = {
  'Kalutara North': Building,
  'Kalutara South': Umbrella,
  'Katukurunda 1': Users,
  'Katukurunda 2': Building,
};

// Custom tooltip for line chart
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border p-3 shadow-xl text-xs" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', minWidth: 180 }}>
      <p className="mb-2 font-bold" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold" style={{ color: p.color }}>{Number(p.value).toFixed(2)} t</span>
        </div>
      ))}
    </div>
  );
}

// Accuracy badge
function AccBadge({ value }) {
  const color = value >= 90 ? '#10b981' : value >= 80 ? '#f59e0b' : '#ef4444';
  return (
    <span className="rounded-lg px-2 py-0.5 text-xs font-extrabold" style={{ backgroundColor: `${color}15`, color }}>
      {value}%
    </span>
  );
}

export default function ModelValidation() {
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedZone, setSelectedZone] = useState('All Zones');
  const [wasteType, setWasteType] = useState('wet'); // 'wet' | 'dry' | 'total'

  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#fff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '12px',
    color: isDark ? '#f1f5f9' : '#0f172a',
  };
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const axisColor = isDark ? '#94a3b8' : '#64748b';

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBacktest({ limit: 200 });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter rows by selected zone
  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (selectedZone === 'All Zones') return data.rows;
    return data.rows.filter(r => r.zone === selectedZone);
  }, [data, selectedZone]);

  // Build time-series data — group by weekDate (sum zones if All Zones)
  const timeSeriesData = useMemo(() => {
    const map = {};
    filteredRows.forEach(r => {
      if (!map[r.weekDate]) {
        map[r.weekDate] = { weekDate: r.weekDate, actualWet: 0, predictedWet: 0, actualDry: 0, predictedDry: 0, actualTotal: 0, predictedTotal: 0 };
      }
      map[r.weekDate].actualWet += r.actualWet;
      map[r.weekDate].predictedWet += r.predictedWet;
      map[r.weekDate].actualDry += r.actualDry;
      map[r.weekDate].predictedDry += r.predictedDry;
      map[r.weekDate].actualTotal += r.actualTotal;
      map[r.weekDate].predictedTotal += r.predictedTotal;
    });
    return Object.values(map)
      .sort((a, b) => a.weekDate.localeCompare(b.weekDate))
      .map(d => ({
        ...d,
        actualWet: +d.actualWet.toFixed(2),
        predictedWet: +d.predictedWet.toFixed(2),
        actualDry: +d.actualDry.toFixed(2),
        predictedDry: +d.predictedDry.toFixed(2),
        actualTotal: +d.actualTotal.toFixed(2),
        predictedTotal: +d.predictedTotal.toFixed(2),
        label: d.weekDate.slice(5), // MM-DD
      }));
  }, [filteredRows]);

  // Build scatter data
  const scatterData = useMemo(() => {
    return filteredRows.map(r => ({
      actual: wasteType === 'wet' ? r.actualWet : wasteType === 'dry' ? r.actualDry : r.actualTotal,
      predicted: wasteType === 'wet' ? r.predictedWet : wasteType === 'dry' ? r.predictedDry : r.predictedTotal,
      zone: r.zone,
      weekType: r.weekType,
    }));
  }, [filteredRows, wasteType]);

  // Scatter color by zone
  const scatterByZone = useMemo(() => {
    const zones = {};
    scatterData.forEach(d => {
      if (!zones[d.zone]) zones[d.zone] = [];
      zones[d.zone].push({ x: d.actual, y: d.predicted });
    });
    return zones;
  }, [scatterData]);

  const actualKey = wasteType === 'wet' ? 'actualWet' : wasteType === 'dry' ? 'actualDry' : 'actualTotal';
  const predKey   = wasteType === 'wet' ? 'predictedWet' : wasteType === 'dry' ? 'predictedDry' : 'predictedTotal';
  const wasteLabel = wasteType === 'wet' ? 'Wet Waste' : wasteType === 'dry' ? 'Dry Waste' : 'Total Waste';

  if (loading) {
    return (
      <AnimatedCard className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 size={48} className="animate-spin text-emerald-500" />
        <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Loading Validation Data...</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Running model on held-out test set (May – Dec 2025)...</p>
      </AnimatedCard>
    );
  }

  if (error) {
    return (
      <AnimatedCard className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle size={48} className="text-red-400" />
        <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Failed to Load Validation</h3>
        <p className="mt-2 text-sm text-red-400">{error}</p>
        <button onClick={load} className="mt-4 rounded-xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500 active:scale-95 transition-all">Retry</button>
      </AnimatedCard>
    );
  }

  const summary = data?.summary;
  const zoneMetrics = data?.zoneMetrics || {};

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <AnimatedCard delay={0.05} hover={false}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <GitCompare size={22} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Model Validation — Actual vs Predicted
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Held-out test set: {summary?.testSplit} · Training set: {summary?.trainingSplit}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            <CheckCircle size={14} className="text-emerald-500" />
            No data leakage — model never saw test data during training
          </div>
        </div>
      </AnimatedCard>

      {/* Overall Accuracy Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Wet Model Accuracy', value: summary?.wetModel?.accuracy, sub: `MAPE: ${summary?.wetModel?.mape}%`, color: '#06b6d4' },
          { label: 'Dry Model Accuracy', value: summary?.dryModel?.accuracy, sub: `MAPE: ${summary?.dryModel?.mape}%`, color: '#8b5cf6' },
          { label: 'Wet Model R²', value: `${(summary?.wetModel?.r2 * 100 || 0).toFixed(1)}%`, sub: `R² = ${summary?.wetModel?.r2}`, color: '#06b6d4', raw: true },
          { label: 'Dry Model R²', value: `${(summary?.dryModel?.r2 * 100 || 0).toFixed(1)}%`, sub: `R² = ${summary?.dryModel?.r2}`, color: '#8b5cf6', raw: true },
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
            className="rounded-2xl border p-4 text-center" style={{ borderColor: `${card.color}30`, backgroundColor: 'var(--bg-secondary)' }}>
            <p className="mb-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
            <p className="text-2xl font-extrabold" style={{ color: card.color }}>
              {card.raw ? card.value : `${card.value}%`}
            </p>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <AnimatedCard delay={0.2} hover={false}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Zone filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Zone:</span>
          </div>
          {ZONES.map(z => (
            <button key={z} onClick={() => setSelectedZone(z)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${selectedZone === z ? 'bg-emerald-600 text-white' : 'hover:bg-emerald-500/10'}`}
              style={selectedZone !== z ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' } : {}}>
              {z}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Show:</span>
            {[['wet', 'Wet Waste'], ['dry', 'Dry Waste'], ['total', 'Total']].map(([v, l]) => (
              <button key={v} onClick={() => setWasteType(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${wasteType === v ? 'bg-violet-600 text-white' : 'hover:bg-violet-500/10'}`}
                style={wasteType !== v ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' } : {}}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </AnimatedCard>

      {/* Time Series Chart — Actual vs Predicted over weeks */}
      <AnimatedCard delay={0.3} hover={false}>
        <div className="mb-4">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {wasteLabel}: Actual vs Predicted over Time
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Each point is a real week from the test set. Closer the lines = better accuracy.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="label" stroke={axisColor} fontSize={11} tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(timeSeriesData.length / 8))} />
            <YAxis stroke={axisColor} fontSize={11} unit="t" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone" dataKey={actualKey} name={`Actual ${wasteLabel}`}
              stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }}
            />
            <Line
              type="monotone" dataKey={predKey} name={`Predicted ${wasteLabel}`}
              stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Green = Actual recorded data · Orange dashed = Model prediction · Test period: May – Dec 2025
        </p>
      </AnimatedCard>

      {/* Scatter Plot — Perfect model = dots on diagonal line */}
      <AnimatedCard delay={0.35} hover={false}>
        <div className="mb-4">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Scatter Plot — Actual vs Predicted ({wasteLabel})
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            If dots cluster along the diagonal (y = x line), the model is accurate. Deviation = prediction error.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="x" name="Actual" stroke={axisColor} fontSize={11} unit="t" label={{ value: 'Actual (tons)', position: 'insideBottom', offset: -5, fill: axisColor, fontSize: 11 }} />
            <YAxis dataKey="y" name="Predicted" stroke={axisColor} fontSize={11} unit="t" label={{ value: 'Predicted (tons)', angle: -90, position: 'insideLeft', fill: axisColor, fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle}
              formatter={(val, name) => [`${Number(val).toFixed(2)} t`, name]} />
            {/* Perfect prediction line y = x */}
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 70, y: 70 }]}
              stroke="#10b981" strokeDasharray="8 4" strokeWidth={1.5}
              label={{ value: 'Perfect (y=x)', fill: '#10b981', fontSize: 10 }}
            />
            {Object.entries(scatterByZone).map(([zone, points]) => (
              <Scatter
                key={zone}
                name={zone}
                data={points}
                fill={ZONE_COLORS[zone] || '#10b981'}
                opacity={0.7}
                r={5}
              />
            ))}
            <Legend />
          </ScatterChart>
        </ResponsiveContainer>
        <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Green diagonal line = perfect prediction (actual = predicted). Dots close to this line = model is accurate.
        </p>
      </AnimatedCard>

      {/* Per-Zone Accuracy Table */}
      <AnimatedCard delay={0.4} hover={false} className="overflow-x-auto">
        <h3 className="mb-4 text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Per-Zone Accuracy Metrics
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              {['Zone', 'Area Type', 'Samples', 'Wet Accuracy', 'Wet R²', 'Wet MAE', 'Dry Accuracy', 'Dry R²', 'Dry MAE'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(zoneMetrics).map(([zone, m], i) => {
              const color = ZONE_COLORS[zone] || '#10b981';
              const Icon = ZONE_ICONS[zone] || Building;
              return (
                <motion.tr key={zone} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                  className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="px-4 py-3 font-bold" style={{ color: 'var(--text-primary)' }}>
                    <div className="flex items-center gap-2"><Icon size={14} style={{ color }} />{zone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${color}15`, color }}>
                      {m.wet?.r2 ? (ZONE_ICONS[zone] === Umbrella ? 'Beach' : zone === 'Katukurunda 1' ? 'Muslim Area' : 'Town') : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{m.sampleCount}</td>
                  <td className="px-4 py-3"><AccBadge value={m.wet?.accuracy} /></td>
                  <td className="px-4 py-3 font-semibold text-cyan-500">{m.wet?.r2}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{m.wet?.mae} t</td>
                  <td className="px-4 py-3"><AccBadge value={m.dry?.accuracy} /></td>
                  <td className="px-4 py-3 font-semibold text-violet-500">{m.dry?.r2}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{m.dry?.mae} t</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </AnimatedCard>

      {/* Side-by-side sample rows table */}
      <AnimatedCard delay={0.5} hover={false} className="overflow-x-auto">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-emerald-500" />
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Week-by-Week: Actual vs Predicted (sample)
          </h3>
        </div>
        <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Showing {Math.min(filteredRows.length, 30)} of {filteredRows.length} test records. Green = low error, Red = high error.
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              {['Week', 'Zone', 'Type', 'Actual Wet', 'Pred Wet', 'Err%', 'Actual Dry', 'Pred Dry', 'Err%'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.slice(0, 30).map((row, i) => {
              const zColor = ZONE_COLORS[row.zone] || '#10b981';
              const wetErrColor = row.wetError <= 10 ? '#10b981' : row.wetError <= 20 ? '#f59e0b' : '#ef4444';
              const dryErrColor = row.dryError <= 10 ? '#10b981' : row.dryError <= 20 ? '#f59e0b' : '#ef4444';
              return (
                <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * Math.min(i, 10) }}
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                  className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50">
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{row.weekDate}</td>
                  <td className="px-3 py-2 font-semibold" style={{ color: zColor }}>{row.zone}</td>
                  <td className="px-3 py-2">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: row.weekType === 'holiday' ? '#10b98115' : row.weekType === 'festival' ? '#f59e0b15' : 'var(--bg-tertiary)',
                               color: row.weekType === 'holiday' ? '#10b981' : row.weekType === 'festival' ? '#f59e0b' : 'var(--text-muted)' }}>
                      {row.weekType}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-semibold text-cyan-500">{row.actualWet}</td>
                  <td className="px-3 py-2 font-semibold" style={{ color: '#06b6d4' }}>{row.predictedWet}</td>
                  <td className="px-3 py-2 font-bold" style={{ color: wetErrColor }}>{row.wetError}%</td>
                  <td className="px-3 py-2 font-semibold text-violet-500">{row.actualDry}</td>
                  <td className="px-3 py-2 font-semibold" style={{ color: '#7c3aed' }}>{row.predictedDry}</td>
                  <td className="px-3 py-2 font-bold" style={{ color: dryErrColor }}>{row.dryError}%</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </AnimatedCard>
    </div>
  );
}
