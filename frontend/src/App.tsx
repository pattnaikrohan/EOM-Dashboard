/**
 * AAW EOM Review Agent — Main App with routing.
 */
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import OperatorView from './pages/OperatorView';
import OpsReview from './pages/OpsReview';
import UploadPage from './pages/Upload';
import SettingsPage from './pages/Settings';
import NegativeMovement from './pages/NegativeMovement';

function AppRoutes() {
  const { checkStatus } = useData();

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/operator/:code" element={<OperatorView />} />
        <Route path="/ops-review" element={<OpsReview />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/negative-movement" element={<NegativeMovement />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Router>
        <AppRoutes />
      </Router>
    </DataProvider>
  );
}
