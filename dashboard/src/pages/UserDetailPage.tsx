import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Alert, User } from '../api/client';
import { KakaoMapView } from '../components/KakaoMapView';
import {
  findActiveIncident,
  findRecentResolved,
  findRescueAlert,
  alertStatusLabel,
  eventTypeLabel,
} from '../utils/alertStatus';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

interface UserDetail {
  id: string;
  name: string;
  phone: string;
  gender: string | null;
  birth_date: string | null;
  age?: number | null;
  device_id: string;
  baseline_bpm: number;
  baseline_updated_at: string;
  status: User['status'];
  status_label?: string;
  latest_heart_rate?: number | null;
  last_health_at?: string | null;
  guardians: { name: string; phone: string; relation: string | null }[];
  latest_location: { lat: number; lng: number; timestamp: string } | null;
}

type DetailSnapshot = {
  user: UserDetail;
  alerts: Alert[];
  displayStatus: User['status'];
  statusLabel: string;
  latestHeartRate: number | null;
};

const detailCache = new Map<string, DetailSnapshot>();

function HeartRateChart({
  data,
  baseline,
}: {
  data: { time: string; bpm: number }[];
  baseline: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const measure = () => {
      const next = el.clientWidth;
      if (next > 0) setWidth(next);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div ref={wrapRef} style={{ width: '100%', height: 200 }}>
      {width > 0 && (
        <LineChart width={width} height={200} data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip />
          <ReferenceLine
            y={baseline}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{ value: '기준선', fill: '#94a3b8', fontSize: 11 }}
          />
          <Line type="monotone" dataKey="bpm" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      )}
    </div>
  );
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const cached = id ? detailCache.get(id) : undefined;
  const [user, setUser] = useState<UserDetail | null>(cached?.user ?? null);
  const [alerts, setAlerts] = useState<Alert[]>(cached?.alerts ?? []);
  const [displayStatus, setDisplayStatus] = useState<User['status']>(cached?.displayStatus ?? 'normal');
  const [statusLabel, setStatusLabel] = useState(cached?.statusLabel ?? '정상');
  const [latestHeartRate, setLatestHeartRate] = useState<number | null>(cached?.latestHeartRate ?? null);
  const [initialLoading, setInitialLoading] = useState(!cached);
  const [loadError, setLoadError] = useState(false);
  const requestSeqRef = useRef(0);

  const applySnapshot = useCallback((userId: string, userData: UserDetail, alertData: Alert[]) => {
    const nextStatus = userData.status ?? 'normal';
    const nextLabel = userData.status_label ?? '정상';
    const nextHeartRate = userData.latest_heart_rate ?? null;

    setUser(userData);
    setAlerts(alertData);
    setDisplayStatus(nextStatus);
    setStatusLabel(nextLabel);
    setLatestHeartRate(nextHeartRate);
    setLoadError(false);

    detailCache.set(userId, {
      user: userData,
      alerts: alertData,
      displayStatus: nextStatus,
      statusLabel: nextLabel,
      latestHeartRate: nextHeartRate,
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!id) return;
    const seq = ++requestSeqRef.current;
    try {
      const [userData, alertData] = await Promise.all([
        api.get(`/users/${id}`).then((r) => r.data as UserDetail),
        api.get('/alert', { params: { user_id: id, limit: 20 } }).then((r) => r.data.alerts as Alert[]),
      ]);
      if (seq !== requestSeqRef.current) return;
      applySnapshot(id, userData, alertData);
    } catch {
      if (seq !== requestSeqRef.current) return;
      setLoadError(true);
    }
  }, [id, applySnapshot]);

  useEffect(() => {
    if (!id) {
      setInitialLoading(false);
      return;
    }

    const cachedSnapshot = detailCache.get(id);
    if (cachedSnapshot) {
      applySnapshot(id, cachedSnapshot.user, cachedSnapshot.alerts);
      setInitialLoading(false);
    } else {
      setInitialLoading(true);
      setUser(null);
      setAlerts([]);
    }

    const seq = ++requestSeqRef.current;

    Promise.all([
      api.get(`/users/${id}`).then((r) => r.data as UserDetail),
      api.get('/alert', { params: { user_id: id, limit: 20 } }).then((r) => r.data.alerts as Alert[]),
    ])
      .then(([userData, alertData]) => {
        if (seq !== requestSeqRef.current) return;
        applySnapshot(id, userData, alertData);
      })
      .catch(() => {
        if (seq !== requestSeqRef.current) return;
        if (!detailCache.has(id)) setLoadError(true);
      })
      .finally(() => {
        if (seq !== requestSeqRef.current) return;
        setInitialLoading(false);
      });
  }, [id, applySnapshot]);

  const activeIncident = useMemo(() => findActiveIncident(alerts), [alerts]);
  const rescueAlert = useMemo(() => findRescueAlert(alerts), [alerts]);
  const resolvedAlert = useMemo(() => findRecentResolved(alerts), [alerts]);
  const isUrgent = displayStatus === 'emergency' || displayStatus === 'rescue';
  const isResolved = displayStatus === 'resolved';
  const bannerAlert = isUrgent ? (activeIncident ?? rescueAlert) : null;

  const currentBpm = latestHeartRate ?? user?.baseline_bpm ?? 75;

  const handleFalseAlarm = async () => {
    if (!activeIncident) return;
    if (!window.confirm('오탐 처리하시겠습니까?')) return;
    try {
      await api.patch(`/alert/${activeIncident.id}`, { status: 'false_alarm' });
      refresh();
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

  const handleDispatchComplete = async () => {
    if (!rescueAlert) return;
    if (!window.confirm('출동 지시를 완료 처리할까요?')) return;
    try {
      await api.patch(`/alert/${rescueAlert.id}`, { status: 'closed_emergency' });
      refresh();
    } catch {
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  const locationTimestamp = user?.latest_location?.timestamp ?? '';

  const mapMarkers = useMemo(() => {
    if (!user?.latest_location) return [];
    const mapStatus =
      displayStatus === 'rescue' ? 'emergency'
        : displayStatus === 'resolved' ? 'resolved'
          : displayStatus;
    const subtitle = locationTimestamp
      ? `${statusLabel} · ${new Date(locationTimestamp).toLocaleString('ko-KR')}`
      : statusLabel;
    return [{
      id: user.id,
      name: user.name,
      lat: user.latest_location.lat,
      lng: user.latest_location.lng,
      status: mapStatus as 'normal' | 'warning' | 'emergency' | 'resolved',
      subtitle,
    }];
  }, [user?.id, user?.name, user?.latest_location, locationTimestamp, displayStatus, statusLabel]);

  const bpmData = useMemo(() => {
    const baseline = user?.baseline_bpm || 75;
    const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
    const showSpike = displayStatus === 'emergency' || displayStatus === 'rescue';
    const spikeBpm = latestHeartRate ?? baseline;
    return hours.map((time, i) => ({
      time,
      bpm: Math.round(
        baseline + ((i * 7) % 11) - 5 + (showSpike && i === hours.length - 1 ? spikeBpm - baseline : 0),
      ),
    }));
  }, [user?.baseline_bpm, displayStatus, latestHeartRate]);

  if (!user) {
    if (initialLoading) {
      return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>;
    }
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
        {loadError ? '데이터를 불러오지 못했습니다. 로그인 상태를 확인한 뒤 다시 시도해주세요.' : '사용자를 찾을 수 없습니다'}
      </div>
    );
  }

  return (
    <div>
      <Link to="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>← 목록으로</Link>

      {/* 상단 알림 배너 */}
      {bannerAlert && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '12px 20px', marginTop: 16, marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 14 }}>
            🔴 {bannerAlert.status === 'emergency' ? '구조 필요' : '이상 감지'} — {eventTypeLabel(bannerAlert.event_type)} · {new Date(bannerAlert.created_at).toLocaleString('ko-KR')}
          </span>
          {rescueAlert && (
            <button onClick={handleDispatchComplete} style={{
              background: '#dc2626', color: 'white', border: 'none',
              borderRadius: 6, padding: '6px 16px', fontWeight: 600, cursor: 'pointer',
            }}>출동 지시 완료</button>
          )}
        </div>
      )}

      {!bannerAlert && isResolved && resolvedAlert && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
          padding: '12px 20px', marginTop: 16, marginBottom: 20,
          fontSize: 14, color: '#1d4ed8', fontWeight: 600,
        }}>
          ✅ 처리완료 — {eventTypeLabel(resolvedAlert.event_type)}
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
                  {user.gender === 'male' ? '남' : user.gender === 'female' ? '여' : '—'} · {user.age != null ? `${user.age}세` : user.birth_date ? `${new Date().getFullYear() - new Date(user.birth_date).getFullYear()}세` : '—'}
                </div>
              </div>
            </div>
            <div style={infoRow}><span style={labelStyle}>연락처</span><span>{user.phone}</span></div>
            <div style={infoRow}><span style={labelStyle}>디바이스</span><span>{user.device_id}</span></div>
            <div style={infoRow}>
              <span style={labelStyle}>현재 심박수</span>
              <span style={{
                color: isUrgent ? '#dc2626' : '#1e293b',
                fontWeight: isUrgent ? 700 : 500,
              }}>
                {Math.round(currentBpm)} bpm
              </span>
            </div>
            <div style={infoRow}><span style={labelStyle}>기준선</span><span>{user.baseline_bpm} bpm</span></div>
            <div style={infoRow}><span style={labelStyle}>기준선 갱신</span><span>{new Date(user.baseline_updated_at).toLocaleDateString('ko-KR')}</span></div>
          </div>

          {/* 현재 상태 카드 */}
          {(bannerAlert || (isResolved && resolvedAlert)) && (
            <div style={{
              ...cardStyle,
              background: isResolved ? '#eff6ff' : '#fef2f2',
              border: isResolved ? '1px solid #bfdbfe' : '1px solid #fecaca',
            }}>
              <h3 style={{
                fontSize: 15, fontWeight: 600, marginBottom: 12,
                color: isResolved ? '#1d4ed8' : '#dc2626',
              }}>
                {isResolved ? '✅' : '🔴'} 현재 상태 — {statusLabel}
              </h3>
              {(() => {
                const current = bannerAlert ?? resolvedAlert!;
                return (
                  <>
                    <div style={infoRow}>
                      <span style={labelStyle}>이벤트 유형</span>
                      <span style={{ fontWeight: 700 }}>{eventTypeLabel(current.event_type)}</span>
                    </div>
                    <div style={infoRow}>
                      <span style={labelStyle}>감지 시각</span>
                      <span>{new Date(current.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                    <div style={infoRow}>
                      <span style={labelStyle}>상태</span>
                      <span style={{ color: isResolved ? '#1d4ed8' : '#dc2626', fontWeight: 600 }}>
                        {statusLabel}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* AI 콜 이력 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>AI 콜 이력</h3>
            {bannerAlert ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#dc2626' }}>
                      {bannerAlert.status === 'emergency' ? '구조 필요' : '이상 감지'}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      {new Date(bannerAlert.created_at).toLocaleString('ko-KR')} · {eventTypeLabel(bannerAlert.event_type)}
                    </div>
                  </div>
                </div>
                {bannerAlert.status === 'calling' && (
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
            <HeartRateChart data={bpmData} baseline={user.baseline_bpm} />
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
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={handleDispatchComplete}
          disabled={!rescueAlert}
          style={{
            flex: 1, background: '#dc2626', color: 'white', border: 'none', borderRadius: 8,
            padding: '14px', fontWeight: 700, fontSize: 15,
            cursor: rescueAlert ? 'pointer' : 'not-allowed',
            opacity: rescueAlert ? 1 : 0.5,
          }}
        >
          🚨 출동 지시 완료
        </button>
        <button onClick={handleGuardianCall} style={{ flex: 1, background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
          📞 보호자 전화
        </button>
        <button
          onClick={handleFalseAlarm}
          disabled={!activeIncident}
          style={{
            flex: 1, background: 'white', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8,
            padding: '14px', fontWeight: 600, fontSize: 15,
            cursor: activeIncident ? 'pointer' : 'not-allowed',
            opacity: activeIncident ? 1 : 0.5,
          }}
        >
          ✅ 오탐 처리
        </button>
        </div>
        {bannerAlert && !rescueAlert && (
          <p style={{ marginTop: 10, fontSize: 13, color: '#64748b', textAlign: 'center' }}>
            출동 지시 완료는 <strong>구조 필요</strong> 상태에서만 가능해요.
            {activeIncident ? ' AI 전화를 받고 구조가 필요하다고 말하면 버튼이 활성화됩니다.' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const infoRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 };
const labelStyle: React.CSSProperties = { color: '#64748b', fontWeight: 500 };
const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' };
const tdStyle: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };