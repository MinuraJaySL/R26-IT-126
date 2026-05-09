import { motion } from 'framer-motion';
import {
  Gauge, Wind, Thermometer, Droplets, Radio, CheckCircle, AlertTriangle,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import StatCard from '../../components/ui/StatCard';
import ChartCard from '../../components/ui/ChartCard';
import AnimatedCard from '../../components/ui/AnimatedCard';
import Badge from '../../components/ui/Badge';
import { sensorData, sensorHistory } from '../../data/mockData';
import { useTheme } from '../../context/ThemeContext';

const iconMap = {
  gauge: Gauge,
  wind: Wind,
  thermometer: Thermometer,
  droplets: Droplets,
};

export default function EnvironmentalSensing() {
  const { isDark } = useTheme();

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
            <Radio size={22} className="text-cyan-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Environmental Sensing Smart Bin
            </h1>
          </div>
        </div>
      </motion.div>

      {/* Smart Bin Status */}
      <AnimatedCard delay={0.1} hover={false}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircle size={24} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Smart Bin Status</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>All sensors operational</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 status-dot" />
            <span className="text-sm font-semibold text-emerald-500">Online</span>
          </div>
        </div>
      </AnimatedCard>

      {/* Sensor Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sensorData.map((sensor, i) => {
          const IconComp = iconMap[sensor.icon] || Gauge;
          return (
            <StatCard
              key={sensor.id}
              title={sensor.name}
              value={sensor.value}
              unit={sensor.unit}
              icon={IconComp}
              color={sensor.color}
              trend={sensor.status === 'warning' ? 'up' : 'up'}
              trendValue={sensor.status === 'warning' ? 'Above normal' : 'Normal range'}
              delay={0.2 + i * 0.1}
            />
          );
        })}
      </div>

      {/* Sensor History Chart */}
      <ChartCard title="Sensor History" subtitle="24-hour environmental readings" delay={0.5}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={sensorHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
            <XAxis dataKey="time" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
            <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                borderRadius: '12px',
                color: isDark ? '#f1f5f9' : '#0f172a',
              }}
            />
            <Line type="monotone" dataKey="fill" stroke="#10b981" strokeWidth={2} name="Fill Level (%)" dot={false} />
            <Line type="monotone" dataKey="gas" stroke="#06b6d4" strokeWidth={2} name="Gas (ppm)" dot={false} />
            <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} name="Temperature (°C)" dot={false} />
            <Line type="monotone" dataKey="humidity" stroke="#8b5cf6" strokeWidth={2} name="Humidity (%)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Alerts */}
      <AnimatedCard delay={0.6} hover={false}>
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Environmental Alerts
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <AlertTriangle size={18} className="text-amber-500" />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Temperature above threshold</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bin #3 — 32.5°C (threshold: 30°C)</p>
            </div>
            <Badge variant="warning" className="ml-auto">Warning</Badge>
          </div>
          <div className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <CheckCircle size={18} className="text-emerald-500" />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Gas levels normal</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>All bins within safe range</p>
            </div>
            <Badge variant="success" className="ml-auto">Normal</Badge>
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
}
