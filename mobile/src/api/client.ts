import axios from 'axios';
import type {
  RegisterRequest,
  RegisterResponse,
  HealthDataRequest,
  HealthPostRequest,
  HealthPostResponse,
  AlertRequest,
  AlertResponse,
  AlertEventBody,
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

/** POST /health — 심박·걸음·GPS 스냅샷 전송 */
export async function postHealth(data: HealthPostRequest): Promise<HealthPostResponse> {
  const res = await api.post<HealthPostResponse>('/health', data);
  return res.data;
}

/** @deprecated postHealth 사용 */
export async function sendHealthData(data: HealthDataRequest): Promise<HealthPostResponse> {
  const res = await api.post<HealthPostResponse>('/health', data);
  return res.data;
}

/** @deprecated postHealth 사용 */
export async function postHealthVitals(data: HealthPostRequest): Promise<HealthPostResponse> {
  return postHealth(data);
}

export async function sendAlert(data: AlertRequest): Promise<AlertResponse> {
  const res = await api.post<AlertResponse>('/alert', data);
  return res.data;
}

export async function postAlertEvent(data: AlertEventBody): Promise<void> {
  await api.post('/alert', data);
}

export default api;
