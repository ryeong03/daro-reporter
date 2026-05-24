# Hero

> Galaxy Fit 3 웨어러블로 노인의 심박·걸음수를 상시 수집하고, 이상 감지 시 AI 전화로 안전 여부를 확인한 뒤 위험으로 판단되면 보건소에 자동 콜을 발신하는 노인 안전 모니터링 서비스.

---

## 프로젝트 정보

- **이화여자대학교 2026학년도 1학기 소셜벤처창업 수업**
- **카카오–테크포임팩트 연계 프로젝트**
- **대상 지역**: 경북 청도 다로리 (응급의료센터 5분 진입권. 농어촌 평균 30~60분 취약지 대비 차별점)
- **목표**: 응급 발생 후 **최대 8분 이내** 보건소 알림 도달

---

## 서비스 한 줄 요약

농어촌 어르신의 응급 상황을, 가장 빠르게 알아채는 안전망.

---

## 핵심 가치

- **무조작 운영** — 노인은 앱을 만지지 않음. 보호자가 1회 설치 후 백그라운드 상시 실행
- **2단계 감지로 오탐 최소화** — 심박 이상 + 무활동 전환을 모두 만족해야 위험 판단
- **AI 콜 1차 필터링** — 보건소 인력 부담 줄이고, 진짜 위험 케이스만 전달

---

## 팀

