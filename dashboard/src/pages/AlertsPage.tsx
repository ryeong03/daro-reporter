import React, { useEffect, useState } from 'react';
import { fetchAlerts, fetchAlertDetail, Alert, CallLog, updateAlertStatus } from '../api/client';

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<(Alert & { call_logs: CallLog[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = () => {
    fetchAlerts()
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDismiss = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm('이 알림을 오탐으로 처리하시겠습니까?')) {
      await updateAlertStatus(id, 'false_alarm');
      setSelectedAlert(null);
      load();
    }
  };

  const handleRowClick = async (alertId: number) => {
    setDetailLoading(true);
    try {
      const detail = await fetchAlertDetail(alertId);
      setSelectedAlert(detail);
    } catch {
      setSelectedAlert(null);
    } finally {
      setDetailLoading(false);
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
      case 'triggered': return { label: '발생', color: '#dc2626', bg: '#fef2f2' };
      case 'calling': return { label: 'AI콜 중', color: '#d97706', bg: '#fffbeb' };
      case 'closed_safe': return { label: '안전 종료', color: '#16a34a', bg: '#f0fdf4' };
      case 'closed_emergency': return { label: '응급 처리', color: '#dc2626', bg: '#fef2f2' };
      case 'false_alarm': return { label: '오탐', color: '#94a3b8', bg: '#f8fafc' };
      default: return { label: status, color: '#64748b', bg: '#f8fafc' };
    }
  };

  const classificationLabel = (c: string) => {
    switch (c) {
      case 'safe': return { label: '안전', color: '#16a34a', bg: '#f0fdf4' };
      case 'emergency': return { label: '응급', color: '#dc2626', bg: '#fef2f2' };
      case 'unclear': return { label: '불명확', color: '#d97706', bg: '#fffbeb' };
      case 'no_answer': return { label: '무응답', color: '#64748b', bg: '#f1f5f9' };
      default: return { label: c || '—', color: '#64748b', bg: '#f8fafc' };
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
                <tr
                  key={alert.id}
                  onClick={() => handleRowClick(alert.id)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td style={tdStyle}>{new Date(alert.created_at).toLocaleString('ko-KR')}</td>
                  <td style={tdStyle}>{alert.users?.name || '—'}</td>
                  <td style={tdStyle}>{eventLabel(alert.event_type)}</td>
                  <td style={tdStyle}>
                    <span style={{
                      color: sl.color,
                      background: sl.bg,
                      fontWeight: 600,
                      fontSize: 12,
                      padding: '2px 10px',
                      borderRadius: 20,
                    }}>{sl.label}</span>
                  </td>
                  <td style={tdStyle}>
                    {alert.lat && alert.lng ? (
                      <a
                        href={`https://map.kakao.com/link/map/${alert.lat},${alert.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563eb', fontSize: 13 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        지도 보기
                      </a>
                    ) : '—'}
                  </td>
                  <td style={tdStyle}>
                    {(alert.status === 'triggered' || alert.status === 'calling') && (
                      <button
                        onClick={(e) => handleDismiss(e, alert.id)}
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

      {/* AI콜 상세 모달 */}
      {(selectedAlert || detailLoading) && (
        <div
          onClick={() => !detailLoading && setSelectedAlert(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 560,
              maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            {detailLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>
            ) : selectedAlert && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>알림 상세</h2>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#94a3b8' }}
                  >&times;</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  <div style={detailItem}>
                    <span style={detailLabel}>대상자</span>
                    <span style={detailValue}>{selectedAlert.users?.name || '—'}</span>
                  </div>
                  <div style={detailItem}>
                    <span style={detailLabel}>유형</span>
                    <span style={detailValue}>{eventLabel(selectedAlert.event_type)}</span>
                  </div>
                  <div style={detailItem}>
                    <span style={detailLabel}>발생 시각</span>
                    <span style={detailValue}>{new Date(selectedAlert.created_at).toLocaleString('ko-KR')}</span>
                  </div>
                  <div style={detailItem}>
                    <span style={detailLabel}>상태</span>
                    <span style={{
                      ...detailValue,
                      color: statusLabel(selectedAlert.status).color,
                      fontWeight: 600,
                    }}>{statusLabel(selectedAlert.status).label}</span>
                  </div>
                  {selectedAlert.resolved_at && (
                    <div style={{ ...detailItem, gridColumn: '1 / -1' }}>
                      <span style={detailLabel}>종료 시각</span>
                      <span style={detailValue}>{new Date(selectedAlert.resolved_at).toLocaleString('ko-KR')}</span>
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>AI콜 이력</h3>
                {selectedAlert.call_logs && selectedAlert.call_logs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedAlert.call_logs.map((log) => {
                      const cl = classificationLabel(log.classification);
                      return (
                        <div key={log.id} style={{
                          border: '1px solid #e2e8f0', borderRadius: 12, padding: 16,
                          background: '#fafbfc',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                              {log.attempt}차 시도
                            </span>
                            <span style={{
                              fontSize: 12, fontWeight: 600, padding: '2px 10px',
                              borderRadius: 20, color: cl.color, background: cl.bg,
                            }}>{cl.label}</span>
                          </div>
                          {log.stt_text && (
                            <div style={{ marginBottom: 8 }}>
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>음성 인식 결과</span>
                              <p style={{
                                margin: '4px 0 0', fontSize: 14, color: '#1e293b',
                                background: 'white', padding: '8px 12px', borderRadius: 8,
                                border: '1px solid #e2e8f0',
                              }}>"{log.stt_text}"</p>
                            </div>
                          )}
                          {log.claude_reasoning && (
                            <div>
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>AI 판단 근거</span>
                              <p style={{
                                margin: '4px 0 0', fontSize: 13, color: '#475569',
                                lineHeight: 1.5,
                              }}>{log.claude_reasoning}</p>
                            </div>
                          )}
                          <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                            {new Date(log.created_at).toLocaleString('ko-KR')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    padding: 24, textAlign: 'center', color: '#94a3b8',
                    border: '1px dashed #e2e8f0', borderRadius: 12,
                  }}>
                    AI콜 이력이 없습니다
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#1e293b' };
const detailItem: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const detailLabel: React.CSSProperties = { fontSize: 12, color: '#94a3b8', fontWeight: 500 };
const detailValue: React.CSSProperties = { fontSize: 14, color: '#1e293b' };
