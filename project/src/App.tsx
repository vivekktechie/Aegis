import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import AuthPage from './components/Auth/AuthPage';
import ProgrammerDashboard from './components/Dashboard/ProgrammerDashboard';
import RecruiterDashboard from './components/Dashboard/RecruiterDashboard';
import GuideDashboard from './components/Dashboard/GuideDashboard';
import CompanyJobs from './components/Company/CompanyJobs';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/Auth/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route 
                path="/programmer" 
                element={
                  <PrivateRoute role="programmer">
                    <ProgrammerDashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/recruiter" 
                element={
                  <PrivateRoute role="recruiter">
                    <RecruiterDashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/guide" 
                element={
                  <PrivateRoute role="guide">
                    <GuideDashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/company/:companyId/jobs" 
                element={
                  <PrivateRoute role="programmer">
                    <CompanyJobs />
                  </PrivateRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/auth" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;