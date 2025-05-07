import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'
import GoogleDriveCallbackHandler from './pages/GoogleDriveCallbackHandler';
import PlagiarismReport from './pages/PlagiarismReport';
import PlagiarismReports from './pages/PlagiarismReports';
import CompareDocuments from './pages/CompareDocuments';
import DashboardLayout from './layouts/DashboardLayout';
import { useAuth } from './context/AuthContext';
import GeneralPlagiarismCheck from './pages/GeneralPlagiarismCheck';

function App() {
  const { token } = useAuth();

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (!token) {
      return <Navigate to="/login" />;
    }
    return children;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Dashboard and its child routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="reports" element={<PlagiarismReports />} />
          <Route path="reports/:reportId" element={<PlagiarismReport />} />
          <Route path="compare" element={<CompareDocuments />} />
        </Route>
        
        <Route
          path="/login"
          element={token ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/register"
          element={token ? <Navigate to="/dashboard" /> : <Register />}
        />
        <Route path="/google-callback" element={<GoogleDriveCallbackHandler />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}

export default App;
