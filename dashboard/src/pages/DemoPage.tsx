import React from 'react';
import { DemoPanel } from '../components/DemoPanel';

export function DemoPage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>데모 시연</h1>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
        발표·시연용 낙상 감지 시나리오를 실행합니다. 시연 후 반드시 종료(초기화)하세요.
      </p>
      <DemoPanel />
    </div>
  );
}
