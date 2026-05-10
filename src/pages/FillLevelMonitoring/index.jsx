import { motion } from 'framer-motion';
import { Gauge, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';

import AnimatedCard from '../../components/ui/AnimatedCard';
import ChartCard from '../../components/ui/ChartCard';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge from '../../components/ui/Badge';

import { binOccupancy, overflowAlerts } from '../../data/mockData';
import { useTheme } from '../../context/ThemeContext';

const statusColors = {
  normal: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  overflow: '#dc2626'
};

export default function FillLevelMonitoring() {
  const { isDark } = useTheme();

  // ⭐ NEW STATES
  const [lidEvents, setLidEvents] = useState([]);
  const [lidCount, setLidCount] = useState(0);

  // ⭐ SIMULATED REAL-TIME LID EVENTS (replace with Firebase later)
  useEffect(() => {
    const interval = setInterval(() => {
      const newEvent = {
        bin: "BIN_01",
        time: new Date().toLocaleTimeString(),
        status: "opened"
      };

      setLidEvents(prev => [newEvent, ...prev.slice(0, 4)]);
      setLidCount(prev => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ⭐ ABNORMAL DETECTION
  useEffect(() => {
    if (lidCount > 10) {
      console.log("⚠️ Abnormal lid usage detected!");
    }
  }, [lidCount]);

  const usageData = [
    { hour: '6AM', bins: 25 },
    { hour: '8AM', bins: 45 },
    { hour: '10AM', bins: 62 },
    { hour: '12PM', bins: 78 },
    { hour: '2PM', bins: 70 },
    { hour: '4PM', bins: 85 },
    { hour: '6PM', bins: 90 },
    { hour: '8PM', bins: 65 },
  ];

  const ts = {
    backgroundColor: isDark ? '#1e293b' : '#fff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '12px',
    color: isDark ? '#f1f5f9' : '#0f172a'
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Gauge size={22} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Smart Fill-Level & Occupancy Monitoring</h1>
          </div>
        </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Smart Fill-Level & Occupancy Monitoring
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Component 2 — Real-time bin monitoring and overflow detection
            </p>
          </div>
        </div>
        <Badge variant="info" className="mt-3">
          Real-time Simulation
        </Badge>
      </motion.div>

      {/* OVERFLOW ALERTS */}
      <AnimatedCard delay={0.1} hover={false}>
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-red-500" />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Overflow Alerts ({overflowAlerts.length})
          </h3>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {overflowAlerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="rounded-xl border p-4"
              style={{
                borderColor: alert.severity === 'high' ? '#ef444440' : '#f59e0b40',
                backgroundColor: isDark
                  ? (alert.severity === 'high' ? '#450a0a20' : '#451a0320')
                  : (alert.severity === 'high' ? '#fef2f210' : '#fffbeb10')
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{alert.bin}</span>
                <Badge variant={alert.severity === 'high' ? 'danger' : 'warning'}>
                  {alert.severity}
                </Badge>
              </div>
              <p className="text-xs">{alert.location}</p>
              <p className="text-xs">{alert.time}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedCard>

      {/* ⭐ LID ACTIVITY SECTION */}
      <AnimatedCard delay={0.15} hover={false}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Lid Opening Activity</h3>
          <Badge variant="info">Total Opens: {lidCount}</Badge>
        </div>

        <div className="space-y-2">
          {lidEvents.map((event, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border p-3"
              style={{
                borderColor: '#22c55e40',
                backgroundColor: isDark ? '#052e1620' : '#f0fdf410'
              }}
            >
              <span className="text-sm font-medium">{event.bin}</span>
              <span className="text-xs">{event.time}</span>
              <Badge variant="success">Opened</Badge>
            </div>
          ))}
        </div>
      </AnimatedCard>

      {/* BIN STATUS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {binOccupancy.map((bin, i) => (
          <AnimatedCard key={bin.id} delay={0.2 + i * 0.05}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{bin.id}</span>
              <Badge variant={bin.status === 'normal' ? 'success' : bin.status === 'warning' ? 'warning' : 'danger'}>
                {bin.status}
              </Badge>
            </div>

            <p className="text-xs">{bin.location}</p>

            <div className="mt-3">
              <ProgressBar
                value={bin.fillLevel}
                color={statusColors[bin.status]}
                label="Fill Level"
              />
            </div>

            <div className="mt-2 flex justify-between text-xs">
              <span>Type: {bin.type}</span>
              <span>Last: {bin.lastCollected}</span>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* CHART */}
      <ChartCard title="Usage Analytics" subtitle="Hourly bin fill level trend" delay={0.6}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={usageData}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
            <XAxis dataKey="hour" />
            <YAxis unit="%" />
            <Tooltip contentStyle={ts} />
            <Bar dataKey="bins" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

    </div>
  );
}