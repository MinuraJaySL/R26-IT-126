import { motion } from 'framer-motion';
import { Droplets, Package, Target, BarChart3, Building2, Home, Store, GraduationCap, Umbrella } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import AnimatedCard from '../../components/ui/AnimatedCard';
import ChartCard from '../../components/ui/ChartCard';
import { useTheme } from '../../context/ThemeContext';
import { generateWeeklyComparison, zoneTypeLabels } from '../../utils/predictionEngine';

const ZONE_COLORS = {
  residential: '#10b981',
  market: '#06b6d4',
  school: '#f59e0b',
  office: '#8b5cf6',
  tourist_area: '#ef4444',
};

const ZONE_ICONS = {
  residential: Home,
  market: Store,
  school: GraduationCap,
  office: Building2,
  tourist_area: Umbrella,
};

export default function PredictionResults({ prediction }) {
  const { isDark } = useTheme();

  if (!prediction) {
    return (
      <AnimatedCard className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart3 size={48} style={{ color: 'var(--text-muted)' }} />
        <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No Predictions Yet</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Go to the Predict tab and generate a prediction to see results here.</p>
      </AnimatedCard>
    );
  }

  const weeklyData = generateWeeklyComparison(prediction);

  // Zone breakdown data for chart
  const zoneBreakdownData = Object.entries(prediction.zoneResults).map(([zoneType, result]) => ({
    name: zoneTypeLabels[zoneType] || zoneType,
    wet: result.scaledWet,
    dry: result.scaledDry,
    total: result.scaledTotal,
    color: ZONE_COLORS[zoneType],
    percent: result.contributionPercent,
  }));

  return (
    <div className="space-y-6">
      {/* Next Week Prediction — Hero Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {/* Wet Waste */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 120 }}
          className="group relative overflow-hidden rounded-2xl p-[1px]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2, #06b6d450)' }}
        >
          <div className="relative rounded-2xl px-5 py-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {/* Glow */}
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: '#06b6d4' }} />
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #06b6d430, #06b6d415)' }}>
                <Droplets size={22} className="text-cyan-400" />
              </div>
              <p className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#06b6d4' }}>Next Week Wet Waste</p>
            </div>
            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-4xl font-extrabold tracking-tight text-cyan-400"
            >
              {prediction.totalWet}
              <span className="ml-1.5 text-base font-medium text-cyan-400/60">tons</span>
            </motion.p>
            <p className="mt-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Across all council zones</p>
            <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #06b6d4, #06b6d460, transparent)' }} />
          </div>
        </motion.div>

        {/* Dry Waste */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
          className="group relative overflow-hidden rounded-2xl p-[1px]"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed, #8b5cf650)' }}
        >
          <div className="relative rounded-2xl px-5 py-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: '#8b5cf6' }} />
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #8b5cf630, #8b5cf615)' }}>
                <Package size={22} className="text-violet-400" />
              </div>
              <p className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#8b5cf6' }}>Next Week Dry Waste</p>
            </div>
            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="text-4xl font-extrabold tracking-tight text-violet-400"
            >
              {prediction.totalDry}
              <span className="ml-1.5 text-base font-medium text-violet-400/60">tons</span>
            </motion.p>
            <p className="mt-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Across all council zones</p>
            <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #8b5cf6, #8b5cf660, transparent)' }} />
          </div>
        </motion.div>

        {/* Grand Total */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 120 }}
          className="group relative overflow-hidden rounded-2xl p-[1px]"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669, #10b98150)' }}
        >
          <div className="relative rounded-2xl px-5 py-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: '#10b981' }} />
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #10b98130, #10b98115)' }}>
                <BarChart3 size={22} className="text-emerald-400" />
              </div>
              <p className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#10b981' }}>Next Week Total</p>
            </div>
            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="text-4xl font-extrabold tracking-tight text-emerald-400"
            >
              {prediction.grandTotal}
              <span className="ml-1.5 text-base font-medium text-emerald-400/60">tons</span>
            </motion.p>
            <p className="mt-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Municipal Council Total</p>
            <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #10b981, #10b98160, transparent)' }} />
          </div>
        </motion.div>

        {/* Confidence Score */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 120 }}
          className="group relative overflow-hidden rounded-2xl p-[1px]"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706, #f59e0b50)' }}
        >
          <div className="relative rounded-2xl px-5 py-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: '#f59e0b' }} />
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #f59e0b30, #f59e0b15)' }}>
                <Target size={22} className="text-amber-400" />
              </div>
              <p className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#f59e0b' }}>Confidence Score</p>
            </div>
            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              className="text-4xl font-extrabold tracking-tight text-amber-400"
            >
              {prediction.confidence}
              <span className="ml-0.5 text-2xl font-bold text-amber-400/70">%</span>
            </motion.p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border-color)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${prediction.confidence}%` }}
                  transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}
                />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{prediction.zoneCount} types</span>
            </div>
            <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #f59e0b60, transparent)' }} />
          </div>
        </motion.div>
      </div>

      {/* Zone Breakdown Chart */}
      {/* <ChartCard title="Zone-wise Waste Breakdown" subtitle="Wet & dry waste contribution by zone type (tons)" delay={0.5}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={zoneBreakdownData}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
            <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
            <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: '12px', color: isDark ? '#f1f5f9' : '#0f172a' }} />
            <Legend />
            <Bar dataKey="wet" fill="#06b6d4" radius={[4,4,0,0]} name="Wet Waste">
              {zoneBreakdownData.map((entry, i) => <Cell key={i} fill={entry.color + 'cc'} />)}
            </Bar>
            <Bar dataKey="dry" fill="#8b5cf6" radius={[4,4,0,0]} name="Dry Waste">
              {zoneBreakdownData.map((entry, i) => <Cell key={i} fill={entry.color + '80'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard> */}

      {/* Zone Contribution Table */}
      <AnimatedCard delay={0.6} hover={false} className="overflow-x-auto">
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Zone Contribution Breakdown</h3>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              {['Zone Type', 'Zones', 'Wet (tons)', 'Dry (tons)', 'Total (tons)', 'Contribution'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(prediction.zoneResults).map(([zoneType, result], i) => {
              return (
                <motion.tr key={zoneType} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.05 }}
                  className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                    {zoneTypeLabels[zoneType]}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{result.count}</td>
                  <td className="px-4 py-3 font-semibold text-cyan-500">{result.scaledWet}</td>
                  <td className="px-4 py-3 font-semibold text-violet-500">{result.scaledDry}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: ZONE_COLORS[zoneType] }}>{result.scaledTotal}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border-color)' }}>
                        <div className="h-full rounded-full" style={{ width: `${result.contributionPercent}%`, backgroundColor: ZONE_COLORS[zoneType] }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: ZONE_COLORS[zoneType] }}>{result.contributionPercent}%</span>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {/* Total Row */}
            <tr className="font-bold" style={{ borderTop: '2px solid var(--border-color)' }}>
              <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>Municipal Total</td>
              <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                {Object.values(prediction.zoneResults).reduce((s, r) => s + r.count, 0)}
              </td>
              <td className="px-4 py-3 text-cyan-500">{prediction.totalWet}</td>
              <td className="px-4 py-3 text-violet-500">{prediction.totalDry}</td>
              <td className="px-4 py-3 text-emerald-500">{prediction.grandTotal}</td>
              <td className="px-4 py-3 text-emerald-500">100%</td>
            </tr>
          </tbody>
        </table>
      </AnimatedCard>

      {/* Weekly Comparison Chart */}
      <ChartCard title="Weekly Projection" subtitle="Estimated daily waste distribution across the council" delay={0.7}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
            <XAxis dataKey="day" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
            <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: '12px', color: isDark ? '#f1f5f9' : '#0f172a' }} />
            <Legend />
            <Bar dataKey="wet" fill="#06b6d4" radius={[4,4,0,0]} name="Wet (Current)" />
            <Bar dataKey="dry" fill="#8b5cf6" radius={[4,4,0,0]} name="Dry (Current)" />
            <Bar dataKey="previousWet" fill="#06b6d440" radius={[4,4,0,0]} name="Wet (Previous)" />
            <Bar dataKey="previousDry" fill="#8b5cf640" radius={[4,4,0,0]} name="Dry (Previous)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
