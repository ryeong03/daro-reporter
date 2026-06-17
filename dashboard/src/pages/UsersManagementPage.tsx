import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteUser, fetchUsers, updateUser, User } from '../api/client';

interface EditForm {
  name: string;
  phone: string;
  birth_date: string;
}

export function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<EditForm>({ name: '', phone: '', birth_date: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    setLoading(true);
    fetchUsers()
      .then(setUsers)
      .catch(() => {
        setUsers([]);
        setError('농업인 목록을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({ name: user.name, phone: user.phone, birth_date: user.birth_date ?? '' });
    setError('');
  };

  const closeEdit = () => {
    setEditing(null);
    setForm({ name: '', phone: '', birth_date: '' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    if (!form.name.trim() || form.phone.trim().length < 10) {
      setError('이름과 전화번호(10자리 이상)를 입력해주세요.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateUser(editing.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        birth_date: form.birth_date.trim() || null,
      });
      closeEdit();
      loadUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (msg?.includes('전화번호') || err.response?.status === 409) {
        setError('이미 등록된 전화번호입니다.');
      } else {
        setError('저장에 실패했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    const confirmed = window.confirm(
      `${user.name}님을 삭제할까요?\n\n연결된 보호자, 건강 데이터, 알림·AI콜 이력이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    setError('');
    try {
      await deleteUser(user.id);
      loadUsers();
    } catch {
      setError('삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link to="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>← 홈 대시보드</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginTop: 12, marginBottom: 4 }}>
          농업인 관리
        </h1>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>
          전체 {users.length}명 · 이름·휴대폰 수정 · 삭제
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
        }}>
          {error}
        </div>
      )}

      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <th style={thStyle}>이름</th>
              <th style={thStyle}>휴대폰</th>
              <th style={thStyle}>심박수</th>
              <th style={thStyle}>등록일</th>
              <th style={thStyle}>상태</th>
              <th style={{ ...thStyle, width: 200 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={tdStyle}>
                  <Link to={`/users/${user.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                    {user.name}
                  </Link>
                </td>
                <td style={tdStyle}>{user.phone}</td>
                <td style={{
                  ...tdStyle,
                  color: user.status === 'emergency' || user.status === 'rescue' ? '#dc2626' : user.status === 'warning' ? '#d97706' : '#1e293b',
                  fontWeight: user.status === 'emergency' || user.status === 'rescue' || user.status === 'warning' ? 700 : 400,
                }}>
                  {user.latest_heart_rate != null
                    ? `${Math.round(user.latest_heart_rate)} bpm`
                    : `${user.baseline_bpm} bpm`}
                </td>
                <td style={tdStyle}>
                  {new Date(user.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td style={tdStyle}>
                  <StatusBadge status={user.status} label={user.status_label} />
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => openEdit(user)} style={btnSecondary}>
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(user)}
                      disabled={deletingId === user.id}
                      style={btnDanger}
                    >
                      {deletingId === user.id ? '삭제 중…' : '삭제'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: 32 }}>
                  등록된 농업인이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={overlayStyle} onClick={closeEdit}>
          <div
            style={modalStyle}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
          >
            <h2 id="edit-user-title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              농업인 정보 수정
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              {editing.name} · AI콜 수신 번호가 함께 변경됩니다.
            </p>

            <form onSubmit={handleSave}>
              <label style={labelStyle}>
                이름
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                  required
                />
              </label>
              <label style={labelStyle}>
                휴대폰 번호
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="01012345678"
                  style={inputStyle}
                  required
                />
              </label>

              <label style={labelStyle}>
                생년월일
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button type="button" onClick={closeEdit} style={{ ...btnSecondary, flex: 1, padding: '12px' }}>
                  취소
                </button>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1 }}>
                  {saving ? '저장 중…' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, label }: { status: User['status']; label?: string }) {
  const config = {
    emergency: { bg: '#fef2f2', text: '#dc2626', label: label ?? '응급' },
    rescue: { bg: '#fef2f2', text: '#b91c1c', label: label ?? '구조 필요' },
    resolved: { bg: '#eff6ff', text: '#1d4ed8', label: label ?? '처리완료' },
    warning: { bg: '#fffbeb', text: '#d97706', label: label ?? '휴식' },
    normal: { bg: '#f0fdf4', text: '#16a34a', label: label ?? '정상' },
  }[status];

  return (
    <span style={{
      background: config.bg, color: config.text,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    }}>
      {config.label}
    </span>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 600,
};
const tdStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#1e293b' };
const btnSecondary: React.CSSProperties = {
  background: 'white', color: '#1e293b', border: '1px solid #e2e8f0',
  borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnDanger: React.CSSProperties = {
  background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
  borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnPrimary: React.CSSProperties = {
  background: '#2563eb', color: 'white', border: 'none',
  borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
};
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalStyle: React.CSSProperties = {
  background: 'white', borderRadius: 12, padding: 28, width: '100%', maxWidth: 420,
  boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 16,
};
const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 8, padding: '10px 12px',
  border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
};
