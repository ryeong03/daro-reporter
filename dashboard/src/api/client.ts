import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export interface User {
  id: string;
  name: string;
  phone: string;
  device_id: string;
  baseline_bpm: number;
  created_at: string;
  status: 'normal' | 'warning' | 'emergency';
  active_alert: Alert | null;
  latest_location: { lat: number; lng: number; timestamp: string } | null;
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
