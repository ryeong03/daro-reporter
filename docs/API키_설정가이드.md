# API 키 설정 가이드

## AI콜은 어떻게 동작하는가?

현재 코드는 **구조만 완성된 상태**입니다. API 키가 없으면 실제 전화가 걸리거나 AI가 응답하지 않습니다.

```
[이상 감지] → [Twilio: 전화 발신] → [어르신 응답 녹음] → [Clova: 음성→텍스트] → [Claude: 판단] → [보건소 알림]
```

각 단계별로 필요한 키:

| 단계 | 서비스 | 없으면? |
|---|---|---|
| 전화 발신 + 녹음 | Twilio | 전화 안 걸림 |
| 음성 → 텍스트 | Clova Speech | STT 안 됨 |
| 텍스트 → 판단 | Claude (Anthropic) | 분류 안 됨 |
| DB 저장 | Supabase | 데이터 저장 안 됨 |
| 긴급 SMS | Twilio (동일 계정) | 문자 안 감 |
| Slack 알림 | Slack Webhook | 슬랙 알림 안 감 |
| 날씨 조회 | 기상청 | 환경 가중치 비활성 |
| 주소 변환 | 카카오맵 | GPS 좌표만 표시 |

---

## 필요한 키 전체 목록 + 발급 방법

### 1. Supabase (DB) — 필수

| 키 | 값 |
|---|---|
| `SUPABASE_URL` | 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (비공개) |

**발급 방법:**
1. https://supabase.com → New Project 생성
2. Settings → API 탭
3. `Project URL` = SUPABASE_URL
4. `service_role` (secret) = SUPABASE_SERVICE_ROLE_KEY
5. SQL Editor에서 `backend/src/db/schema.sql` 전체 복붙 실행

---

### 2. Twilio (전화 + SMS) — AI콜 핵심

| 키 | 값 |
|---|---|
| `TWILIO_ACCOUNT_SID` | AC로 시작하는 계정 SID |
| `TWILIO_AUTH_TOKEN` | 인증 토큰 |
| `TWILIO_PHONE_NUMBER` | Twilio에서 구매한 발신 번호 |
| `HEALTH_CENTER_PHONE` | 보건소 대표 전화번호 |

**발급 방법:**
1. https://www.twilio.com → 가입 (무료 트라이얼 $15 크레딧 제공)
2. Console → Account SID, Auth Token 복사
3. Phone Numbers → Buy a Number → 한국 번호 구매 (+82)
4. **중요**: Console → Voice → Geographic Permissions → Korea (South) 활성화
5. 트라이얼 계정은 인증된 번호에만 발신 가능 → Verified Caller IDs에 테스트 번호 등록

**트라이얼 제한:**
- 인증된 번호에만 전화/문자 가능
- 실 서비스 시 계정 업그레이드 필요 ($20~)

---

### 3. Clova Speech (STT) — 음성 인식

| 키 | 값 |
|---|---|
| `CLOVA_SPEECH_INVOKE_URL` | API 엔드포인트 URL |
| `CLOVA_SPEECH_SECRET` | API Secret Key |

**발급 방법:**
1. https://www.ncloud.com → 가입 + 결제 수단 등록
2. Console → AI·NAVER API → Clova Speech
3. "도메인 생성" (이름: hero-stt 등)
4. 생성된 도메인의 `Invoke URL` 복사
5. `Secret Key` 복사

**요금:** 
- 신규 가입 시 크레딧 제공
- 이후 음성 인식 시간당 과금 (테스트는 거의 무료)

---

### 4. Anthropic Claude (AI 판단) — 의도 분류

| 키 | 값 |
|---|---|
| `ANTHROPIC_API_KEY` | sk-ant-로 시작하는 키 |

**발급 방법:**
1. https://console.anthropic.com → 가입
2. Settings → API Keys → Create Key
3. 키 복사 (한 번만 보여줌, 저장 필수)

**요금:**
- 입력: $3/1M tokens, 출력: $15/1M tokens (Sonnet)
- 우리 사용량: 1건당 ~200 tokens → 1000건 판단해도 $1 이하

---

### 5. Slack Webhook — 팀 알림

