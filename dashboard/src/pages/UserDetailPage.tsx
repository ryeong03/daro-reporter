import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Alert, fetchUsers, User } from '../api/client';
import { KakaoMapView } from '../components/KakaoMapView';
import { alertStatusLabel, eventTypeLabel, findInProgressAlert, isInProgressAlert } from '../utils/alertStatus';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

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
  const [displayStatus, setDisplayStatus] = useState<User['status']>('normal');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get(`/users/${id}`).then((r) => r.data),
      api.get('/alert', { params: { user_id: id, limit: 20 } }).then((r) => r.data.alerts as Alert[]),
      fetchUsers(),
    ])
      .then(([userData, alertData, users]) => {
        setUser(userData);
        setAlerts(alertData);
        setDisplayStatus(users.find((u) => u.id === id)?.status ?? 'normal');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const activeAlert = useMemo(() => findInProgressAlert(alerts), [alerts]);
  const recentClosedEmergency = useMemo(
    () => alerts.find((a) => a.status === 'closed_emergency') ?? null,
    [alerts],
  );

  const handleFalseAlarm = async () => {
    if (!activeAlert) return;
    if (!window.confirm('오탐 처리하시겠습니까?')) return;
    try {
      await api.patch(`/alert/${activeAlert.id}`, { status: 'false_alarm' });
      load();
    } catch {
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  const handleGuardianCall = () => {
    if (user?.guardians[0]?.phone) {
      window.open(`tel:${user.guardians[0].phone}`);
    } else {
      alert('등록된 보호자가 없습니다.');
    }
  };

  const handleEmergency = async () => {
    const target = activeAlert ?? recentClosedEmergency;
    if (!target) return;
    if (!window.confirm('출동 지시하시겠습니까?')) return;
    try {
      await api.patch(`/alert/${target.id}`, { status: 'closed_emergency' });
      load();
    } catch {
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  const mapMarkers = useMemo(() => {
    if (!user?.latest_location) return [];
    return [{
      id: user.id,
      name: user.name,
      lat: user.latest_location.lat,
      lng: user.latest_location.lng,
      status: displayStatus,
      subtitle: `최근 위치 · ${new Date(user.latest_location.timestamp).toLocaleString('ko-KR')}`,
    }];
  }, [user, displayStatus]);

  const bpmData = useMemo(() => {
    const baseline = user?.baseline_bpm || 75;
    const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
    return hours.map((time, i) => ({
      time,
      bpm: Math.round(baseline + (Math.random() * 10 - 5) + (i === hours.length - 1 ? 60 : 0)),
    }));
  }, [user]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>;
  if (!user) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>사용자를 찾을 수 없습니다</div>;

  return (
    <div>
      <Link to="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>← 목록으로</Link>

      {/* 상단 알림 배너 — 진행 중 알림만 */}
      {activeAlert && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '12px 20px', marginTop: 16, marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 14 }}>
            🔴 이상 감지 발생 중 — {eventTypeLabel(activeAlert.event_type)} · {new Date(activeAlert.created_at).toLocaleString('ko-KR')}
          </span>
          <button onClick={handleEmergency} style={{
            background: '#dc2626', color: 'white', border: 'none',
            borderRadius: 6, padding: '6px 16px', fontWeight: 600, cursor: 'pointer',
          }}>출동</button>
        </div>
      )}

      {!activeAlert && recentClosedEmergency && (
        <div style={{
          background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '12px 20px', marginTop: 16, marginBottom: 20,
          fontSize: 14, color: '#b91c1c', fontWeight: 600,
        }}>
          🔴 응급 처리 완료 — {eventTypeLabel(recentClosedEmergency.event_type)} · 보건소 알림 발송됨
        </div>
      )}

      {/* 2단 레이아웃 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* 왼쪽 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 개인정보 */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: '#1e293b',
                color: 'white', fontWeight: 700, fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{user.name[0]}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{user.name}</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  {user.gender === 'male' ? '남' : user.gender === 'female' ? '여' : '—'} · {user.birth_date ? `${new Date().getFullYear() - new Date(user.birth_date).getFullYear()}세` : '—'}
                </div>
              </div>
            </div>
            <div style={infoRow}><span style={labelStyle}>연락처</span><span>{user.phone}</span></div>
            <div style={infoRow}><span style={labelStyle}>디바이스</span><span>{user.device_id}</span></div>
            <div style={infoRow}><span style={labelStyle}>기준선</span><span>{user.baseline_bpm} bpm</span></div>
            <div style={infoRow}><span style={labelStyle}>기준선 갱신</span><span>{new Date(user.baseline_updated_at).toLocaleDateString('ko-KR')}</span></div>
          </div>

          {/* 현재 상태 카드 */}
          {(activeAlert || recentClosedEmergency) && (
            <div style={{ ...cardStyle, background: '#fef2f2', border: '1px solid #fecaca' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#dc2626' }}>
                🚨 현재 상태 — {activeAlert ? '이상감지' : '응급 처리 완료'}
              </h3>
              {(() => {
                const current = activeAlert ?? recentClosedEmergency!;
                return (
                  <>
                    <div style={infoRow}>
                      <span style={labelStyle}>이벤트 유형</span>
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>
                        {eventTypeLabel(current.event_type)}
                      </span>
                    </div>
                    <div style={infoRow}>
                      <span style={labelStyle}>감지 시각</span>
                      <span>{new Date(current.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                    <div style={infoRow}>
                      <span style={labelStyle}>상태</span>
                      <span>{alertStatusLabel(current.status)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* AI 콜 이력 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>AI 콜 이력</h3>
            {activeAlert ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#dc2626' }}>이상 감지</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      {new Date(activeAlert.created_at).toLocaleString('ko-KR')} · {eventTypeLabel(activeAlert.event_type)}
                    </div>
                  </div>
                </div>
                {isInProgressAlert(activeAlert) && activeAlert.status === 'calling' && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>AI 콜 진행 중</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span style={{ color: '#94a3b8' }}>진행 중인 AI 콜 없음</span>
            )}
          </div>

          {/* 최근 알림 이력 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>과거 이벤트 이력</h3>
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
                      <td style={tdStyle}>{eventTypeLabel(a.event_type)}</td>
                      <td style={tdStyle}>{alertStatusLabel(a.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <span style={{ color: '#94a3b8' }}>이력 없음</span>
            )}
          </div>
        </div>

        {/* 오른쪽 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 지도 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>현재 위치</h3>
            <KakaoMapView markers={mapMarkers} height={240} emptyMessage="아직 GPS 기록이 없습니다." />
          </div>

          {/* 심박수 그래프 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>오늘 심박수 추이</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={bpmData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip />
                <ReferenceLine y={user?.baseline_bpm} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: '기준선', fill: '#94a3b8', fontSize: 11 }} />
                <Line type="monotone" dataKey="bpm" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 보호자 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>보호자</h3>
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
      </div>

      {/* 하단 버튼 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          onClick={handleEmergency}
          disabled={!activeAlert && !recentClosedEmergency}
          style={{
            flex: 1, background: '#dc2626', color: 'white', border: 'none', borderRadius: 8,
            padding: '14px', fontWeight: 700, fontSize: 15,
            cursor: activeAlert || recentClosedEmergency ? 'pointer' : 'not-allowed',
            opacity: activeAlert || recentClosedEmergency ? 1 : 0.5,
          }}
        >
          🚨 출동 지시
        </button>
        <button onClick={handleGuardianCall} style={{ flex: 1, background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
          📞 보호자 전화
        </button>
        <button
          onClick={handleFalseAlarm}
          disabled={!activeAlert}
          style={{
            flex: 1, background: 'white', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8,
            padding: '14px', fontWeight: 600, fontSize: 15,
            cursor: activeAlert ? 'pointer' : 'not-allowed',
            opacity: activeAlert ? 1 : 0.5,
          }}
        >
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