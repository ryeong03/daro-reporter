import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

interface Guardian {
  name: string;
  phone: string;
  relation: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    device_id: '',
    gender: '' as '' | 'male' | 'female',
    birth_date: '',
  });
  const [guardians, setGuardians] = useState<Guardian[]>([{ name: '', phone: '', relation: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateGuardian = (index: number, field: keyof Guardian, value: string) => {
    setGuardians((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
  };

  const addGuardian = () => {
    setGuardians((prev) => [...prev, { name: '', phone: '', relation: '' }]);
  };

  const removeGuardian = (index: number) => {
    setGuardians((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.phone || !form.device_id) {
      setError('이름, 전화번호, 디바이스 ID는 필수입니다.');
      return;
    }

    const validGuardians = guardians.filter((g) => g.name && g.phone);

    setSubmitting(true);
    try {
      await api.post('/users/register', {
        ...form,
        gender: form.gender || undefined,
        birth_date: form.birth_date || undefined,
        guardians: validGuardians.length > 0 ? validGuardians : undefined,
      });
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (msg === 'Phone already registered') {
        setError('이미 등록된 전화번호입니다.');
      } else {
        setError('등록에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>농업인 등록</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>새로운 모니터링 대상자를 등록합니다.</p>

      <form onSubmit={handleSubmit}>
        {/* 기본 정보 */}
        <div style={sectionStyle}>
          <h3 style={sectionTitle}>기본 정보</h3>

          <div style={fieldRow}>
            <label style={labelStyle}>이름 *</label>
            <input
              style={inputStyle}
              placeholder="홍길동"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>

          <div style={fieldRow}>
            <label style={labelStyle}>전화번호 *</label>
            <input
              style={inputStyle}
              placeholder="01012345678"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>

          <div style={fieldRow}>
            <label style={labelStyle}>디바이스 ID *</label>
            <input
              style={inputStyle}
              placeholder="Galaxy Fit 디바이스 ID"
              value={form.device_id}
              onChange={(e) => updateField('device_id', e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={fieldRow}>
              <label style={labelStyle}>성별</label>
              <select
                style={inputStyle}
                value={form.gender}
                onChange={(e) => updateField('gender', e.target.value)}
              >
                <option value="">선택 안함</option>
                <option value="male">남</option>
                <option value="female">여</option>
              </select>
            </div>

            <div style={fieldRow}>
              <label style={labelStyle}>생년월일</label>
              <input
                style={inputStyle}
                type="date"
                value={form.birth_date}
                onChange={(e) => updateField('birth_date', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 보호자 정보 */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ ...sectionTitle, marginBottom: 0 }}>보호자 정보</h3>
            <button
              type="button"
              onClick={addGuardian}
              style={{
                background: '#eff6ff', color: '#2563eb', border: 'none',
                borderRadius: 8, padding: '6px 14px', fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              + 추가
            </button>
          </div>

          {guardians.map((g, i) => (
            <div key={i} style={{
              border: '1px solid #e2e8f0', borderRadius: 10, padding: 16,
              marginBottom: 12, background: '#fafbfc',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>보호자 {i + 1}</span>
                {guardians.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGuardian(i)}
                    style={{
                      background: 'none', border: 'none', color: '#94a3b8',
                      cursor: 'pointer', fontSize: 18,
                    }}
                  >&times;</button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: 12 }}>이름</label>
                  <input
                    style={{ ...inputStyle, fontSize: 13 }}
                    placeholder="김보호"
                    value={g.name}
                    onChange={(e) => updateGuardian(i, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 12 }}>전화번호</label>
                  <input
                    style={{ ...inputStyle, fontSize: 13 }}
                    placeholder="01098765432"
                    value={g.phone}
                    onChange={(e) => updateGuardian(i, 'phone', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 12 }}>관계</label>
                  <input
                    style={{ ...inputStyle, fontSize: 13 }}
                    placeholder="자녀"
                    value={g.relation}
                    onChange={(e) => updateGuardian(i, 'relation', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', color: '#dc2626', padding: '12px 16px',
            borderRadius: 8, fontSize: 14, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              background: '#f1f5f9', color: '#475569', border: 'none',
              borderRadius: 10, padding: '12px 24px', fontSize: 14,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? '#93c5fd' : '#2563eb', color: 'white', border: 'none',
              borderRadius: 10, padding: '12px 24px', fontSize: 14,
              fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? '등록 중...' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  background: 'white', borderRadius: 12, padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24,
};
const sectionTitle: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 16 };
const fieldRow: React.CSSProperties = { marginBottom: 16 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  background: 'white',
};
