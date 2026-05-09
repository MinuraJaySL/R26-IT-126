import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, CloudRain, Users, Calendar, CalendarDays, Sparkles, Droplets, Package, Zap, Home, Store, GraduationCap, Building, Umbrella } from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import Toggle from '../../components/ui/Toggle';

const zoneTypes = [
  { value: 'residential', label: 'Residential', icon: Home },
  { value: 'market', label: 'Market', icon: Store },
  { value: 'school', label: 'School', icon: GraduationCap },
  { value: 'office', label: 'Office', icon: Building },
  { value: 'tourist_area', label: 'Tourist Area', icon: Umbrella },
];

const weekTypes = [
  { value: 'normal', label: 'Normal Week' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'festival', label: 'Festival' },
];

const popOptions = [
  { value: 'low', label: 'Low Density' },
  { value: 'medium', label: 'Medium Density' },
  { value: 'high', label: 'High Density' },
  { value: 'very_high', label: 'Very High Density' },
];

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function PredictionInputPanel({ onPredict }) {
  const [formData, setFormData] = useState({
    zoneType: 'residential', rainfall: 20, populationDensity: 'medium',
    weekType: 'normal', month: 5, specialEvent: false, previousWet: 12.0, previousDry: 8.0,
  });

  const update = (field, value) => setFormData({ ...formData, [field]: value });
  const handleSubmit = (e) => { e.preventDefault(); onPredict(formData); };
  const inputStyle = { backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' };
  const selectClass = "w-full rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-primary-500/50";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnimatedCard delay={0.1} hover={false}>
          <div className="mb-5 flex items-center gap-2">
            <MapPin size={20} className="text-primary-500" />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Location & Environment</h3>
          </div>
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Zone Type</label>
              <div className="grid grid-cols-5 gap-2">
                {zoneTypes.map((z) => (
                  <button key={z.value} type="button" onClick={() => update('zoneType', z.value)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-xs font-medium transition-all ${formData.zoneType === z.value ? 'border-primary-500 bg-primary-500/10 text-primary-500' : 'border-transparent hover:border-primary-500/30'}`}
                    style={formData.zoneType !== z.value ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}>
                    <z.icon size={22} className="mb-0.5" /><span>{z.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-2"><CloudRain size={16} className="text-cyan-500" />Rainfall (mm)</span>
                <span className="rounded-lg bg-cyan-500/10 px-2 py-0.5 text-sm font-bold text-cyan-500">{formData.rainfall} mm</span>
              </label>
              <input type="range" min="0" max="200" value={formData.rainfall} onChange={(e) => update('rainfall', Number(e.target.value))} className="w-full" />
              <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}><span>0</span><span>100</span><span>200</span></div>
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                <Users size={16} className="text-violet-500" />Population Density
              </label>
              <select value={formData.populationDensity} onChange={(e) => update('populationDensity', e.target.value)} className={selectClass} style={inputStyle}>
                {popOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.2} hover={false}>
          <div className="mb-5 flex items-center gap-2">
            <Calendar size={20} className="text-primary-500" />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Temporal & Historical Data</h3>
          </div>
          <div className="space-y-5">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                <CalendarDays size={16} className="text-amber-500" />Week Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {weekTypes.map((wt) => (
                  <button key={wt.value} type="button" onClick={() => update('weekType', wt.value)}
                    className={`rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${formData.weekType === wt.value ? 'border-primary-500 bg-primary-500/10 text-primary-500' : 'border-transparent hover:border-primary-500/30'}`}
                    style={formData.weekType !== wt.value ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}>
                    {wt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                <Calendar size={16} className="text-emerald-500" />Month
              </label>
              <select value={formData.month} onChange={(e) => update('month', Number(e.target.value))} className={selectClass} style={inputStyle}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between rounded-xl p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Special Event</span>
              </div>
              <Toggle checked={formData.specialEvent} onChange={(v) => update('specialEvent', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <Droplets size={16} className="text-cyan-500" />Prev. Wet (tons)
                </label>
                <input type="number" step="0.1" min="0" value={formData.previousWet} onChange={(e) => update('previousWet', Number(e.target.value))} className={selectClass} style={inputStyle} />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <Package size={16} className="text-violet-500" />Prev. Dry (tons)
                </label>
                <input type="number" step="0.1" min="0" value={formData.previousDry} onChange={(e) => update('previousDry', Number(e.target.value))} className={selectClass} style={inputStyle} />
              </div>
            </div>
          </div>
        </AnimatedCard>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex justify-center">
        <button type="submit" className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-primary-500 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-600 hover:shadow-xl active:scale-95">
          <Zap size={22} /><span>Generate Prediction</span>
        </button>
      </motion.div>
    </form>
  );
}
