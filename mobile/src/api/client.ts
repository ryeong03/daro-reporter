import axios from 'axios';
import type {
  RegisterRequest,
  RegisterResponse,
  HealthDataRequest,
  HealthDataResponse,
  AlertRequest,
  AlertResponse,
} from './types';

export const API_BASE_URL = 'https://daro-reporter-production.up.railway.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

export async function registerUser(data: RegisterRequest): Promise<RegisterResponse> {
  const res = await api.post<RegisterResponse>('/users/register', data);
  return res.data;
}

/** POST /health — 심박·걸음·GPS 스냅샷 전송 (backend healthPayloadSchema) */
export async function postHealth(data: HealthDataRequest): Promise<HealthDataResponse> {
  const res = await api.post<HealthDataResponse>('/health', data);
  return res.data;
}

export async function sendAlert(data: AlertRequest): Promise<AlertResponse> {
  const res = await api.post<AlertResponse>('/alert', data);
  return res.data;
}

export default api;
