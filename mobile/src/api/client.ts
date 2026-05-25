import axios from 'axios';
import type {
  RegisterRequest,
  RegisterResponse,
  HealthDataRequest,
  HealthDataResponse,
  AlertRequest,
  AlertResponse,
} from './types';

const API_BASE_URL = 'https://daro-reporter-production.up.railway.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export async function registerUser(data: RegisterRequest): Promise<RegisterResponse> {
  const res = await api.post<RegisterResponse>('/users/register', data);
  return res.data;
}

export async function sendHealthData(data: HealthDataRequest): Promise<HealthDataResponse> {
  const res = await api.post<HealthDataResponse>('/health', data);
  return res.data;
}

export async function sendAlert(data: AlertRequest): Promise<AlertResponse> {
  const res = await api.post<AlertResponse>('/alert', data);
  return res.data;
}

export default api;
