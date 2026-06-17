import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { fetchDemoInfo, resetDemo, triggerDemoFall, DemoInfo } from '../api/client';

function formatDemoError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
    if (err.response?.status === 401) return '로그인이 만료됐어요. 다시 로그인해주세요.';
    if (err.code === 'ERR_NETWORK') return '백엔드에 연결할 수 없어요. Railway 배포 상태를 확인해주세요.';
  }
  return '시연 시작 실패 — 백엔드 배포 및 시연 계정을 확인해주세요.';
}

export function DemoPanel() {
  const [info, setInfo] = useState<DemoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    fetchDemoInfo()
      .then(setInfo)
      .catch((err) => {
        setInfo(null);
        setMessage(`❌ ${formatDemoError(err)}`);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFall = async () => {
    if (!info?.user) {
      setMessage('❌ 시연 대상을 불러오지 못했어요. 백엔드 배포 후 다시 시도해주세요.');
      return;
    }
    if (!window.confirm(`${info.user.name}님 낙상 시연을 시작할까요?\n등록된 휴대폰으로 AI 확인 전화가 갑니다.`)) {
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const result = await triggerDemoFall();
      setMessage(`✅ ${result.demo_user.name}님에게 AI 확인 전화 발신 중`);
      load();
    } catch (err) {
      setMessage(`❌ ${formatDemoError(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setMessage('');
    try {
      await resetDemo();
      setMessage('✅ 시연 종료 — 심박수·상태 정상으로 복귀');
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
          <button type="button" onClick={handleFall} disabled={loading || !info?.user} style={{
            ...btnPrimary,
            opacity: loading || !info?.user ? 0.5 : 1,
            cursor: loading || !info?.user ? 'not-allowed' : 'pointer',
          }}>
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
