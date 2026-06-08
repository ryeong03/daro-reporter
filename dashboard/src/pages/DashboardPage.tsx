import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchUsers, User } from '../api/client';
import { KakaoMapView } from '../components/KakaoMapView';

export function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case 'emergency': return { bg: '#fef2f2', text: '#dc2626', label: '응급' };
      case 'warning': return { bg: '#fffbeb', text: '#d97706', label: '주의' };
      default: return { bg: '#f0fdf4', text: '#16a34a', label: '정상' };
    }
  };

  const mapMarkers = useMemo(
    () =>
      users
        .filter((u) => u.latest_location)
        .map((u) => ({
          id: u.id,
          name: u.name,
          lat: u.latest_location!.lat,
          lng: u.latest_location!.lng,
          status: u.status,
          subtitle:
            u.status === 'emergency' ? '응급' : u.status === 'warning' ? '주의' : '정상',
        })),
    [users]
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>농업인 현황</h1>
        <span style={{ color: '#64748b', fontSize: 14 }}>총 {users.length}명</span>
      </div>
      {/* 요약 카드 */}
<div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
  {[
    { label: '전체 농업인', value: users.length, color: '#2563eb', bg: '#eff6ff' },
    { label: '정상', value: users.filter(u => u.status === 'normal').length, color: '#16a34a', bg: '#f0fdf4' },
    { label: '주의', value: users.filter(u => u.status === 'warning').length, color: '#d97706', bg: '#fffbeb' },
    { label: '응급', value: users.filter(u => u.status === 'emergency').length, color: '#dc2626', bg: '#fef2f2' },
  ].map(card => (
    <div key={card.label} style={{ flex: 1, background: card.bg, borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{card.label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
    </div>
  ))}
</div>

      <KakaoMapView markers={mapMarkers} height={320} />

      {/* 농업인 목록 테이블 */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <th style={thStyle}>이름</th>
              <th style={thStyle}>연락처</th>
              <th style={thStyle}>기준선(bpm)</th>
              <th style={thStyle}>상태</th>
              <th style={thStyle}>최근 위치</th>
              <th style={thStyle}>상세</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const sc = statusColor(user.status);
              return (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>{user.name}</td>
                  <td style={tdStyle}>{user.phone}</td>
                  <td style={tdStyle}>{user.baseline_bpm}</td>
                  <td style={tdStyle}>
                    <span style={{
                      background: sc.bg,
                      color: sc.text,
                      padding: '2px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      {sc.label}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {user.latest_location
                      ? `${user.latest_location.lat.toFixed(4)}, ${user.latest_location.lng.toFixed(4)}`
                      : '—'}
                  </td>
                  <td style={tdStyle}>
                    <Link to={`/users/${user.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: 13 }}>
                      상세보기 →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  등록된 농업인이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#1e293b' };
