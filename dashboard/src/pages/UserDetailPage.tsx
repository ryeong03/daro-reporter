import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Alert, CallLog } from '../api/client';
import { KakaoMapView } from '../components/KakaoMapView';

interface UserDetail {
  id: string;
  name: string;
  phone: string;
  gender: string | null;
  birth_date: string | null;
  device_id: string;
  baseline_bpm: number;
  baseline_updated_at: string;
  guardians: { name: string; phone: string; relation: string | null }[];
  latest_location: { lat: number; lng: number; timestamp: string } | null;
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/users/${id}`).then((r) => r.data),
      api.get('/alert', { params: { user_id: id, limit: 10 } }).then((r) => r.data.alerts),
    ])
      .then(([userData, alertData]) => {
        setUser(userData);
        setAlerts(alertData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const mapMarkers = useMemo(() => {
    if (!user?.latest_location) return [];
    return [
      {
        id: user.id,
        name: user.name,
        lat: user.latest_location.lat,
        lng: user.latest_location.lng,
        subtitle: `최근 위치 · ${new Date(user.latest_location.timestamp).toLocaleString('ko-KR')}`,
      },
    ];
  }, [user]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>;
  if (!user) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>사용자를 찾을 수 없습니다</div>;

  return (
    <div>
      <Link to="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>← 목록으로</Link>

      {/* 상단 알림 배너 */}
      <div style={{
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 8,
        padding: '12px 20px',
        marginTop: 16,
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 14 }}>
          🔴 이상 감지 발생 중 — AI 콜 발신 중 · 오후 2:41
        </span>
        <button style={{
          background: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          padding: '6px 16px',
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          출동
        </button>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 개인정보 카드 */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{user.name}</h2>
          <div style={infoRow}><span style={labelStyle}>연락처</span><span>{user.phone}</span></div>
          <div style={infoRow}><span style={labelStyle}>성별</span><span>{user.gender === 'male' ? '남' : user.gender === 'female' ? '여' : '—'}</span></div>
          <div style={infoRow}><span style={labelStyle}>생년월일</span><span>{user.birth_date || '—'}</span></div>
          <div style={infoRow}><span style={labelStyle}>디바이스</span><span>{user.device_id}</span></div>
          <div style={infoRow}><span style={labelStyle}>기준선</span><span>{user.baseline_bpm} bpm</span></div>
          <div style={infoRow}><span style={labelStyle}>기준선 갱신</span><span>{new Date(user.baseline_updated_at).toLocaleDateString('ko-KR')}</span></div>
        </div>

        {/* 보호자 카드 */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>보호자</h3>
          {user.guardians.length > 0 ? (
            user.guardians.map((g, i) => (
              <div key={i} style={{ ...infoRow, borderBottom: '1px solid #f1f5f9', paddingBottom: 8, marginBottom: 8 }}>
                <span>{g.name} ({g.relation || '관계 미입력'})</span>
                <span style={{ color: '#64748b' }}>{g.phone}</span>
              </div>
            ))
          ) : (
            <span style={{ color: '#94a3b8' }}>등록된 보호자 없음</span>
          )}
        </div>
      </div>

      {/* 현재 상태 카드 */}
      {alerts.length > 0 && (
  <div style={{ ...cardStyle, marginTop: 24, background: '#fef2f2', border: '1px solid #fecaca' }}>
    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#dc2626' }}>🚨 현재 상태 — 이상감지</h3>
    <div style={infoRow}>
      <span style={labelStyle}>이벤트 유형</span>
      <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 16 }}>
        {alerts[0].event_type === 'heatstroke' ? '열사병' : alerts[0].event_type === 'syncope' ? '실신' : '낙상'}
      </span>
    </div>
    <div style={infoRow}>
      <span style={labelStyle}>감지 시각</span>
      <span>{new Date(alerts[0].created_at).toLocaleString('ko-KR')}</span>
    </div>
  </div>
)}

      {/* AI 콜 이력 */}
<div style={{ ...cardStyle, marginTop: 24 }}>
  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>AI 콜 이력</h3>
  {alerts.length > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', marginTop: 4, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#dc2626' }}>이상 감지</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            {new Date(alerts[0].created_at).toLocaleString('ko-KR')} · {alerts[0].event_type === 'fall' ? '낙상' : alerts[0].event_type === 'heatstroke' ? '열사병' : '실신'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', marginTop: 4, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>AI 콜 1차 발신</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>발신 중...</div>
        </div>
      </div>
    </div>
  ) : (
    <span style={{ color: '#94a3b8' }}>콜 이력 없음</span>
  )}
</div>
      {/* 알림 이력 */}
      <div style={{ ...cardStyle, marginTop: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>최근 알림 이력</h3>
        {alerts.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ ...thStyle, paddingLeft: 0 }}>시각</th>
                <th style={thStyle}>유형</th>
                <th style={thStyle}>상태</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ ...tdStyle, paddingLeft: 0 }}>{new Date(a.created_at).toLocaleString('ko-KR')}</td>
                  <td style={tdStyle}>{a.event_type}</td>
                  <td style={tdStyle}>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <span style={{ color: '#94a3b8' }}>이력 없음</span>
        )}
      </div>

      {/* 하단 버튼 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button style={{ flex: 1, background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, padding: '14px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          🚨 출동 지시
        </button>
        <button style={{ flex: 1, background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
          📞 보호자 전화
        </button>
        <button style={{ flex: 1, background: 'white', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, padding: '14px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
          ✅ 오탐 처리
        </button>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const infoRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 };
const labelStyle: React.CSSProperties = { color: '#64748b', fontWeight: 500 };
const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' };
const tdStyle: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };