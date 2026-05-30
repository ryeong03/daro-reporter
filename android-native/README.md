## Android Native (Kotlin) — Hero

React Native(`mobile/`)를 Kotlin 네이티브로 마이그레이션한 **농업인용 앱**입니다.  
UI는 [Figma Hero UI](https://www.figma.com/design/DcuaptlKGOKh5xWPvXtWoU/UI) / RN(`mobile/`)과 동일한 브랜드 컬러(`#2d6a4f`)를 사용합니다.

> **팀 분담**: 보건소 웹은 [`dashboard/`](../dashboard/) (별도 프로젝트). 역할·수정 범위는 [`docs/TEAM.md`](../docs/TEAM.md).  
> **프론트(UI)**: `ui/` · **연동**: `data/`, `monitoring/`, `health/`, `location/`

### 소스 구조

```text
app/src/main/java/app/hero/heronative/
├── MainActivity.kt, HeroApplication.kt
├── ui/              # Compose 화면 (프론트)
├── viewmodel/
├── data/            # API · DataStore (연동)
├── monitoring/      # 동기화 · FGS · Worker (연동)
├── health/          # Health Connect (연동)
└── location/        # GPS (연동)
```

### 주요 기능

- **Onboarding** (3단계): 기본 정보 → 보호자 → 워치/Health Connect 안내 후 등록
- **Home**: 심박·상태·걸음·GPS·연결 상태 (RN Home과 동일 구조)
- **Settings**: 모니터링 안내, 낙상 테스트 알림, 등록 초기화
- **세션**: DataStore 복구 — 앱 재실행 시 Home 유지
- **409 이어하기**: 이미 등록된 전화번호면 `GET /users/by-phone/:phone`으로 복구 (백엔드 배포 필요)
- **백그라운드**: ForegroundService **10분** 주기 Health Connect + GPS → `/health`
- **오프라인 큐**: 전송 실패 시 DataStore 큐 → 성공 시 flush
- **WorkManager**: 15분 보조 동기화 (FGS 보완)

### 실행

1. Android Studio에서 **`android-native/`** 폴더만 Open
2. SDK API 35, JDK 17 (Studio JBR 권장 — `gradle.properties`에 경로 설정됨)
3. Run **app** → Pixel 에뮬 또는 실기기

### 실기기 테스트

- **Health Connect** + 삼성헬스 + 워치 데이터는 **갤럭시 실기기**에서 확인
- 에뮬: UI·등록·세션·알림만 확인 가능

### 서버

- Production: `https://daro-reporter-production.up.railway.app`
- API 계약: 루트 [`openapi.yaml`](../openapi.yaml) · 설명 [`docs/API.md`](../docs/API.md)
- 신규 API: `GET /users/by-phone/:phone` — Railway에 **백엔드 배포 후** 409 이어하기 동작

### Gradle (터미널)

```bash
cd android-native
./gradlew :app:assembleDebug
```
