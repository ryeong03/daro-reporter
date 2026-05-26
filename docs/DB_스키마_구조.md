# DB 스키마 구조

> Supabase (PostgreSQL) 기반 · 스키마 정의: `backend/src/db/schema.sql`

---

## 테이블 관계도

```
users (1) ─┬─ (N) guardians          보호자 --NOTE: 관리자/보호자 용어 통일 필요해보임. 
            ├─ (N) health_data        심박·걸음수·GPS
            └─ (N) alerts (1) ─┬─ (N) call_logs           AI 콜 기록
                               └─ (N) notification_logs   SMS/콜 발송 기록
```

- `users` ↔ `guardians`, `health_data`, `alerts` → **`user_id`** 로 join
- `alerts` ↔ `call_logs`, `notification_logs` → **`alert_id`** 로 join
- 모든 FK에 `ON DELETE CASCADE` 적용 → 사용자 삭제 시 하위 데이터 자동 삭제
-- QUESTION: 실제로 농업인이랑 보호자가 각각 등록할 때 userid 로 조인하는거면 phone 넘버(유니크값이니까..)로 userid 찾아서 연결하는거? 아님 userid 같은 거 복붙해서 연결하는거? 

---

## 테이블별 상세

### 1. `users` — 농업인 (대상자)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | UUID | PK, auto | 사용자 고유 ID |
| `name` | TEXT | NOT NULL | 이름 |
| `phone` | TEXT | NOT NULL, UNIQUE | 전화번호 (AI콜 발신 대상) |
| `device_id` | TEXT | | Galaxy Fit 3 등 웨어러블 식별자 |
| `gender` | TEXT | `male` / `female` | 성별 |
| `birth_date` | TEXT | | 생년월일 |
| `baseline_bpm` | NUMERIC(5,1) | DEFAULT 75.0 | 개인 기준 심박수 |
| `baseline_sigma` | NUMERIC(5,1) | DEFAULT 10.0 | 심박 표준편차 |
| `baseline_updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 기준선 마지막 갱신 시각 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 등록 시각 |

### 2. `guardians` — 보호자

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `user_id` | UUID | FK → `users.id` | 어떤 농업인의 보호자인지 |
| `name` | TEXT | NOT NULL | 보호자 이름 |
| `phone` | TEXT | NOT NULL | 보호자 전화번호 |
| `relation` | TEXT | | 관계 (자녀, 배우자 등) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

> 인덱스: `idx_guardians_user(user_id)`

### 3. `health_data` — 헬스 데이터

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `user_id` | UUID | FK → `users.id` | |
| `timestamp` | TIMESTAMPTZ | NOT NULL | 측정 시각 |
| `heart_rate_avg` | NUMERIC(5,1) | | 10분 평균 심박수 |
| `heart_rate_samples` | JSONB | | 10초 단위 심박 원본 배열 |
| `steps_10min` | INTEGER | DEFAULT 0 | 10분 누적 걸음수 |
| `lat` | NUMERIC(10,7) | | GPS 위도 |
| `lng` | NUMERIC(10,7) | | GPS 경도 |
| `accuracy` | NUMERIC(5,1) | | GPS 정확도 (m) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

> 인덱스: `idx_health_data_user_ts(user_id, timestamp DESC)` — 최신 데이터 빠른 조회

### 4. `alerts` — 알림 이벤트

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `user_id` | UUID | FK → `users.id` | |
| `event_type` | TEXT | `heatstroke` / `syncope` / `fall` | 이벤트 유형 |
| `status` | TEXT | DEFAULT `triggered` | 현재 상태 (아래 표 참고) |
| `lat` | NUMERIC(10,7) | | 이상 감지 시점 위도 |
| `lng` | NUMERIC(10,7) | | 이상 감지 시점 경도 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 발생 시각 |
| `resolved_at` | TIMESTAMPTZ | | 해소 시각 |

**`status` 상태 전이:**

```
triggered → calling → safe / emergency
                    → closed_safe / closed_emergency
                    → false_alarm
```

| 상태 | 의미 |
|---|---|
| `triggered` | 이상 감지됨, 아직 미처리 |
| `calling` | AI 콜 진행 중 |
| `safe` | AI 콜 결과 안전 판정 |
| `emergency` | AI 콜 결과 응급 판정 |
| `closed_safe` | 안전으로 종료 |
| `closed_emergency` | 응급으로 종료 (보건소 알림 발송됨) |
| `false_alarm` | 오탐으로 처리 |

> 인덱스: `idx_alerts_user_status(user_id, status)`

### 5. `call_logs` — AI 콜 기록

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `alert_id` | BIGINT | FK → `alerts.id` | 어떤 알림에 대한 콜인지 |
| `attempt` | INTEGER | DEFAULT 1 | 시도 횟수 (1차, 2차…) |
| `twilio_call_sid` | TEXT | | Twilio 통화 식별자 |
| `recording_url` | TEXT | | 녹음 파일 URL |
| `stt_text` | TEXT | | Clova STT 변환 텍스트 |
| `classification` | TEXT | `safe` / `emergency` / `unclear` / `no_answer` | Claude 분류 결과 |
--QUESTION: no_answer 는 뭔가요? ai콜 자체를 안받으면 no_answer 인거죠?
| `claude_reasoning` | TEXT | | Claude 판단 근거 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

### 6. `notification_logs` — 알림 발송 기록

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `alert_id` | BIGINT | FK → `alerts.id` | |
| `channel` | TEXT | `sms` / `slack` / `call` | 발송 채널 |
| `recipient` | TEXT | NOT NULL | 수신자 (전화번호 등) |
| `payload` | JSONB | | 발송 내용 |
| `success` | BOOLEAN | DEFAULT FALSE | 발송 성공 여부 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

---

## 주요 JOIN 쿼리 예시

### 특정 사용자의 최근 알림 + AI콜 결과 조회

```sql
SELECT a.id, a.event_type, a.status, a.created_at,
       cl.classification, cl.stt_text
FROM alerts a
LEFT JOIN call_logs cl ON cl.alert_id = a.id
WHERE a.user_id = '사용자UUID'
ORDER BY a.created_at DESC;
```

### 특정 알림의 전체 처리 이력 (콜 + 알림 발송)

```sql
SELECT a.event_type, a.status,
       cl.attempt, cl.classification, cl.stt_text,
       nl.channel, nl.recipient, nl.success
FROM alerts a
LEFT JOIN call_logs cl ON cl.alert_id = a.id
LEFT JOIN notification_logs nl ON nl.alert_id = a.id
WHERE a.id = 123;
```

### 사용자 정보 + 보호자 목록

```sql
SELECT u.name, u.phone, u.baseline_bpm,
       g.name AS guardian_name, g.phone AS guardian_phone, g.relation
FROM users u
LEFT JOIN guardians g ON g.user_id = u.id
WHERE u.id = '사용자UUID';
```

---

## 참고

- **마이그레이션 시스템**: 미도입 (schema.sql 단일 파일로 관리)
- **Supabase 클라이언트**: `backend/src/db/supabase.ts` — Database 제네릭 타입 없이 사용 중
- **DB 접근**: 오직 백엔드(`backend/src/`)에서만 Supabase 직접 접근. 대시보드와 모바일은 백엔드 API 경유

---

*업데이트: 2026.05.26*
