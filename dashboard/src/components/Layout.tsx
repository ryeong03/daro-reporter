import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchAlerts, Alert } from '../api/client';

interface Props {
  children: React.ReactNode;
}

export function Layout({ children }: Props) {
  const location = useLocation();
  const [emergencyAlerts, setEmergencyAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const poll = async () => {
      try {
        const alerts = await fetchAlerts({ status: 'triggered' });
        setEmergencyAlerts(alerts);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* 응급 알림 배너 */}
      {emergencyAlerts.length > 0 && (
        <div style={{
          background: '#dc2626',
          color: 'white',
          padding: '12px 24px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <span>응급 상황 {emergencyAlerts.length}건 발생</span>
          {emergencyAlerts.slice(0, 3).map((a) => (
            <span key={a.id} style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 13,
            }}>
              {a.users?.name || '알 수 없음'} — {a.event_type}
            </span>
          ))}
        </div>
      )}

      {/* 네비게이션 */}
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: 56,
        gap: 32,
      }}>
        <Link to="/" style={{ fontWeight: 'bold', fontSize: 18, color: '#1e293b', textDecoration: 'none' }}>
          Hero 관리자
        </Link>
        <Link to="/" style={{
          color: location.pathname === '/' ? '#2563eb' : '#64748b',
          textDecoration: 'none',
          fontWeight: location.pathname === '/' ? 600 : 400,
        }}>
          대시보드
        </Link>
        <Link to="/alerts" style={{
          color: location.pathname === '/alerts' ? '#2563eb' : '#64748b',
          textDecoration: 'none',
          fontWeight: location.pathname === '/alerts' ? 600 : 400,
        }}>
          알림 이력
        </Link>
      </nav>

      {/* 메인 콘텐츠 */}
      <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
