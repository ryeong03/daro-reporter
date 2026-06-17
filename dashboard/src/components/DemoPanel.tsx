import React, { useCallback, useEffect, useState } from 'react';
import { fetchDemoInfo, resetDemo, triggerDemoFall, DemoInfo } from '../api/client';

export function DemoPanel() {
  const [info, setInfo] = useState<DemoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    fetchDemoInfo()
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFall = async () => {
    if (!window.confirm(`${info?.user.name ?? '시연 대상'}님 낙상 시연을 시작할까요?\n등록된 휴대폰으로 AI 확인 전화가 갑니다.`)) {
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const result = await triggerDemoFall();
      setMessage(`✅ ${result.demo_user.name}님에게 AI 확인 전화 발신 중`);
      load();
    } catch {
      setMessage('❌ 시연 시작 실패 — 백엔드 배포 및 시연 계정을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setMessage('');
    try {
      await resetDemo();
      setMessage('✅ 시연 종료 — 대시보드 정상 상태로 복귀');
      load();
    } catch {
      setMessage('❌ 초기화 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
      <div style={cardStyle}>
        <h2 style={sectionTitle}>시연 대상</h2>
        <div style={{ fontSize: 15, color: '#1e293b', fontWeight: 600 }}>
          {info?.user.name ?? '—'}
          {info?.user.phone ? ` · ${info.user.phone}` : ''}
        </div>
        {info?.active_alert && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#d97706', fontWeight: 600 }}>
            진행 중 알림 #{info.active_alert.id} ({info.active_alert.status})
          </div>
        )}
        <p style={{ marginTop: 12, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
          위치: {info?.location?.address ?? '서울 서대문구 대현동 33-7'}
          {info?.location?.label ? ` (${info.location.label})` : ''}
          <br />
          앱 없이 AI 확인 전화만 진행됩니다.
        </p>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitle}>시연 실행</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={handleFall} disabled={loading} style={btnPrimary}>
            {loading ? '처리 중…' : '낙상 시연 시작'}
          </button>
          <button type="button" onClick={handleReset} disabled={loading} style={btnSecondary}>
            시연 종료 (초기화)
          </button>
        </div>
        {message && (
          <div style={{ marginTop: 14, fontSize: 13, color: '#334155', fontWeight: 600 }}>{message}</div>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 12,
  padding: '20px 24px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 12,
};

const btnPrimary: React.CSSProperties = {
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  padding: '11px 18px',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  background: 'white',
  color: '#1e293b',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '11px 18px',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};
