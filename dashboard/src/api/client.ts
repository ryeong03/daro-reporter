import axios from 'axios';
import { clearAdminToken, getAdminToken } from '../auth/session';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let authRedirectPending = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/admin/login')) {
      clearAdminToken();
      if (!authRedirectPending && window.location.pathname !== '/login') {
        authRedirectPending = true;
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  },
);

export interface User {
  id: string;
  name: string;
  phone: string;
  age?: number | null;
  birth_date?: string | null;
  device_id: string;
  baseline_bpm: number;
  created_at: string;
  status: 'normal' | 'warning' | 'emergency' | 'rescue' | 'resolved';
  status_label?: string;
  active_alert: Alert | null;
  latest_heart_rate?: number | null;
  last_health_at?: string | null;
  latest_location: { lat: number; lng: number; timestamp?: string } | null;
}

export interface Alert {
  id: number;
  user_id: string;
  event_type: 'heatstroke' | 'syncope' | 'fall';
  status: string;
  lat: number;
  lng: number;
  created_at: string;
  resolved_at: string | null;
  action_summary?: string;
  users?: { name: string; phone: string };
}

export interface CallLog {
  id: number;
  alert_id: number;
  attempt: number;
  stt_text: string;
  classification: string;
  claude_reasoning: string;
  created_at: string;
}

export async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get('/users');
  return data.users;
}

export interface DemoInfo {
  user: { id: string; name: string; phone: string; baseline_bpm: number };
  location?: { label: string; address: string; roadAddress: string; lat: number; lng: number };
  active_alert: { id: number; status: string } | null;
}

export async function fetchDemoInfo(): Promise<DemoInfo> {
  const { data } = await api.get('/demo');
  return data;
}

export async function triggerDemoFall(): Promise<{ action: string; demo_user: { name: string; phone: string } }> {
  const { data } = await api.post('/demo/fall');
  return data;
}

export async function resetDemo(): Promise<void> {
  await api.post('/demo/reset');
}

export async function fetchAlerts(params?: { user_id?: string; status?: string }): Promise<Alert[]> {
  const { data } = await api.get('/alert', { params });
  return data.alerts;
}

export async function fetchAlertDetail(id: number): Promise<Alert & { call_logs: CallLog[]; notifications: any[] }> {
  const { data } = await api.get(`/alert/${id}`);
  return data;
}

export async function updateAlertStatus(id: number, status: string): Promise<void> {
  await api.patch(`/alert/${id}`, { status });
}

export async function updateUser(
  id: string,
  payload: { name: string; phone: string; birth_date?: string | null },
): Promise<User> {
  const { data } = await api.patch(`/users/${id}`, payload);
  return data.user;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
