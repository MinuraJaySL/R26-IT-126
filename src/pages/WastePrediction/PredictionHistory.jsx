import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, CheckCircle, Clock, Building2, Loader2, AlertCircle, Truck, CloudRain } from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import Badge from '../../components/ui/Badge';
import { fetchPredictionHistory } from '../../utils/api';

export default function PredictionHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPredictionHistory(20);
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setError(err.message || 'Failed to load prediction history');
    } finally {
      setLoading(false);
    }
  };

  // Format ISO date string to a readable format
  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getWeekTypeBadge = (type) => {
    switch (type) {
      case 'festival':
        return <span className="rounded px-2 py-0.5 text-xs font-bold bg-amber-500/10 text-amber-500">Festival</span>;
      case 'holiday':
        return <span className="rounded px-2 py-0.5 text-xs font-bold bg-emerald-500/10 text-emerald-500">Holiday</span>;
      default:
        return <span className="rounded px-2 py-0.5 text-xs font-bold bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300">Normal</span>;
    }
  };

  if (loading) {
    return (
      <AnimatedCard className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 size={48} className="animate-spin text-green-500" />
        <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Loading History...</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Fetching predictions from database</p>
      </AnimatedCard>
    );
  }

  if (error) {
    return (
      <AnimatedCard className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle size={48} className="text-red-400" />
        <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Failed to Load History</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button
          onClick={loadHistory}
          className="mt-4 rounded-xl bg-green-700 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-green-600 active:scale-95"
        >
          Retry
        </button>
      </AnimatedCard>
    );
  }

  if (history.length === 0) {
    return (
      <AnimatedCard className="flex flex-col items-center justify-center py-16 text-center">
        <History size={48} style={{ color: 'var(--text-muted)' }} />
        <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No Predictions Yet</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Go to the Predict tab and generate your first prediction.</p>
      </AnimatedCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History size={24} className="text-primary-500" />
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Municipal Prediction History</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{history.length} historical council-wide predictions recorded in database</p>
        </div>
      </div>

      {/* Table */}
      <AnimatedCard delay={0.2} hover={false} className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              {['Date', 'Scope', 'Conditions', 'Wet Waste', 'Dry Waste', 'Total Waste', 'Trucks Needed', 'Confidence', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((row, i) => {
              const total = (row.wetWaste + row.dryWaste).toFixed(1);
              return (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50"
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(row.date)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-1.5"><Building2 size={14} className="text-primary-500" />{row.scope || 'Kalutara MC'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getWeekTypeBadge(row.weekType)}
                      {row.rainfallMm !== undefined && (
                        <span className="flex items-center gap-1 text-xs text-cyan-500">
                          <CloudRain size={12} /> {row.rainfallMm}mm
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-cyan-500">{row.wetWaste} t</td>
                  <td className="px-4 py-3 font-semibold text-violet-500">{row.dryWaste} t</td>
                  <td className="px-4 py-3 font-bold text-emerald-500">{total} t</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 font-bold text-amber-500">
                      <Truck size={14} /> {row.trucksNeeded ? `${row.trucksNeeded + 1} (${row.trucksNeeded}+1)` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-16 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border-color)' }}>
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.confidence}%` }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{row.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={row.status === 'verified' ? 'success' : 'warning'}>
                      <span className="flex items-center gap-1">
                        {row.status === 'verified' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {row.status}
                      </span>
                    </Badge>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </AnimatedCard>
    </div>
  );
}
