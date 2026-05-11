import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, CloudRain, Calendar, CalendarDays, Sparkles,
  Home, Store, GraduationCap, Building, Umbrella,
  ChevronDown, ChevronUp, Users, Droplets, Package, Plus, Trash2,
} from 'lucide-react';

import AnimatedCard from '../../components/ui/AnimatedCard';
import Toggle from '../../components/ui/Toggle';

const zoneTypes = [
  { value: 'residential', label: 'Residential', icon: Home, color: '#10b981', bgClass: 'bg-emerald-500/10' },
  { value: 'market', label: 'Market', icon: Store, color: '#06b6d4', bgClass: 'bg-cyan-500/10' },
  { value: 'school', label: 'School', icon: GraduationCap, color: '#f59e0b', bgClass: 'bg-amber-500/10' },
  { value: 'office', label: 'Office', icon: Building, color: '#8b5cf6', bgClass: 'bg-violet-500/10' },
  { value: 'tourist_area', label: 'Tourist Area', icon: Umbrella, color: '#ef4444', bgClass: 'bg-red-500/10' },

];

const weekTypes = [
  { value: 'normal', label: 'Normal Week' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'festival', label: 'Festival' },
];

const popOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'very_high', label: 'Very High' },
];

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Default individual zones per zone type
const defaultZoneDefaults = {
  residential: { populationDensity: 'high', previousWet: 0.70, previousDry: 0.50 },
  market: { populationDensity: 'very_high', previousWet: 0.75, previousDry: 0.40 },
  school: { populationDensity: 'medium', previousWet: 0.16, previousDry: 0.14 },
  office: { populationDensity: 'medium', previousWet: 0.18, previousDry: 0.27 },
  tourist_area: { populationDensity: 'high', previousWet: 0.38, previousDry: 0.32 },
};

// Generate initial zone list with realistic varied values
function generateInitialZones() {
  return {
    residential: [
      { id: 1, name: 'Residential Zone 1', populationDensity: 'high', previousWet: 0.82, previousDry: 0.55 },
      { id: 2, name: 'Residential Zone 2', populationDensity: 'medium', previousWet: 0.58, previousDry: 0.42 },
      { id: 3, name: 'Residential Zone 3', populationDensity: 'very_high', previousWet: 0.95, previousDry: 0.68 },
    ],
    market: [
      { id: 4, name: 'Market Zone 1', populationDensity: 'very_high', previousWet: 0.92, previousDry: 0.48 },
      { id: 5, name: 'Market Zone 2', populationDensity: 'high', previousWet: 0.65, previousDry: 0.35 },
    ],
    school: [
      { id: 6, name: 'School Zone 1', populationDensity: 'medium', previousWet: 0.18, previousDry: 0.15 },
      { id: 7, name: 'School Zone 2', populationDensity: 'low', previousWet: 0.12, previousDry: 0.10 },
      { id: 8, name: 'School Zone 3', populationDensity: 'high', previousWet: 0.22, previousDry: 0.18 },
    ],
    office: [
      { id: 9, name: 'Office Zone 1', populationDensity: 'medium', previousWet: 0.17, previousDry: 0.25 },
      { id: 10, name: 'Office Zone 2', populationDensity: 'high', previousWet: 0.22, previousDry: 0.32 },
    ],
    tourist_area: [
      { id: 11, name: 'Tourist Zone 1', populationDensity: 'high', previousWet: 0.45, previousDry: 0.38 },
      { id: 12, name: 'Tourist Zone 2', populationDensity: 'medium', previousWet: 0.30, previousDry: 0.25 },
    ],
  };
}

let nextId = 100;

