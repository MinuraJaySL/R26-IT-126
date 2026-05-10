import { motion } from 'framer-motion';
import { AlertTriangle, Leaf, Users, Truck, TrendingUp, CheckCircle, Store, Recycle, Lightbulb } from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import Badge from '../../components/ui/Badge';

const ICON_MAP = {
  'alert-triangle': AlertTriangle, leaf: Leaf, users: Users, truck: Truck,
  'trending-up': TrendingUp, 'check-circle': CheckCircle, store: Store, recycle: Recycle,
};

const SEVERITY_STYLES = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'text-red-500' },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-500' },
  info: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: 'text-cyan-500' },
  success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-500' },
};

export default function Recommendations({ recommendations, prediction }) {
  if (!prediction || recommendations.length === 0) {
    return (
      <AnimatedCard className="flex flex-col items-center justify-center py-16 text-center">
        <Lightbulb size={48} style={{ color: 'var(--text-muted)' }} />
        <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No Recommendations</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Generate a prediction to receive AI-powered recommendations.</p>
      </AnimatedCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* <AnimatedCard delay={0.1} hover={false} className="gradient-primary text-white">
        <div className="flex items-center gap-3">
          <Lightbulb size={24} />
          <div>
            <h3 className="text-lg font-bold">Municipal Council Recommendations</h3>
            <p className="text-sm text-white/80">Based on predicted council waste: {prediction.grandTotal} tons ({prediction.confidence}% confidence)</p>
          </div>
        </div>
      </AnimatedCard> */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {recommendations.map((rec, i) => {
          const style = SEVERITY_STYLES[rec.severity] || SEVERITY_STYLES.info;
          const Icon = ICON_MAP[rec.icon] || Lightbulb;
          return (
            <motion.div key={rec.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
              className={`card overflow-hidden border p-5 ${style.border}`}>
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.bg}`}>
                  <Icon size={22} className={style.icon} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{rec.title}</h4>
                    <Badge variant={rec.severity}>{rec.severity}</Badge>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{rec.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-lg px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                      Action: {rec.action}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