| 이름 | 역할 | 연락처 |
| --- | --- | --- |
| 박세령 | AI 콜 + 백엔드 | [@ryeong03](https://github.com/ryeong03) |
| 임현진 | 헬스 데이터 (Android + Health Connect) | pogang505799@ewhain.net |
| 이주영 | UI/UX 디자인 | jinny0326@ewhain.net |
| 박채린 | QA + 고도화 기능 (Phase 2~3) | cheryn5555@gmail.com |

---

## 주요 기능

### 1. 실시간 헬스 데이터 수집
- 심박수 10초 주기 (Health Connect 경유)
- 걸음수 (10분 누적)
- GPS 위치 (정상 5분 / 이상 감지 후 30초)

### 2. 2단계 이상 감지 로직

> 청도 다로리 지역 특성(응급의료센터 5분 내 진입 가능, 농어촌 30~60분 취약지) 반영. **최대 8분 골든타임** 목표.

#### A. 심박 상승 트리거 (열사병/열탈진 의심)

| 단계 | 조건 | 지속 | 후속 |
| --- | --- | --- | --- |
| 1단계 (심박) | 개인 기준선 대비 **50% 이상 상승** | 5분 이상 | 2단계 진입 |
| 2단계 (무활동) | **걸음수 = 0** | 즉시 | 분기 관찰 진입 |
| 분기 A-1 (정상 휴식) | 2분 이내 심박 기준선 이내로 회복 | 2분 관찰 | 알림 없음, 모니터링 계속 |
| 분기 A-2 (`heatstroke`) | 2분 지나도 심박 기준선 바깥 | 2분 관찰 | **AI 전화 + 알림** |

#### B. 심박 급락 트리거 (미주신경성 실신 의심)

| 단계 | 조건 | 지속 | 후속 |
| --- | --- | --- | --- |
| 1단계 (심박) | 개인 기준선 대비 **30% 이상 급락** | 즉시 | 분기 관찰 진입 |
| 분기 B-1 (정상 휴식) | 2분 이내 심박 기준선 이내로 회복 | 2분 관찰 | 알림 없음, 모니터링 계속 |
| 분기 B-2 (`syncope`) | 2분 지나도 심박 기준선 바깥 | 2분 관찰 | **AI 전화 + 알림** |

#### C. 환경 가중치

| 조건 | 처리 |
| --- | --- |
| 체감온도 33°C 이상 | 분기 관찰 시간 **2분 → 1분 단축** |

> 기준선 정책: 앱 최초 설치 시 과거 7일 심박 데이터로 개인 기준선 산출. 신규 사용자는 임시 75bpm으로 7일 운영 후 자동 갱신.

### 3. AI 전화 분기

- Twilio Voice 발신 → Clova Speech (STT) → Claude API 의도 판단
- 분류: `safe` / `emergency` / `unclear` (3종)
- 최초 발신 무응답 → **30초 대기 후 재발신 1회** → 그래도 무응답 시 보건소 알림
- `unclear` 1차 → 재질문 1회 → 그래도 `unclear`면 `emergency` 처리 (안전 우선)
- `safe` + `emergency` 신호 동시 존재 시 `emergency` 우선

#### 통화 분기 처리

| 판단 | AI 멘트 | 처리 |
| --- | --- | --- |
| `safe` | "다행이에요. 심박이 높아서 걱정했어요. 오늘도 건강하고 안전하게 일하세요!" | 통화 종료, `closed_safe` 로그 |
| `emergency` | "알겠습니다. 지금 바로 도움을 요청하겠습니다. 잠시만 기다려 주세요." | 보건소 SMS + 대시보드 + GPS |
| `unclear` (1차) | "죄송해요, 잘 못 들었어요. 다시 한 번 여쭤보겠습니다." | 재질문 1회 |
| `unclear` (2차) | "다시 질문했으나 답을 확인할 수 없습니다. 도움을 요청할게요." | `emergency`와 동일 처리 |
| 무응답 (1회) | (재발신, 동일 멘트) | 30초 후 재발신 |
| 무응답 (2회) | "연락이 닿지 않아 도움을 요청할게요." | 보건소 자동 알림 + GPS |

#### Claude 분류 기준

- **`safe`**: "괜찮아요", "별일 없어", "그냥 넘어졌어", "쉬고 있어" 등 명확한 안전 표현
- **`emergency`**: "아파요", "못 일어나", "어지러워", "도와줘", "119", 통증/호흡곤란/쓰러짐/혼란 상태
- **`unclear`**: 단음절 반복("응..", "어.."), 침묵/웅얼거림, 상황 파악 불가("뭐야"), 맥락 벗어남, 대기 후 무응답

### 4. 보건소 자동 콜 + 알림
- `emergency` 판단 시 보건소 대표 전화 자동 발신
- 담당자 SMS + Slack Webhook 동시 발송
- 농업인 이름, 위치(GPS), 이벤트 유형 포함

### 5. 환경 가중치 (Phase 2)
- 열지수 33°C 이상 OR 폭염특보 시 노인 앱에 예방 알림
- 기상청 초단기실황 API 연동

---

## 시스템 구조

```
┌─────────────┐    BLE    ┌──────────────┐   HTTPS   ┌──────────────────┐
│ Galaxy Fit3 │ ────────► │ Android App  │ ────────► │ Backend (Node.js)│
└─────────────┘           │ (Foreground  │           │  - 감지 코어     │
                          │   Service)   │           │  - 상태머신      │
                          └──────────────┘           │  - AI 콜 트리거  │
                                                     └────────┬─────────┘
                                                              │
                                          ┌───────────────────┼───────────────────┐
                                          ▼                   ▼                   ▼
                                  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
                                  │ Twilio Voice │   │ Twilio SMS   │   │ Slack        │
                                  │ + Clova STT  │   │ (담당자 알림)│   │ Webhook      │
                                  │ + Claude API │   └──────────────┘   └──────────────┘
                                  └──────┬───────┘
                                         │ 위험 판단 시
                                         ▼
                                  ┌──────────────┐
                                  │ 보건소 대표  │
                                  │ 전화 자동 콜 │
                                  └──────────────┘
```

---

## 기술 스택

| 영역 | 선택 |
| --- | --- |
| **Android** | Kotlin, Jetpack Compose, Retrofit2, ForegroundService, WorkManager |
| **웨어러블 연동** | Health Connect (Google) — MVP / Samsung Health SDK — Phase 2~3 |
| **백엔드** | Node.js + TypeScript |
| **DB** | Supabase (관리형 PostgreSQL) |
| **AI 전화** | Twilio Voice, Clova Speech (STT), Claude API (의도 판단) |
| **통지** | Twilio SMS, Slack Incoming Webhook |
| **외부 API** | 기상청 초단기실황, Kakao Map |

> Redis는 MVP에서 제외. 상태머신/쿨다운은 in-memory + Supabase row로 처리.
>
> **Galaxy Fit 3은 RTOS 기반이라 Samsung Health SDK 직접 연동이 제한적.** MVP에서는 `Fit 3 → Samsung Health 앱 → Health Connect → 우리 앱` 경로를 사용. 직접 SDK 연동은 Phase 2~3에서 검토.

---

## 개발 우선순위

### Phase 1 — MVP (현재 작업 중)

- [ ] Backend: `/health`, `/alert` API
- [ ] Backend: 2단계 이상 감지 로직 (심박 상승 + 심박 급락 OR 분기, 5분 지속, 2분 관찰)
- [ ] Backend: 환경 가중치 (체감온도 33°C 이상 시 관찰 1분 단축)
- [ ] Backend: Twilio AI 전화 발신 + Clova STT + Claude 의도 판단 (`safe`/`emergency`/`unclear`)
- [ ] Backend: 보건소 자동 콜 + SMS + Slack Webhook
- [ ] Android: ForegroundService + Health Connect 연동 + Retrofit 통신
- [ ] Android: **앱 최초 설치 시 과거 7일 심박 데이터 연동** → 기준선 산출 (없으면 75bpm 임시 7일)
- [ ] Android: GPS 위치 수집 (정상 5분 / 이상 감지 후 30초)
- [ ] Android: 초기 설정 화면 + 상태 표시 화면
- [ ] 관리자 대시보드 (PC 전용): 농업인 목록 + 알림 이력 + 기준선 표시

### Phase 2 — 안정화

- [ ] 기준선 주간 자동 갱신
- [ ] 기상청 API 연동 및 예방 알림
- [ ] 알림 이력 조회 및 오탐 처리
- [ ] 대상자 등록/관리 화면
- [ ] 통계 화면

### Phase 3 — 고도화

- [ ] Samsung Health SDK 직접 연동 (Health Connect 우회 없이 실시간성 향상)
- [ ] 공공 API 연계 자동 출동 요청
- [ ] QR 코드 초기 등록
- [ ] 관리자 대시보드 실시간 WebSocket 연동

---

## MVP에서 의도적으로 잘라낸 것

| 잘라낸 것 | 대체 방안 |
| --- | --- |
| 사용자별 기준선 자동 갱신 (주간) | 설치 시 1회 산출 후 고정, 신규는 75bpm 7일 후 갱신 |
| 관리자 대시보드 실시간 WebSocket | PC 대시보드(폴링) + SMS + Slack Webhook 병용 |
| Samsung Health SDK 직접 연동 | Health Connect 경유 |
| Redis | in-memory + Supabase row 처리 |

---

## 핵심 인터페이스 (1차 확정 필요)

병렬 작업의 기준점이 되는 페이로드 스키마. 첫날 합의 후 변경 시 모두에게 공유.

### 1. Android → Backend: `POST /health`
```json
{
  "device_id": "string",
  "user_id": "string",
  "timestamp": "ISO8601",
  "heart_rate": [{ "t": "ISO8601", "bpm": 78 }],
  "steps_10min": 42,
  "location": { "lat": 37.5, "lng": 127.0, "accuracy": 15 }
}
```

### 2. Android → Backend: `POST /alert`
디바이스 측 이벤트 (BT 끊김 등) 통보.

### 3. Backend → 통지 모듈: 내부 함수 호출
위험 이벤트 발생 시 SMS / Slack / 보건소 콜 트리거.

---

## 프로젝트 구조 (예정)

```
.
├── backend/                 # Node.js + TypeScript
│   ├── src/
│   │   ├── api/             # /health, /alert 엔드포인트
│   │   ├── detection/       # 2단계 감지 로직
│   │   ├── state/           # 사용자 상태머신
│   │   ├── ai-call/         # Twilio + Clova STT + Claude
│   │   ├── notify/          # SMS / Slack / 보건소 콜
│   │   └── db/              # Supabase 클라이언트 + 스키마
│   └── package.json
│
├── android/                 # Kotlin + Jetpack Compose
│   ├── app/
│   │   └── src/main/
│   │       ├── java/
│   │       └── res/
│   └── build.gradle
│
├── web/                     # 프론트엔드 (Phase 2~)
│   └── ...
│
└── docs/                    # 설계 문서 / API 명세 / 회의록
```

---

## 환경 변수

`.env.example`에 전체 목록 명시 예정. 핵심:

```
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
HEALTH_CENTER_PHONE=

# AI
CLOVA_SPEECH_INVOKE_URL=
CLOVA_SPEECH_SECRET=
ANTHROPIC_API_KEY=       # Claude 의도 판단

# Notification
SLACK_WEBHOOK_URL=

# External
KMA_API_KEY=             # 기상청
KAKAO_MAP_API_KEY=
```

---

## 시작하기

> 작성 중. Phase 1 완료 시점에 채울 예정.

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev

# Android
# Android Studio에서 android/ 폴더 열기
```

---

## 참고 문서

### 기획·정책
- [AI 콜 구조 판단 기준 policy (주영)](https://www.notion.so/AI-policy-_-36a6e68639778063b61be3ebe65ce36b)
- [스레시홀드 정의 (채린)](https://www.notion.so/_-36a6e68639778054aa59dbe7febf2922)
- [기능명세서 템플릿](https://www.notion.so/3686e686397780ba99a6d069eb2ed909)
- [Userflow (Figma, 작업 중)](https://embed.figma.com/board/ShQqOIRGdtb1uX6QeY5IJy/IA-Userflow)

### 기능 명세 (페이지별)
- [농업인 - 앱 (관리)](https://www.notion.so/36a6e68639778034b4f0c62681d94813)
- [관리자 - 대시보드 (PC)](https://www.notion.so/PC-36a6e686397780609187fdd08e5b5c07)
- [관리자 - 알림](https://www.notion.so/36a6e68639778088a76cf9a0e2e2a9ee)
- [통신 명세](https://www.notion.so/36a6e6863977801aab63d1f750abcf6e)

### 기술 레퍼런스
- [Twilio Voice API 한국어 가이드 (jjeongil)](https://jjeongil.tistory.com/3150)
- [Twilio 전화솔루션 구축 (Java Spring 기반, 참고용)](https://compogetters.tistory.com/m/entry/javaspringtwilio를-이용해서-전화솔루션-구축하기-비상연락망)
- [Clova Speech (NCP)](https://www.ncloud.com/product/aiService/clovaSpeech)
- [Health Connect (Android)](https://developer.android.com/health-and-fitness/guides/health-connect)
