import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearAdminToken } from '../auth/session';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAdminToken();
    navigate('/login', { replace: true });
  };

  const mainNav = [
    { path: '/', label: '🏠 홈 대시보드' },
    { path: '/users', label: '👤 농업인 관리' },
    { path: '/alerts', label: '📋 이력 관리' },
  ];

  const settingsNav = [
    { path: '/register', label: '⚙️ 설정' },
    { path: '/demo', label: '데모', indent: true },
  ];

  const renderNavLink = (item: { path: string; label: string; indent?: boolean }) => {
    const active = item.path === '/users'
      ? location.pathname.startsWith('/users')
      : location.pathname === item.path;

    return (
      <Link
        key={item.path}
        to={item.path}
        style={{
          display: 'block',
          padding: item.indent ? '9px 20px 9px 36px' : '11px 20px',
          fontSize: item.indent ? 13 : 14,
          color: active ? 'white' : item.indent ? '#94a3b8' : '#64748b',
          textDecoration: 'none',
          fontWeight: active ? 600 : 400,
          background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
          borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
          marginBottom: 2,
        }}
      >
        {item.label}
      </Link>
    );
  };

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
            {mainNav.map(renderNavLink)}
            <div style={{ margin: '12px 0 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }} />
            {settingsNav.map(renderNavLink)}
          </nav>

          {/* 하단 보건소 정보 */}
          <div style={{
            padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
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
            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                color: '#94a3b8', borderRadius: 8, padding: '8px 12px', fontSize: 12,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <main style={{ flex: 1, padding: 28, overflow: 'auto', background: '#f8fafc' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}