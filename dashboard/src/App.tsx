import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { AlertsPage } from './pages/AlertsPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { UsersManagementPage } from './pages/UsersManagementPage';
import { RegisterPage } from './pages/RegisterPage';
import { DemoPage } from './pages/DemoPage';
import { LoginPage } from './pages/LoginPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={(
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/users" element={<UsersManagementPage />} />
                  <Route path="/users/:id" element={<UserDetailPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/demo" element={<DemoPage />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          )}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
