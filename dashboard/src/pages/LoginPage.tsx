import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { setAdminToken } from '../auth/session';

export function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/admin/login', { password });
      setAdminToken(data.token);
      navigate('/', { replace: true });
    } catch {
      setError('비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%)', padding: 24,
    }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%', maxWidth: 400, background: 'white', borderRadius: 16,
        padding: '32px 28px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: '#3b82f6',
          color: 'white', fontWeight: 800, fontSize: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>H</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Hero 보건소 관리</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>관리자 비밀번호로 로그인하세요.</p>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{
              display: 'block', width: '100%', marginTop: 6, padding: '12px 14px',
              borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 15, boxSizing: 'border-box',
            }}
          />
        </label>

        {error && (
          <div style={{ marginTop: 12, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', marginTop: 20, padding: '12px 16px', borderRadius: 8, border: 'none',
            background: '#2563eb', color: 'white', fontWeight: 700, fontSize: 15,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </div>
  );
}
