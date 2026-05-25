import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { AlertsPage } from './pages/AlertsPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { RegisterPage } from './pages/RegisterPage';
import './index.css';

const isDev = process.env.NODE_ENV === 'development';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        {isDev && (
          <div style={{
            background: '#eff6ff', color: '#2563eb', padding: '6px 16px',
            fontSize: 12, fontWeight: 600, borderRadius: 6, marginBottom: 16,
            display: 'inline-block',
          }}>
            DEV MODE
          </div>
        )}
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/users/:id" element={<UserDetailPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
