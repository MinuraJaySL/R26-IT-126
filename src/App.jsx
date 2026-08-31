import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import EnvironmentalSensing from './pages/EnvironmentalSensing';
import FillLevelMonitoring from './pages/FillLevelMonitoring';
import WastePrediction from './pages/WastePrediction';
import RouteOptimization from './pages/RouteOptimization';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Login/Register';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Dashboard Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/environmental-sensing" element={<EnvironmentalSensing />} />
                <Route path="/fill-level-monitoring" element={<FillLevelMonitoring />} />
                <Route path="/waste-prediction" element={<WastePrediction />} />
                <Route path="/route-optimization" element={<RouteOptimization />} />
              </Route>
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

