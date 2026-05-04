import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import EnvironmentalSensing from './pages/EnvironmentalSensing';
import FillLevelMonitoring from './pages/FillLevelMonitoring';
import WastePrediction from './pages/WastePrediction';
import RouteOptimization from './pages/RouteOptimization';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/environmental-sensing" element={<EnvironmentalSensing />} />
            <Route path="/fill-level-monitoring" element={<FillLevelMonitoring />} />
            <Route path="/waste-prediction" element={<WastePrediction />} />
            <Route path="/route-optimization" element={<RouteOptimization />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
