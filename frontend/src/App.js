import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/common/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentViewPage from './pages/DocumentViewPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <div className="App">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              
              <Route path="/documents" element={
                <ProtectedRoute>
                  <DocumentsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/documents/:id" element={
                <ProtectedRoute>
                  <DocumentViewPage />
                </ProtectedRoute>
              } />
              
              <Route path="/chat" element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              } />
              
              <Route path="/chat/:id" element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                },
                success: {
                  iconTheme: {
                    primary: 'var(--green-600)',
                    secondary: 'white',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'var(--red-600)',
                    secondary: 'white',
                  },
                },
              }}
            />
          </div>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;