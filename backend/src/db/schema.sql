-- Hero DB Schema (Supabase PostgreSQL)

-- 사용자 (농업인)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  device_id TEXT,
  baseline_bpm NUMERIC(5,1) DEFAULT 75.0,
  baseline_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 헬스 데이터 (Android → Backend)
CREATE TABLE IF NOT EXISTS health_data (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  heart_rate_avg NUMERIC(5,1),
  heart_rate_samples JSONB,
  steps_10min INTEGER DEFAULT 0,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  accuracy NUMERIC(5,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_data_user_ts ON health_data(user_id, timestamp DESC);

-- 알림 이벤트
CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('heatstroke', 'syncope')),
  status TEXT NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'calling', 'safe', 'emergency', 'closed_safe', 'closed_emergency')),
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_user_status ON alerts(user_id, status);

-- AI 콜 로그
CREATE TABLE IF NOT EXISTS call_logs (
  id BIGSERIAL PRIMARY KEY,
  alert_id BIGINT REFERENCES alerts(id) ON DELETE CASCADE,
  attempt INTEGER NOT NULL DEFAULT 1,
  twilio_call_sid TEXT,
  recording_url TEXT,
  stt_text TEXT,
  classification TEXT CHECK (classification IN ('safe', 'emergency', 'unclear', 'no_answer')),
  claude_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 알림 발송 로그
CREATE TABLE IF NOT EXISTS notification_logs (
  id BIGSERIAL PRIMARY KEY,
  alert_id BIGINT REFERENCES alerts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'slack', 'call')),
  recipient TEXT NOT NULL,
  payload JSONB,
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
