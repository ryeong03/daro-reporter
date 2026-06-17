import React, { useCallback, useEffect, useState } from 'react';
import { fetchDemoInfo, resetDemo, triggerDemoFall, DemoInfo } from '../api/client';

interface Props {
  onChanged?: () => void;
}

export function DemoPanel({ onChanged }: Props) {
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
      onChanged?.();
      window.setTimeout(() => onChanged?.(), 2000);
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
      onChanged?.();
    } catch {
      setMessage('❌ 초기화 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
      border: '1px solid #bfdbfe',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 24,
      boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>🎬 시연 모드</div>
          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
            대상: <strong>{info?.user.name ?? '—'}</strong>
            {info?.user.phone ? ` (${info.user.phone})` : ''}
            {info?.active_alert ? ` · 진행 중 알림 #${info.active_alert.id}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleFall}
            disabled={loading}
            style={{
              background: '#dc2626', color: 'white', border: 'none', borderRadius: 8,
              padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? '처리 중…' : '1. 낙상 시연 시작 (전화 발신)'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            style={{
              background: 'white', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: 8,
              padding: '10px 16px', fontWeight: 600, fontSize: 13, cursor: loading ? 'wait' : 'pointer',
            }}
          >
            2. 시연 종료 (초기화)
          </button>
        </div>
      </div>
      {message && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#334155', fontWeight: 600 }}>{message}</div>
      )}
      {info?.script && (
        <ol style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
          {info.script.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
