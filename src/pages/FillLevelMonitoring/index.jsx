import { motion } from 'framer-motion';
import { Gauge, AlertTriangle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { ref, onValue, query, limitToLast, orderByChild } from 'firebase/database';
import { fillLevelDatabase } from '../../firebaseFillLevel';

import AnimatedCard from '../../components/ui/AnimatedCard';
import ChartCard from '../../components/ui/ChartCard';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge from '../../components/ui/Badge';

import { useTheme } from '../../context/ThemeContext';

const statusColors = {
  normal: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  overflow: '#dc2626'
};

// Determine bin status from fill level percentage
function getStatus(fillLevel) {
  if (fillLevel >= 90) return 'overflow';
  if (fillLevel >= 80) return 'critical';
  if (fillLevel >= 60) return 'warning';
  return 'normal';
}

export default function FillLevelMonitoring() {
  const { isDark } = useTheme();

  // Firebase real-time states
  const [fillLevel, setFillLevel] = useState(null);
  const [lidOpen, setLidOpen] = useState(false);
  const [overflowDetected, setOverflowDetected] = useState(false);
  const [lidEvents, setLidEvents] = useState([]);
  const [lidCount, setLidCount] = useState(0);
  const [fillHistory, setFillHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Listen to real-time fill level sensor data from Firebase ──
  useEffect(() => {
    // Listen to the latest sensor reading from 'smartBinData'
    const sensorRef = query(ref(fillLevelDatabase, 'smartBinData'), limitToLast(1));

    const unsubscribe = onValue(
      sensorRef,
      (snapshot) => {
        console.log('Firebase snapshot received:', snapshot.val());
        if (snapshot.exists()) {
          const data = snapshot.val();
          const keys = Object.keys(data);
          const latest = data[keys[keys.length - 1]];
          console.log('Latest reading:', latest);

          // Update fill level
          if (latest.fillLevel !== undefined) {
            setFillLevel(latest.fillLevel);
          } else if (latest.distance !== undefined) {
            const maxDepth = 30;
            const pct = Math.max(0, Math.min(100, ((maxDepth - latest.distance) / maxDepth) * 100));
            setFillLevel(Math.round(pct));
          }

          // Lid status — Firebase stores lidStatus as "OPEN" / "CLOSED"
          if (latest.lidStatus !== undefined) {
            const wasOpen = lidOpen;
            const nowOpen = latest.lidStatus === 'OPEN';
            setLidOpen(nowOpen);

            // Record lid-open event
            if (nowOpen && !wasOpen) {
              const newEvent = {
                bin: 'BIN_01',
                time: latest.timestamp
                  ? new Date(latest.timestamp).toLocaleTimeString()
                  : new Date().toLocaleTimeString(),
                status: 'opened'
              };
              setLidEvents(prev => [newEvent, ...prev.slice(0, 9)]);
              setLidCount(prev => prev + 1);
            }
          }

          // Overflow — derive from binStatus or fillLevel
          if (latest.binStatus !== undefined) {
            setOverflowDetected(
              latest.binStatus === 'OVERFLOW' || latest.fillLevel >= 90
            );
          } else if (latest.fillLevel !== undefined) {
            setOverflowDetected(latest.fillLevel >= 90);
          }
        } else {
          console.warn('No data at smartBinData');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firebase error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Listen to historical readings for chart ──
  useEffect(() => {
    const historyRef = query(ref(fillLevelDatabase, 'smartBinData'), limitToLast(8));

    const unsubscribe = onValue(
      historyRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const entries = Object.values(data).map((entry) => {
            let pct = entry.fillLevel;
            if (pct === undefined && entry.distance !== undefined) {
              const maxDepth = 30;
              pct = Math.max(0, Math.min(100, ((maxDepth - entry.distance) / maxDepth) * 100));
            }
            return {
              time: entry.timestamp
                ? new Date(entry.timestamp).toLocaleTimeString()
                : '',
              fill: Math.round(pct ?? 0)
            };
          });
          setFillHistory(entries);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // ⚠️ Abnormal lid usage detection
  useEffect(() => {
    if (lidCount > 10) {
      console.log("⚠️ Abnormal lid usage detected!");
    }
  }, [lidCount]);

  // Derived values
  const currentStatus = fillLevel !== null ? getStatus(fillLevel) : 'normal';

  const overflowAlerts = [];
  if (overflowDetected) {
    overflowAlerts.push({
      id: 1,
      bin: 'BIN_01',
      location: 'Firebase Sensor',
      time: new Date().toLocaleTimeString(),
      severity: 'high'
    });
  }
  if (fillLevel !== null && fillLevel >= 90) {
    overflowAlerts.push({
      id: 2,
      bin: 'BIN_01',
      location: 'Fill Level Sensor',
      time: 'Now',
      severity: fillLevel >= 95 ? 'high' : 'medium'
    });
  }

  const ts = {
    backgroundColor: isDark ? '#1e293b' : '#fff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '12px',
    color: isDark ? '#f1f5f9' : '#0f172a'
  };

  // ── LOADING STATE ──
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20">
        <Loader2 className="animate-spin text-amber-500" size={28} />
        <span style={{ color: 'var(--text-secondary)' }}>Connecting to Firebase sensors…</span>
      </div>
    );
  }

  // ── ERROR STATE ──
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
        <AlertTriangle className="mx-auto mb-2 text-red-500" size={32} />
        <p className="font-semibold text-red-500">Firebase Connection Error</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Gauge size={22} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Smart Fill-Level & Occupancy Monitoring
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Component 2 — Real-time bin monitoring and overflow detection
            </p>
          </div>
        </div>
        <Badge variant="success" className="mt-3">
          🔴 Live Firebase Data
        </Badge>
      </motion.div>

      {/* REAL-TIME SENSOR CARD */}
      <AnimatedCard delay={0.05} hover={false}>
        <div className="mb-4 flex items-center gap-2">
          <Gauge size={20} className="text-amber-500" />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Live Sensor Readings
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Fill Level */}
          <div className="rounded-xl border p-4" style={{
            borderColor: statusColors[currentStatus] + '40',
            backgroundColor: isDark ? '#0f172a' : '#fafafa'
          }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Fill Level</p>
            <p className="text-3xl font-bold" style={{ color: statusColors[currentStatus] }}>
              {fillLevel !== null ? `${fillLevel}%` : '—'}
            </p>
            <ProgressBar value={fillLevel ?? 0} color={statusColors[currentStatus]} label="" />
            <Badge variant={currentStatus === 'normal' ? 'success' : currentStatus === 'warning' ? 'warning' : 'danger'} className="mt-2">
              {currentStatus.toUpperCase()}
            </Badge>
          </div>

          {/* Lid Status */}
          <div className="rounded-xl border p-4" style={{
            borderColor: lidOpen ? '#22c55e40' : '#64748b40',
            backgroundColor: isDark ? '#0f172a' : '#fafafa'
          }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Lid Status</p>
            <p className="text-3xl font-bold" style={{ color: lidOpen ? '#22c55e' : '#64748b' }}>
              {lidOpen ? 'OPEN' : 'CLOSED'}
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Total opens: {lidCount}
            </p>
          </div>

          {/* Overflow Sensor */}
          <div className="rounded-xl border p-4" style={{
            borderColor: overflowDetected ? '#ef444440' : '#10b98140',
            backgroundColor: isDark ? '#0f172a' : '#fafafa'
          }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Overflow Sensor</p>
            <p className="text-3xl font-bold" style={{ color: overflowDetected ? '#ef4444' : '#10b981' }}>
              {overflowDetected ? 'YES' : 'NO'}
            </p>
            <Badge variant={overflowDetected ? 'danger' : 'success'} className="mt-2">
              {overflowDetected ? 'Overflow Detected!' : 'Normal'}
            </Badge>
          </div>
        </div>
      </AnimatedCard>

      {/* OVERFLOW ALERTS */}
      {overflowAlerts.length > 0 && (
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
      )}

      {/* LID ACTIVITY SECTION */}
      <AnimatedCard delay={0.15} hover={false}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Lid Opening Activity</h3>
          <Badge variant="info">Total Opens: {lidCount}</Badge>
        </div>

        {lidEvents.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            No lid events recorded yet. Waiting for sensor data…
          </p>
        ) : (
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
        )}
      </AnimatedCard>

      {/* FILL LEVEL HISTORY CHART */}
      {fillHistory.length > 0 && (
        <ChartCard title="Fill Level History" subtitle="Recent readings from Firebase" delay={0.6}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={fillHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
              <XAxis dataKey="time" />
              <YAxis unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={ts} />
              <Bar dataKey="fill" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

    </div>
  );
}