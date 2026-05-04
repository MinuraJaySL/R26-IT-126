import { motion } from 'framer-motion';

export default function ProgressBar({ value, max = 100, color = '#10b981', label, showValue = true, height = 8, delay = 0 }) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label && <span style={{ color: 'var(--text-secondary)' }}>{label}</span>}
          {showValue && <span className="font-semibold" style={{ color }}>{percentage.toFixed(1)}%</span>}
        </div>
      )}
      <div
        className="w-full overflow-hidden rounded-full"
        style={{ height, backgroundColor: 'var(--border-color)' }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
        />
      </div>
    </div>
  );
}