export default function PredictionInputPanel({ onPredict }) {
  const [globalParams, setGlobalParams] = useState({
    rainfall: 20, weekType: 'normal', month: 5, specialEvent: false,
  });
  const [zoneConfigs, setZoneConfigs] = useState(generateInitialZones);
  const [expandedZone, setExpandedZone] = useState(null);

  const updateGlobal = (field, value) => setGlobalParams({ ...globalParams, [field]: value });

  const updateIndividualZone = (zoneType, zoneId, field, value) => {
    setZoneConfigs((prev) => ({
      ...prev,
      [zoneType]: prev[zoneType].map((z) => (z.id === zoneId ? { ...z, [field]: value } : z)),
    }));
  };

  const addZone = (zoneType) => {
    const defaults = defaultZoneDefaults[zoneType];
    const label = zoneTypes.find((z) => z.value === zoneType)?.label || zoneType;
    const count = zoneConfigs[zoneType].length + 1;
    setZoneConfigs((prev) => ({
      ...prev,
      [zoneType]: [
        ...prev[zoneType],
        { id: nextId++, name: `${label} Zone ${count}`, ...defaults },
      ],
    }));
  };

  const removeZone = (zoneType, zoneId) => {
    setZoneConfigs((prev) => ({
      ...prev,
      [zoneType]: prev[zoneType].filter((z) => z.id !== zoneId),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onPredict({ globalParams, zoneConfigs });
  };

  const inputStyle = { backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' };
  const selectClass = "w-full rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-primary-500/50";
  const miniInputClass = "w-full rounded-lg border px-3 py-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-primary-500/50";

  const totalZones = Object.values(zoneConfigs).reduce((sum, zones) => sum + zones.length, 0);
  const activeTypes = Object.values(zoneConfigs).filter((zones) => zones.length > 0).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Council Summary */}
      <AnimatedCard delay={0.05} hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-800">
              <MapPin size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Municipal Council Configuration</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Configure individual zones across the council area</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-500">{totalZones}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Zones</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-500">{activeTypes}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Zone Types</p>
            </div>
          </div>
        </div>
      </AnimatedCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Global Parameters — Left column */}
        <AnimatedCard delay={0.1} hover={false}>
          <div className="mb-5 flex items-center gap-2">
            <Calendar size={20} className="text-primary-500" />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Council-Wide Parameters</h3>
          </div>
          <div className="space-y-5">
            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-2"><CloudRain size={16} className="text-cyan-500" />Rainfall (mm)</span>
                <span className="rounded-lg bg-cyan-500/10 px-2 py-0.5 text-sm font-bold text-cyan-500">{globalParams.rainfall} mm</span>
              </label>
              <input type="range" min="0" max="200" value={globalParams.rainfall} onChange={(e) => updateGlobal('rainfall', Number(e.target.value))} className="w-full" />
              <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}><span>0</span><span>100</span><span>200</span></div>
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                <CalendarDays size={16} className="text-amber-500" />Week Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {weekTypes.map((wt) => (
                  <button key={wt.value} type="button" onClick={() => updateGlobal('weekType', wt.value)}
                    className={`rounded-xl border-2 px-3 py-2 text-xs font-medium transition-all ${globalParams.weekType === wt.value ? 'border-primary-500 bg-primary-500/10 text-primary-500' : 'border-transparent hover:border-primary-500/30'}`}
                    style={globalParams.weekType !== wt.value ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}>
                    {wt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                <Calendar size={16} className="text-emerald-500" />Month
              </label>
              <select value={globalParams.month} onChange={(e) => updateGlobal('month', Number(e.target.value))} className={selectClass} style={inputStyle}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between rounded-xl p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Special Event</span>
              </div>
              <Toggle checked={globalParams.specialEvent} onChange={(v) => updateGlobal('specialEvent', v)} />
            </div>
          </div>
        </AnimatedCard>

        {/* Zone Configurations — Right 2 columns */}
        <div className="space-y-4 xl:col-span-2">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Zone Type Configuration</h3>
          </div>
          {zoneTypes.map((zone, idx) => {
            const zones = zoneConfigs[zone.value];
            const isExpanded = expandedZone === zone.value;
            return (
              <motion.div
                key={zone.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.06 }}
                className="card overflow-hidden border"
                style={{ borderColor: isExpanded ? zone.color + '60' : 'var(--border-color)' }}
              >
                {/* Zone Header — always visible */}
                <button
                  type="button"
                  onClick={() => setExpandedZone(isExpanded ? null : zone.value)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:opacity-80"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{zone.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {zones.length} zone{zones.length !== 1 ? 's' : ''} configured
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg px-2 py-1 text-xs font-bold" style={{ backgroundColor: `${zone.color}15`, color: zone.color }}>
                      {zones.length}
                    </span>
                    {isExpanded ? <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </button>

                {/* Expanded — Individual Zone List */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t px-5 pb-4 pt-3" style={{ borderColor: 'var(--border-color)' }}>
                        {/* Column Headers */}
                        <div className="mb-2 grid grid-cols-12 gap-2 px-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                          <div className="col-span-3">Zone Name</div>
                          <div className="col-span-3"><Users size={11} className="mr-1 inline" />Pop. Density</div>
                          <div className="col-span-2"><Droplets size={11} className="mr-1 inline" />Prev Wet (t)</div>
                          <div className="col-span-2"><Package size={11} className="mr-1 inline" />Prev Dry (t)</div>
                          <div className="col-span-2"></div>
                        </div>

                        {/* Zone Rows */}
                        <div className="space-y-2">
                          {zones.map((z, i) => (
                            <motion.div
                              key={z.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="grid grid-cols-12 items-center gap-2 rounded-xl p-2"
                              style={{ backgroundColor: 'var(--bg-tertiary)' }}
                            >
                              <div className="col-span-3">
                                <input
                                  type="text"
                                  value={z.name}
                                  onChange={(e) => updateIndividualZone(zone.value, z.id, 'name', e.target.value)}
                                  className="w-full rounded-lg border bg-transparent px-2 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary-500/50"
                                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                />
                              </div>
                              <div className="col-span-3">
                                <select
                                  value={z.populationDensity}
                                  onChange={(e) => updateIndividualZone(zone.value, z.id, 'populationDensity', e.target.value)}
                                  className="w-full rounded-lg border px-2 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary-500/50"
                                  style={inputStyle}
                                >
                                  {popOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number" step="0.1" min="0"
                                  value={z.previousWet}
                                  onChange={(e) => updateIndividualZone(zone.value, z.id, 'previousWet', Number(e.target.value))}
                                  className="w-full rounded-lg border px-2 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary-500/50"
                                  style={inputStyle}
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number" step="0.1" min="0"
                                  value={z.previousDry}
                                  onChange={(e) => updateIndividualZone(zone.value, z.id, 'previousDry', Number(e.target.value))}
                                  className="w-full rounded-lg border px-2 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary-500/50"
                                  style={inputStyle}
                                />
                              </div>
                              <div className="col-span-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => removeZone(zone.value, z.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                                  title="Remove zone"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {/* Add Zone Button */}
                        <button
                          type="button"
                          onClick={() => addZone(zone.value)}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-2.5 text-xs font-medium transition-all hover:border-solid"
                          style={{ borderColor: zone.color + '50', color: zone.color }}
                        >
                          <Plus size={14} /> Add {zone.label} Zone
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex justify-center">
        <button type="submit" className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-green-700 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-primary-500/25 transition-all active:scale-95">
          <span>Generate Prediction</span>
        </button>
      </motion.div>
    </form>
  );
}