| 키 | 값 |
|---|---|
| `SLACK_WEBHOOK_URL` | https://hooks.slack.com/services/... |

**발급 방법:**
1. https://api.slack.com/apps → Create New App → From scratch
2. 앱 이름: "Hero 알림", 워크스페이스 선택
3. Features → Incoming Webhooks → Activate
4. "Add New Webhook to Workspace" → 채널 선택 (#hero-alerts 등)
5. Webhook URL 복사

---

### 6. 기상청 초단기실황 API — 환경 가중치

| 키 | 값 |
|---|---|
| `KMA_API_KEY` | 인증키 (Encoding) |

**발급 방법:**
1. https://www.data.go.kr → 가입
2. "기상청_단기예보 ((구)_동네예보) 조회서비스" 검색 → 활용신청
3. 마이페이지 → 인증키 (Encoding) 복사
4. 승인까지 보통 즉시~1시간

---

### 7. 카카오맵 API — 주소 변환

| 키 | 값 |
|---|---|
| `KAKAO_MAP_API_KEY` | REST API 키 |

**발급 방법:**
1. https://developers.kakao.com → 로그인
2. 내 애플리케이션 → 애플리케이션 추가 (이름: Hero)
3. 앱 키 → REST API 키 복사
4. 플랫폼 → Web → 사이트 도메인 등록 (배포 URL)

---

## 설정 순서 (추천)

MVP를 가장 빨리 돌려보려면 이 순서로:

```
1단계: Supabase (DB 없으면 아무것도 안 됨)
  ↓
2단계: Twilio (AI콜 테스트)
  ↓
3단계: Claude API (판단 로직 확인)
  ↓
4단계: Slack (팀 알림 연동)
  ↓
5단계: Clova Speech (실제 STT 연동)
  ↓
6단계: 기상청 + 카카오맵 (부가 기능)
```

---

## .env 파일 작성법

```bash
cd backend
cp .env.example .env
```

그 다음 `.env` 파일을 열어서 각 키를 채우면 됨:

```env
PORT=3000
BASE_URL=https://your-app.up.railway.app

SUPABASE_URL=https://abcdefg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUz...

TWILIO_ACCOUNT_SID=AC1234567890abcdef
TWILIO_AUTH_TOKEN=abcdef1234567890
TWILIO_PHONE_NUMBER=+821012345678
HEALTH_CENTER_PHONE=+825412345678

CLOVA_SPEECH_INVOKE_URL=https://clovaspeech-gw.ncloud.com/recog/v1/stt/...
CLOVA_SPEECH_SECRET=abcdefghijk

ANTHROPIC_API_KEY=sk-ant-api03-abcdef...

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/xxx

KMA_API_KEY=abcdefghijklmnop==
KAKAO_MAP_API_KEY=1234567890abcdef
```

---

## 키 없이 테스트 가능한 범위

| 기능 | 키 없이 가능? | 방법 |
|---|---|---|
| 서버 실행 | ⚠️ 부분 가능 | Supabase만 있으면 API는 동작 |
| 사용자 등록 | ✅ | Supabase만 필요 |
| 헬스 데이터 수신 | ✅ | Supabase만 필요 |
| 감지 로직 테스트 | ✅ | 상태머신은 in-memory |
| AI콜 실제 발신 | ❌ | Twilio 필수 |
| STT | ❌ | Clova 필수 |
| Claude 판단 | ❌ | Anthropic 필수 |
| 대시보드 화면 | ✅ | 프론트만 실행 가능 (데이터 없을 뿐) |

---

## 비용 요약 (MVP 테스트 기준)

| 서비스 | 무료 범위 | 예상 월 비용 |
|---|---|---|
| Supabase | 500MB, 50K 요청 | $0 |
| Twilio | 트라이얼 $15 크레딧 | 이후 ~$20/월 |
| Clova Speech | 신규 크레딧 | ~$5/월 |
| Claude API | 가입 시 $5 크레딧 | ~$1/월 |
| Slack | 무료 | $0 |
| 기상청 | 무료 | $0 |
| 카카오맵 | 무료 (30만건/일) | $0 |
| Railway | $5 크레딧/월 | $0 |
| Vercel | 무료 | $0 |
| **합계** | | **~$0 (트라이얼 기간)** |
