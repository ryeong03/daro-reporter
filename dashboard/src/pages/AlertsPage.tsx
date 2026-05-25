import React, { useEffect, useState } from 'react';
import { fetchAlerts, Alert, updateAlertStatus } from '../api/client';

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetchAlerts()
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDismiss = async (id: number) => {
    if (window.confirm('이 알림을 오탐으로 처리하시겠습니까?')) {
      await updateAlertStatus(id, 'false_alarm');
      load();
    }
  };

  const eventLabel = (type: string) => {
    switch (type) {
      case 'heatstroke': return '열사병/열탈진';
      case 'syncope': return '실신';
      case 'fall': return '낙상';
      default: return type;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'triggered': return { label: '발생', color: '#dc2626' };
      case 'calling': return { label: 'AI콜 중', color: '#d97706' };
      case 'closed_safe': return { label: '안전 종료', color: '#16a34a' };
      case 'closed_emergency': return { label: '응급 처리', color: '#dc2626' };
      case 'false_alarm': return { label: '오탐', color: '#94a3b8' };
      default: return { label: status, color: '#64748b' };
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>알림 이력</h1>

      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <th style={thStyle}>시각</th>
              <th style={thStyle}>대상자</th>
              <th style={thStyle}>유형</th>
              <th style={thStyle}>상태</th>
              <th style={thStyle}>위치</th>
              <th style={thStyle}>조치</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => {
              const sl = statusLabel(alert.status);
              return (
                <tr key={alert.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>{new Date(alert.created_at).toLocaleString('ko-KR')}</td>
                  <td style={tdStyle}>{alert.users?.name || '—'}</td>
                  <td style={tdStyle}>{eventLabel(alert.event_type)}</td>
                  <td style={tdStyle}>
                    <span style={{ color: sl.color, fontWeight: 600, fontSize: 13 }}>{sl.label}</span>
                  </td>
                  <td style={tdStyle}>
                    {alert.lat && alert.lng ? (
                      <a
                        href={`https://map.kakao.com/link/map/${alert.lat},${alert.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563eb', fontSize: 13 }}
                      >
                        지도 보기
                      </a>
                    ) : '—'}
                  </td>
                  <td style={tdStyle}>
                    {(alert.status === 'triggered' || alert.status === 'calling') && (
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          padding: '4px 12px',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        오탐 처리
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  알림 이력이 없습니다
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
