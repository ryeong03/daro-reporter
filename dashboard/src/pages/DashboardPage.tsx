import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchUsers, User } from '../api/client';
import { KakaoMapView, MapMarker } from '../components/KakaoMapView';
import { isValidMapCoord } from '../kakao/loadKakaoMaps';
import { formatRelativeTime } from '../utils/formatRelativeTime';

function toMapMarkerStatus(status: User['status']): NonNullable<MapMarker['status']> {
  if (status === 'rescue' || status === 'emergency') return 'emergency';
  if (status === 'warning') return 'warning';
  if (status === 'resolved') return 'resolved';
  return 'normal';
}

export function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadUsers();
    const interval = window.setInterval(loadUsers, 5000);
    return () => window.clearInterval(interval);
  }, [loadUsers]);

  const statusConfig = (user: User) => {
    if (user.status_label) {
      switch (user.status) {
        case 'emergency':
          return { bg: '#fef2f2', text: '#dc2626', label: `🔴 ${user.status_label}`, border: '#fecaca' };
        case 'rescue':
          return { bg: '#fef2f2', text: '#b91c1c', label: `🔴 ${user.status_label}`, border: '#fecaca' };
        case 'resolved':
          return { bg: '#eff6ff', text: '#1d4ed8', label: `✅ ${user.status_label}`, border: '#bfdbfe' };
        case 'warning':
          return { bg: '#fffbeb', text: '#d97706', label: `⚠️ ${user.status_label}`, border: '#fde68a' };
        default:
          return { bg: '#f0fdf4', text: '#16a34a', label: `✅ ${user.status_label}`, border: '#bbf7d0' };
      }
    }
    switch (user.status) {
      case 'emergency': return { bg: '#fef2f2', text: '#dc2626', label: '🔴 응급', border: '#fecaca' };
      case 'rescue': return { bg: '#fef2f2', text: '#b91c1c', label: '🔴 구조 필요', border: '#fecaca' };
      case 'resolved': return { bg: '#eff6ff', text: '#1d4ed8', label: '✅ 처리완료', border: '#bfdbfe' };
      case 'warning': return { bg: '#fffbeb', text: '#d97706', label: '⚠️ 휴식', border: '#fde68a' };
      default: return { bg: '#f0fdf4', text: '#16a34a', label: '✅ 정상', border: '#bbf7d0' };
    }
  };

  const mapMarkers = useMemo(
    () =>
      users
        .filter(
          (u) =>
            u.latest_location &&
            isValidMapCoord(u.latest_location.lat, u.latest_location.lng),
        )
        .map((u) => ({
          id: u.id,
          name: u.name,
          lat: Number(u.latest_location!.lat),
          lng: Number(u.latest_location!.lng),
          status: toMapMarkerStatus(u.status),
          subtitle: u.status_label ?? (u.status === 'emergency' ? '응급' : u.status === 'warning' ? '휴식' : '정상'),
        })),
    [users],
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const alertUser = users.find((u) => u.status === 'emergency' || u.status === 'rescue');
  const warningUser = users.find((u) => u.status === 'warning');
  const resolvedUser = users.find((u) => u.status === 'resolved');
  const bannerUser = alertUser ?? warningUser ?? resolvedUser;

  const bannerMessage = (user: User) => {
    if (user.status === 'warning') return '심박수 상승 · 휴식 권고';
    if (user.status === 'rescue') return '구조 필요 · 보건소 알림 발송';
    if (user.status === 'resolved') return '출동 완료 · 처리됨';
    if (user.active_alert?.status === 'calling') return 'AI 콜 진행 중';
    if (user.status === 'emergency') return '낙상 감지 · 확인 중';
    return user.status_label ?? '이상 감지';
  };

  const sortedUsers = useMemo(() => {
    const order: Record<string, number> = { emergency: 0, rescue: 1, warning: 2, resolved: 3, normal: 4 };
    return [...users].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
  }, [users]);

  const displayUsers = sortedUsers.slice(0, 5);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>;

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>홈 대시보드</h1>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>{dateStr} · 실시간 현황</div>
        </div>
        {bannerUser && (() => {
          const isUrgent = bannerUser.status === 'emergency' || bannerUser.status === 'rescue';
          const isResolved = bannerUser.status === 'resolved';
          const bg = isUrgent ? '#fff1f2' : isResolved ? '#eff6ff' : '#fffbeb';
          const border = isUrgent ? '#fca5a5' : isResolved ? '#bfdbfe' : '#fde68a';
          const color = isUrgent ? '#dc2626' : isResolved ? '#1d4ed8' : '#d97706';
          const icon = isUrgent ? '🔴' : isResolved ? '✅' : '⚠️';
          const title = isResolved ? '처리완료' : '이상 감지';
          return (
          <Link
            to={`/users/${bannerUser.id}`}
            style={{
            background: bg,
            border: `1.5px solid ${border}`,
            borderRadius: 8,
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 480,
            boxShadow: isUrgent ? '0 2px 8px rgba(220,38,38,0.1)' : '0 2px 8px rgba(0,0,0,0.06)', textDecoration: 'none',
          }}>
            <span style={{ color, fontWeight: 700, fontSize: 13 }}>
              {icon} {title} — {bannerUser.name}
              {' | '}{bannerMessage(bannerUser)}
            </span>
            <span style={{ color, fontSize: 13, whiteSpace: 'nowrap', fontWeight: 600 }}>확인 →</span>
          </Link>
          );
        })()}
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: '전체 등록 농업인', value: users.length, color: '#1e293b', bg: 'white', border: '#e2e8f0', link: '/users' },
          { label: '정상', value: users.filter(u => u.status === 'normal').length, color: '#16a34a', bg: 'white', border: '#e2e8f0' },
          { label: '휴식 요망', value: users.filter(u => u.status === 'warning').length, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
          { label: '응급 / 이상감지', value: users.filter(u => u.status === 'emergency' || u.status === 'rescue').length, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
        ].map(card => (
          <div key={card.label} style={{
            flex: 1, background: card.bg, borderRadius: 12, padding: '20px 24px',
            border: `1px solid ${card.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: card.color }}>
              {card.link ? (
                <Link to={card.link} style={{ color: 'inherit', textDecoration: 'none' }}>{card.value}</Link>
              ) : (
                card.value
              )}
              <span style={{ fontSize: 14, fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>명</span>
            </div>
          </div>
        ))}
      </div>

      {/* 2단 레이아웃 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 왼쪽: 농업인 현황 목록 */}
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>농업인 현황 목록</span>
            <Link to="/users" style={{ color: '#2563eb', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
              농업인 관리 →
            </Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={thStyle}>이름</th>
                <th style={thStyle}>나이</th>
                <th style={thStyle}>심박수</th>
                <th style={thStyle}>최근 업데이트</th>
                <th style={thStyle}>상태</th>
              </tr>
            </thead>
            <tbody>
              {displayUsers.map((user) => {
                const sc = statusConfig(user);
                return (
                  <tr key={user.id} style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: user.status === 'emergency' || user.status === 'rescue' ? '#fef2f2' : user.status === 'warning' ? '#fffbeb' : user.status === 'resolved' ? '#eff6ff' : 'white',
                    borderLeft: user.status === 'emergency' || user.status === 'rescue' ? '4px solid #dc2626' : user.status === 'warning' ? '4px solid #d97706' : user.status === 'resolved' ? '4px solid #3b82f6' : '4px solid transparent',
                  }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: user.status === 'emergency' || user.status === 'rescue' ? '#dc2626' : user.status === 'warning' ? '#d97706' : user.status === 'resolved' ? '#3b82f6' : '#16a34a',
                          color: 'white', fontWeight: 700, fontSize: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {user.name[0]}
                        </div>
                        <Link to={`/users/${user.id}`} style={{ color: '#1e293b', textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>
                          {user.name}
                        </Link>
                      </div>
                    </td>
                    <td style={tdStyle}>{user.age ? `${user.age}세` : '—'}</td>
                    <td style={{
                      ...tdStyle,
                      color: user.status === 'emergency' || user.status === 'rescue' ? '#dc2626' : user.status === 'warning' ? '#d97706' : user.status === 'resolved' ? '#1d4ed8' : '#1e293b',
                      fontWeight: user.status === 'emergency' || user.status === 'rescue' || user.status === 'warning' ? 700 : 400,
                    }}>
                      {user.latest_heart_rate != null
                        ? `${Math.round(user.latest_heart_rate)} bpm`
                        : `${user.baseline_bpm} bpm`}
                    </td>
                    <td style={tdStyle}>
                      {user.last_health_at
                        ? formatRelativeTime(user.last_health_at)
                        : '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      }}>
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {users.length > 5 && (
                <tr>
                  <td colSpan={5} style={{ padding: '12px 20px', textAlign: 'center' }}>
                    <Link to="/users" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>
                      · · · {users.length - 5}명 더보기 (농업인 관리)
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 오른쪽: 지도 */}
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>지도 뷰 — 실시간 위치</span>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <KakaoMapView markers={mapMarkers} height={480} />
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13, color: '#1e293b' };