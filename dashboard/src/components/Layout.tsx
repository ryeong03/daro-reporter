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

  const navItems = [
    { path: '/', label: '🏠 홈 대시보드' },
    { path: '/alerts', label: '👤 농업인 관리' },
    { path: '/alerts', label: '📋 이력 관리' },
    { path: '/register', label: '⚙️ 설정' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      <div style={{ display: 'flex', flex: 1 }}>
        {/* 사이드바 */}
        <div style={{
          width: 220, background: '#1e293b', minHeight: '100vh',
          display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0,
          boxShadow: '2px 0 8px rgba(0,0,0,0.2)',
        }}>
          {/* 로고 */}
          <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{
              width: 44, height: 44, background: '#3b82f6', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, color: 'white', fontSize: 20, marginBottom: 10,
              boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
            }}>H</div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Hero</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>농어촌 안심케어</div>
          </div>

          {/* 메뉴 */}
          <nav style={{ padding: '12px 0', flex: 1 }}>
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  style={{
                    display: 'block', padding: '11px 20px', fontSize: 14,
                    color: active ? 'white' : '#64748b',
                    textDecoration: 'none', fontWeight: active ? 600 : 400,
                    background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                    borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
                    marginBottom: 2, transition: 'all 0.15s',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* 하단 보건소 정보 */}
          <div style={{
            padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', background: '#3b82f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 13,
              boxShadow: '0 2px 6px rgba(59,130,246,0.3)',
            }}>관</div>
            <div>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>청도보건소</div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>관리자</div>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <main style={{ flex: 1, padding: 28, overflow: 'auto', background: '#f8fafc' }}>
          {children}
        </main>
      </div>
    </div>
  );
}