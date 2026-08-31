import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, SlidersHorizontal, BarChart3, PieChart,
  Lightbulb, History, DollarSign, Loader2, GitCompare,
} from 'lucide-react';
import PredictionInputPanel from './PredictionInputPanel';
import PredictionResults from './PredictionResults';
import WasteComposition from './WasteComposition';
import Recommendations from './Recommendations';
import PredictionHistory from './PredictionHistory';
import RevenueEstimation from './RevenueEstimation';
import ModelValidation from './ModelValidation';
import { predictWasteAPI } from '../../utils/api';

const tabs = [
  { id: 'predict', label: 'Predict', icon: SlidersHorizontal },
  { id: 'results', label: 'Results', icon: BarChart3 },
  // { id: 'composition', label: 'Composition', icon: PieChart },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
  { id: 'history', label: 'History', icon: History },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'validation', label: 'Validation', icon: GitCompare },
];

export default function WastePrediction() {
  const [activeTab, setActiveTab] = useState('predict');
  const [prediction, setPrediction] = useState(null);
  const [composition, setComposition] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [truckRequirements, setTruckRequirements] = useState(null);
  const [rainfallForecast, setRainfallForecast] = useState(null);
  const [inputsSummary, setInputsSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePredict = async (inputs) => {
    setLoading(true);
    setError(null);

    try {
      const result = await predictWasteAPI(inputs);

      setPrediction(result.prediction);
      setComposition(result.composition);
      setRecommendations(result.recommendations);
      setTruckRequirements(result.truckRequirements);
      setRainfallForecast(result.rainfallForecast);
      setInputsSummary(result.inputsSummary);

      // Auto-switch to results tab
      setActiveTab('results');
    } catch (err) {
      console.error('Prediction failed:', err);
      setError(err.message || 'Prediction failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'predict':
        return <PredictionInputPanel onPredict={handlePredict} loading={loading} />;
      case 'results':
        return <PredictionResults prediction={prediction} truckRequirements={truckRequirements} inputsSummary={inputsSummary} />;
      case 'composition':
        return <WasteComposition composition={composition} prediction={prediction} />;
      case 'recommendations':
        return <Recommendations recommendations={recommendations} prediction={prediction} />;
      case 'history':
        return <PredictionHistory />;
      case 'revenue':
        return <RevenueEstimation composition={composition} prediction={prediction} />;
      case 'validation':
        return <ModelValidation />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          {/* <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <BrainCircuit size={22} className="text-white" />
          </div> */}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Municipal Waste Prediction & Fleet Planning
            </h1>
          </div>
        </div>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-400"
        >
          ⚠ {error}
        </motion.div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-3 rounded-xl border px-5 py-4"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
        >
          <Loader2 size={20} className="animate-spin text-green-500" />
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Fetching weather data & running ML models...
          </span>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full"
      >
        <div
          className="flex w-full gap-1 rounded-2xl border p-1.5"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                ? 'bg-green-700 text-white'
                : 'hover:bg-surface-100 dark:hover:bg-surface-700/50'
              }`}
              style={{
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderTab()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
