import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import JourneysPage from './pages/JourneysPage';
import ExecutionPage from './pages/ExecutionPage';
import ReportsPage from './pages/ReportsPage';
import CreateJourneyPage from './pages/CreateJourneyPage';
import EditJourneyPage from './pages/EditJourneyPage';
import MainLayout from './components/layout/MainLayout';

import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} 
        />
        
        <Route element={<MainLayout />}>
          <Route 
            path="/" 
            element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/Journeys" 
            element={isAuthenticated ? <JourneysPage /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/journeys/create" 
            element={isAuthenticated ? <CreateJourneyPage /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/journeys/edit/:id" 
            element={isAuthenticated ? <EditJourneyPage /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/Execution" 
            element={isAuthenticated ? <ExecutionPage /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/Reports" 
            element={isAuthenticated ? <ReportsPage /> : <Navigate to="/login" replace />} 
          />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
