import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Radio,
  Gauge,
  BrainCircuit,
  Route,
  ChevronLeft,
  ChevronRight,
  Recycle,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/environmental-sensing', label: 'Environmental Sensing', icon: Radio, component: 1 },
  { path: '/fill-level-monitoring', label: 'Fill Level Monitor', icon: Gauge, component: 2 },
  { path: '/waste-prediction', label: 'Waste Prediction', icon: BrainCircuit, component: 3 },
  { path: '/route-optimization', label: 'Route Optimization', icon: Route, component: 4 },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-4" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary">
          <Recycle size={22} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Smart Waste</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Management System</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-500/10 text-primary-500'
                  : 'hover:bg-surface-100 dark:hover:bg-surface-700/50'
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? '#10b981' : 'var(--text-secondary)',
            })}
          >
            <item.icon size={20} className="shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {!collapsed && item.component === 3 && (
              <span className="ml-auto rounded-md bg-primary-500/10 px-1.5 py-0.5 text-xs font-bold text-primary-500">
                ML
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse button */}
      <div className="border-t p-3" style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition-colors hover:bg-surface-100 dark:hover:bg-surface-700/50"
          style={{ color: 'var(--text-secondary)' }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
