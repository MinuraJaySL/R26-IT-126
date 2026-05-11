import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, SlidersHorizontal, BarChart3, PieChart,
  LineChart as LineChartIcon, Lightbulb, History, DollarSign,
} from 'lucide-react';
import PredictionInputPanel from './PredictionInputPanel';
import PredictionResults from './PredictionResults';
import WasteComposition from './WasteComposition';
import Analytics from './Analytics';
import Recommendations from './Recommendations';
import PredictionHistory from './PredictionHistory';
import RevenueEstimation from './RevenueEstimation';
import { predictMunicipalWaste, estimateMunicipalComposition, generateRecommendations } from '../../utils/predictionEngine';

const tabs = [
  { id: 'predict', label: 'Predict', icon: SlidersHorizontal },
  { id: 'results', label: 'Results', icon: BarChart3 },
  { id: 'composition', label: 'Composition', icon: PieChart },
  // { id: 'analytics', label: 'Analytics', icon: LineChartIcon },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
  { id: 'history', label: 'History', icon: History },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
];

export default function WastePrediction() {
  const [activeTab, setActiveTab] = useState('predict');
  const [prediction, setPrediction] = useState(null);
  const [composition, setComposition] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const handlePredict = (inputs) => {
    const result = predictMunicipalWaste(inputs);
    setPrediction(result);

    const comp = estimateMunicipalComposition(result.zoneResults);
    setComposition(comp);

    const recs = generateRecommendations(result);
    setRecommendations(recs);

    // Auto-switch to results tab
    setActiveTab('results');
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'predict':
        return <PredictionInputPanel onPredict={handlePredict} />;
      case 'results':
        return <PredictionResults prediction={prediction} />;
      case 'composition':
        return <WasteComposition composition={composition} prediction={prediction} />;
      case 'analytics':
        return <Analytics />;
      case 'recommendations':
        return <Recommendations recommendations={recommendations} prediction={prediction} />;
      case 'history':
        return <PredictionHistory />;
      case 'revenue':
        return <RevenueEstimation composition={composition} prediction={prediction} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
            <BrainCircuit size={22} className="text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Municipal Waste Prediction & Composition Estimation
            </h1>
          </div>
        </div>
      </motion.div>

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
