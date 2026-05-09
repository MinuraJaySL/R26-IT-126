import { motion } from 'framer-motion';
import { History, CheckCircle, Clock, MapPin } from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import Badge from '../../components/ui/Badge';
import { predictionHistory } from '../../data/mockData';

export default function PredictionHistory() {
  return (
    <div className="space-y-6">
      <AnimatedCard delay={0.1} hover={false} className="gradient-ocean text-white">
        <div className="flex items-center gap-3">
          <History size={24} />
          <div>
            <h3 className="text-lg font-bold">Prediction History</h3>
            <p className="text-sm text-white/80">{predictionHistory.length} predictions recorded</p>
          </div>
        </div>
      </AnimatedCard>

      {/* Table */}
      <AnimatedCard delay={0.2} hover={false} className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              {['Date', 'Zone', 'Wet Waste', 'Dry Waste', 'Confidence', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {predictionHistory.map((row, i) => (
              <motion.tr key={row.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{row.date}</td>
                <td className="px-4 py-3 capitalize" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-1.5"><MapPin size={14} className="text-primary-500" />{row.zone.replace('_', ' ')}</div>
                </td>
                <td className="px-4 py-3 font-semibold text-cyan-500">{row.wetWaste} t</td>
                <td className="px-4 py-3 font-semibold text-violet-500">{row.dryWaste} t</td>
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
            ))}
          </tbody>
        </table>
      </AnimatedCard>
    </div>
  );
}
