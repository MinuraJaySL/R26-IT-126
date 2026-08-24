import { motion } from 'framer-motion';
import { Droplets, Package, Target, BarChart3, Building, Umbrella, Users, Truck, CloudRain } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AnimatedCard from '../../components/ui/AnimatedCard';
import ChartCard from '../../components/ui/ChartCard';
import { useTheme } from '../../context/ThemeContext';
import { generateWeeklyComparison, zoneTypeLabels, ZONE_COLORS } from '../../utils/predictionEngine';

const ZONE_ICONS = {
  'Kalutara North': Building,
  'Kalutara South': Umbrella,
  'Katukurunda 1': Users,
  'Katukurunda 2': Building,
};

const AREA_TYPE_LABELS = {
  town: 'Town',
  beach: 'Beach',
  muslim_area: 'Muslim Area',
};

export default function PredictionResults({ prediction, truckRequirements, inputsSummary }) {
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

  return (
    <div className="space-y-6">
      {/* Inputs Summary Banner */}
      {inputsSummary && (
        <AnimatedCard delay={0.05} hover={false}>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Prediction Inputs:</span>
            <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">
              {inputsSummary.weekType === 'normal' ? 'Normal Week' : inputsSummary.weekType === 'holiday' ? 'Holiday Week' : 'Festival Week'}
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-500">
              <CloudRain size={12} /> {inputsSummary.rainfallMm}mm rainfall
            </span>
            <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {inputsSummary.monthName} ({inputsSummary.rainfallSource})
            </span>
          </div>
        </AnimatedCard>
      )}

      {/* Hero Cards Row */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {/* Wet Waste */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 120 }}
          className="group relative overflow-hidden rounded-2xl p-[1px]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2, #06b6d450)' }}>
          <div className="relative rounded-2xl px-5 py-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: '#06b6d4' }} />
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #06b6d430, #06b6d415)' }}>
                <Droplets size={22} className="text-cyan-400" />
              </div>
              <p className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#06b6d4' }}>Wet Waste</p>
            </div>
            <motion.p initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
              className="text-4xl font-extrabold tracking-tight text-cyan-400">
              {prediction.totalWet}<span className="ml-1.5 text-base font-medium text-cyan-400/60">tons</span>
            </motion.p>
            <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #06b6d4, #06b6d460, transparent)' }} />
          </div>
        </motion.div>

        {/* Dry Waste */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
          className="group relative overflow-hidden rounded-2xl p-[1px]" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed, #8b5cf650)' }}>
          <div className="relative rounded-2xl px-5 py-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: '#8b5cf6' }} />
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #8b5cf630, #8b5cf615)' }}>
                <Package size={22} className="text-violet-400" />
              </div>
              <p className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#8b5cf6' }}>Dry Waste</p>
            </div>
            <motion.p initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, type: 'spring' }}
              className="text-4xl font-extrabold tracking-tight text-violet-400">
              {prediction.totalDry}<span className="ml-1.5 text-base font-medium text-violet-400/60">tons</span>
            </motion.p>
            <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #8b5cf6, #8b5cf660, transparent)' }} />
          </div>
        </motion.div>

        {/* Grand Total */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, type: 'spring', stiffness: 120 }}
          className="group relative overflow-hidden rounded-2xl p-[1px]" style={{ background: 'linear-gradient(135deg, #10b981, #059669, #10b98150)' }}>
          <div className="relative rounded-2xl px-5 py-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: '#10b981' }} />
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #10b98130, #10b98115)' }}>
                <BarChart3 size={22} className="text-emerald-400" />
              </div>
              <p className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#10b981' }}>Total Waste</p>
            </div>
            <motion.p initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}
              className="text-4xl font-extrabold tracking-tight text-emerald-400">
              {prediction.grandTotal}<span className="ml-1.5 text-base font-medium text-emerald-400/60">tons</span>
            </motion.p>
            <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #10b981, #10b98160, transparent)' }} />
          </div>
        </motion.div>

        {/* Trucks Needed */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, type: 'spring', stiffness: 120 }}
          className="group relative overflow-hidden rounded-2xl p-[1px]" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706, #f59e0b50)' }}>
          <div className="relative rounded-2xl px-5 py-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: '#f59e0b' }} />
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #f59e0b30, #f59e0b15)' }}>
                <Truck size={22} className="text-amber-400" />
              </div>
              <p className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#f59e0b' }}>Trucks Needed</p>
            </div>
            <motion.p initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, type: 'spring' }}
              className="text-4xl font-extrabold tracking-tight text-amber-400">
              {truckRequirements?.totalWithSpare || '—'}
              <span className="ml-1.5 text-base font-medium text-amber-400/60">trucks</span>
            </motion.p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span style={{ color: 'var(--text-muted)' }}>
                {truckRequirements?.trucksNeeded || 0} required + {truckRequirements?.spareTrucks || 1} spare
              </span>
            </div>
            <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #f59e0b60, transparent)' }} />
          </div>
        </motion.div>
      </div>

      {/* Truck Requirements per Zone */}
      {truckRequirements && (
        <AnimatedCard delay={0.5} hover={false}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Fleet Allocation by Zone
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Standard compactor truck capacity: {truckRequirements.truckCapacityTons} tons per truck
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(truckRequirements.perZone || {}).map(([zoneName, info], i) => {
              const color = ZONE_COLORS[zoneName] || '#10b981';
              const Icon = ZONE_ICONS[zoneName] || Building;
              return (
                <motion.div
                  key={zoneName}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.06 }}
                  className="rounded-xl border p-4"
                  style={{ borderColor: `${color}30`, backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={16} style={{ color }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{zoneName}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-extrabold" style={{ color }}>
                        {info.trucksNeeded}
                        <span className="ml-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>truck{info.trucksNeeded !== 1 ? 's' : ''}</span>
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{info.wasteTons} tons</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold" style={{ color }}>{info.truckUtilization}%</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>utilization</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border-color)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${info.truckUtilization}%` }}
                      transition={{ delay: 0.8 + i * 0.06, duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatedCard>
      )}

      {/* Zone Contribution Table */}
      <AnimatedCard delay={0.7} hover={false} className="overflow-x-auto">
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Zone Prediction Breakdown
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              {['Zone Name', 'Area Type', 'Wet (t)', 'Dry (t)', 'Total (t)', 'Trucks', 'Trend', 'Contribution'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(prediction.zoneResults || {}).map(([zoneName, result], i) => {
              const zoneColor = ZONE_COLORS[zoneName] || '#10b981';
              const Icon = ZONE_ICONS[zoneName] || Building;
              const areaLabel = AREA_TYPE_LABELS[result.areaType] || result.areaType || 'Town';
              const zoneTrucks = truckRequirements?.perZone?.[zoneName]?.trucksNeeded || 0;

              return (
                <motion.tr key={zoneName} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.05 }}
                  className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${zoneColor}15` }}>
                        <Icon size={14} style={{ color: zoneColor }} />
                      </div>
                      <span className="font-bold">{zoneName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${zoneColor}15`, color: zoneColor }}>
                      {areaLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-cyan-500">{result.scaledWet}</td>
                  <td className="px-4 py-3 font-semibold text-violet-500">{result.scaledDry}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: zoneColor }}>{result.scaledTotal}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 font-bold text-amber-500">
                      <Truck size={12} /> {zoneTrucks}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${result.wetTrend >= 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                      {result.wetTrend >= 0 ? `↑${result.wetTrend}%` : `↓${Math.abs(result.wetTrend)}%`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border-color)' }}>
                        <div className="h-full rounded-full" style={{ width: `${result.contributionPercent}%`, backgroundColor: zoneColor }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: zoneColor }}>{result.contributionPercent}%</span>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {/* Total Row */}
            <tr className="font-bold" style={{ borderTop: '2px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
              <td className="px-4 py-3.5" style={{ color: 'var(--text-primary)' }}>Municipal Total</td>
              <td className="px-4 py-3.5" style={{ color: 'var(--text-muted)' }}>4 Zones</td>
              <td className="px-4 py-3.5 text-cyan-500">{prediction.totalWet} t</td>
              <td className="px-4 py-3.5 text-violet-500">{prediction.totalDry} t</td>
              <td className="px-4 py-3.5 text-emerald-500 text-base">{prediction.grandTotal} t</td>
              <td className="px-4 py-3.5 text-amber-500">
                <span className="flex items-center gap-1"><Truck size={12} /> {truckRequirements?.totalWithSpare || '—'}</span>
              </td>
              <td className="px-4 py-3.5" style={{ color: 'var(--text-muted)' }}>—</td>
              <td className="px-4 py-3.5 text-emerald-500">100%</td>
            </tr>
          </tbody>
        </table>
      </AnimatedCard>

      {/* Weekly Projection Chart */}
      <ChartCard title="Weekly Projection" subtitle="Estimated daily waste distribution across the council" delay={0.9}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
            <XAxis dataKey="day" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
            <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: '12px', color: isDark ? '#f1f5f9' : '#0f172a' }} />
            <Legend />
            <Bar dataKey="wet" fill="#06b6d4" radius={[4,4,0,0]} name="Wet Waste" />
            <Bar dataKey="dry" fill="#8b5cf6" radius={[4,4,0,0]} name="Dry Waste" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
