// ─── 사용자 등록 ───

export interface Guardian {
  name: string;
  phone: string;
  relation?: string;
}

export interface RegisterRequest {
  name: string;
  phone: string;
  device_id: string;
  gender?: 'male' | 'female';
  birth_date?: string;
  guardians: Guardian[];
  heart_rate_history?: number[];
}

export interface RegisterResponse {
  user: {
    id: string;
    name: string;
    phone: string;
    device_id: string;
    gender: string | null;
    birth_date: string | null;
    baseline_bpm: number;
    created_at: string;
  };
}

// ─── 헬스 데이터 전송 ───

export interface HeartRateSample {
  t: string;
  bpm: number;
}

export interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface HealthDataRequest {
  device_id: string;
  user_id: string;
  timestamp: string;
  heart_rate: HeartRateSample[];
  steps_10min: number;
  location: LocationData;
}

// ─── POST /health (5~10분 주기 백그라운드 전송) ───

export type DetectionState =
  | 'normal'
  | 'stage1_hr_high'
  | 'stage2_waiting_inactive'
  | 'observing'
  | 'alert';

/**
 * POST /health 요청 바디.
 * Notifee Foreground Service에서 주기적으로 서버로 전송합니다.
 */
export interface HealthPostRequest {
  userId: string;
  heartRate: number;
  steps: number;
  latitude: number;
  longitude: number;
  /** ISO 8601 (예: 2026-05-27T12:00:00.000Z) */
  timestamp: string;
}

export interface HealthPostResponse {
  status: string;
  detection?: {
    state: DetectionState;
    triggered: boolean;
    eventType?: 'heatstroke' | 'syncope' | 'fall';
  };
}

/** @deprecated HealthPostRequest 사용 */
export type HealthVitalsBody = HealthPostRequest;

/** @deprecated HealthPostResponse 사용 */
export type HealthDataResponse = HealthPostResponse;

/** 낙상 등 긴급 이벤트 전송 바디 */
export interface AlertEventBody extends HealthPostRequest {
  type?: AlertType;
  message?: string;
}

// ─── 알림 전송 ───

export type AlertType = 'bt_disconnect' | 'app_crash' | 'manual' | 'fall_detected';

export interface AlertRequest {
  device_id: string;
  user_id: string;
  type: AlertType;
  timestamp: string;
  message?: string;
  location?: { lat: number; lng: number };
}

export interface AlertResponse {
  status: string;
  action?: string;
  received?: string;
}
