import { motion } from 'framer-motion';
import { Droplets, Package, TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AnimatedCard from '../../components/ui/AnimatedCard';
import ChartCard from '../../components/ui/ChartCard';
import { useTheme } from '../../context/ThemeContext';
import { generateWeeklyComparison } from '../../utils/predictionEngine';

export default function PredictionResults({ prediction, formInputs }) {
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
  const zoneLabel = formInputs?.zoneType?.replace('_', ' ') || 'Unknown';

  return (
    <div className="space-y-6">
      {/* Prediction Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnimatedCard delay={0.1} className="relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
              <Droplets size={24} className="text-cyan-500" />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Predicted Wet Waste</p>
              <motion.p initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-cyan-500">{prediction.wetWaste} <span className="text-sm font-normal">tons</span></motion.p>
            </div>
          </div>
          {prediction.wetTrend !== 0 && (
            <div className={`mt-3 flex items-center gap-1 text-sm font-medium ${prediction.wetTrend > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {prediction.wetTrend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{prediction.wetTrend > 0 ? '+' : ''}{prediction.wetTrend}% vs previous</span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 h-1 w-full" style={{ background: 'linear-gradient(90deg, #06b6d4, #06b6d440)' }} />
        </AnimatedCard>

        <AnimatedCard delay={0.2} className="relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
              <Package size={24} className="text-violet-500" />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Predicted Dry Waste</p>
              <motion.p initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-violet-500">{prediction.dryWaste} <span className="text-sm font-normal">tons</span></motion.p>
            </div>
          </div>
          {prediction.dryTrend !== 0 && (
            <div className={`mt-3 flex items-center gap-1 text-sm font-medium ${prediction.dryTrend > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {prediction.dryTrend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{prediction.dryTrend > 0 ? '+' : ''}{prediction.dryTrend}% vs previous</span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 h-1 w-full" style={{ background: 'linear-gradient(90deg, #8b5cf6, #8b5cf640)' }} />
        </AnimatedCard>

        <AnimatedCard delay={0.3} className="relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <BarChart3 size={24} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Waste</p>
              <motion.p initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
                className="text-3xl font-bold text-emerald-500">{prediction.totalWaste} <span className="text-sm font-normal">tons</span></motion.p>
            </div>
          </div>
          <p className="mt-3 text-sm capitalize" style={{ color: 'var(--text-muted)' }}>Zone: {zoneLabel}</p>
          <div className="absolute bottom-0 left-0 h-1 w-full" style={{ background: 'linear-gradient(90deg, #10b981, #10b98140)' }} />
        </AnimatedCard>

        <AnimatedCard delay={0.4} className="relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <Target size={24} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Confidence Score</p>
              <motion.p initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}
                className="text-3xl font-bold text-amber-500">{prediction.confidence}%</motion.p>
            </div>
          </div>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>Model: Random Forest</p>
          <div className="absolute bottom-0 left-0 h-1 w-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #f59e0b40)' }} />
        </AnimatedCard>
      </div>

      {/* Weekly Comparison Chart */}
      <ChartCard title="Weekly Comparison" subtitle="Current vs Previous week prediction" delay={0.5}>
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
