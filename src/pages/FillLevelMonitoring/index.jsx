import { motion } from 'framer-motion';
import { Gauge, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AnimatedCard from '../../components/ui/AnimatedCard';
import ChartCard from '../../components/ui/ChartCard';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge from '../../components/ui/Badge';
import { binOccupancy, overflowAlerts } from '../../data/mockData';
import { useTheme } from '../../context/ThemeContext';

const statusColors = { normal: '#10b981', warning: '#f59e0b', critical: '#ef4444', overflow: '#dc2626' };

export default function FillLevelMonitoring() {
  const { isDark } = useTheme();
  const usageData = [
    { hour: '6AM', bins: 25 }, { hour: '8AM', bins: 45 }, { hour: '10AM', bins: 62 }, { hour: '12PM', bins: 78 },
    { hour: '2PM', bins: 70 }, { hour: '4PM', bins: 85 }, { hour: '6PM', bins: 90 }, { hour: '8PM', bins: 65 },
  ];
  const ts = { backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: '12px', color: isDark ? '#f1f5f9' : '#0f172a' };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10"><Gauge size={22} className="text-amber-500" /></div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Smart Fill-Level & Occupancy Monitoring</h1>
          </div>
        </div>
      </motion.div>

      <AnimatedCard delay={0.1} hover={false}>
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-red-500" />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Overflow Alerts ({overflowAlerts.length})</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {overflowAlerts.map((alert, i) => (
            <motion.div key={alert.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.1 }}
              className="rounded-xl border p-4" style={{ borderColor: alert.severity === 'high' ? '#ef444440' : '#f59e0b40', backgroundColor: isDark ? (alert.severity === 'high' ? '#450a0a20' : '#451a0320') : (alert.severity === 'high' ? '#fef2f210' : '#fffbeb10') }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{alert.bin}</span>
                <Badge variant={alert.severity === 'high' ? 'danger' : 'warning'}>{alert.severity}</Badge>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{alert.location}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{alert.time}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {binOccupancy.map((bin, i) => (
          <AnimatedCard key={bin.id} delay={0.2 + i * 0.05}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{bin.id}</span>
              <Badge variant={bin.status === 'normal' ? 'success' : bin.status === 'warning' ? 'warning' : 'danger'}>{bin.status}</Badge>
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{bin.location}</p>
            <div className="mt-3"><ProgressBar value={bin.fillLevel} color={statusColors[bin.status]} label="Fill Level" delay={0.3 + i * 0.05} /></div>
            <div className="mt-2 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Type: {bin.type}</span><span>Last: {bin.lastCollected}</span>
            </div>
          </AnimatedCard>
        ))}
      </div>

      <ChartCard title="Usage Analytics" subtitle="Hourly bin fill level trend" delay={0.6}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={usageData}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
            <XAxis dataKey="hour" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
            <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} unit="%" />
            <Tooltip contentStyle={ts} />
            <Bar dataKey="bins" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Avg Fill Level" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
