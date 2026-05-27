# Hero 팀 작업 분담 · 저장소 구조

농업인 **Android 앱**과 보건소 **웹 대시보드**는 UI·프로젝트가 다르므로 **폴더를 반드시 분리**한다.  
하나의 `frontend/`에 섞지 않는다.

## 저장소 맵

```text
daro-reporter/
├── backend/           # API · DB · 이상감지 · Twilio (백엔드 / 연동)
├── android-native/    # 농업인 Android 앱 — Kotlin + Compose (프론트: 앱 UI)
├── dashboard/         # 보건소 PC 대시보드 — React (프론트: 웹 UI)
├── mobile/            # 구 React Native (참고용, 신규 기능 X)
├── openapi.yaml       # REST API 계약 (연동 담당이 관리)
└── docs/
    ├── TEAM.md        # 이 문서
    └── API.md         # OpenAPI 사용법
```

## 역할 (기본)

| 담당 | 영역 | 주요 폴더 |
|------|------|-----------|
| **연동** | 서버, 배포, API 계약, 앱↔서버 연결 | `backend/`, `openapi.yaml`, `android-native`의 `data/`, `monitoring/`, `health/`, `location/`, Manifest |
| **프론트** | 모든 **UI** (Figma 반영, 화면·컴포넌트·스타일) | `android-native/.../ui/**`, `dashboard/src/**` |

연동 담당이 PR 리뷰·머지해도 되고, 프론트는 UI PR만 올려도 된다.

---

## 프론트 팀원 — 어디를 연다

### Android 앱 (`android-native/`)

- Android Studio: **`android-native/` 폴더만** Open (루트 `daro-reporter` X)
- 실행: Run **app** · [android-native/README.md](../android-native/README.md)
- Figma: [Hero UI](https://www.figma.com/design/DcuaptlKGOKh5xWPvXtWoU/UI)

| ✅ 주로 수정 | ⚠️ 연동 담당과 상의 |
|-------------|---------------------|
| `app/.../heronative/ui/**` | `heronative/data/` |
| `viewmodel/` (UI 상태만) | `monitoring/`, `health/`, `location/` |
| | `AndroidManifest.xml`, `build.gradle.kts` |

소스 루트: `app/src/main/java/app/hero/heronative/` (패키지 `app.hero.heronative`)

### 웹 대시보드 (`dashboard/`)

```bash
cd dashboard
npm install
npm start    # http://localhost:3001 등 (package 설정 확인)
```

| ✅ 주로 수정 | ⚠️ 연동 담당과 상의 |
|-------------|---------------------|
| `src/pages/`, `src/components/`, CSS/스타일 | `src/api/` (base URL, 엔드포인트) |
| 레이아웃·지도 UI | 환경 변수·프록시 |

백엔드 로컬: `http://localhost:3000` · Production: `https://daro-reporter-production.up.railway.app`

---

## 연동 담당 — 어디를 연다

| 작업 | 위치 |
|------|------|
| API 스펙 정의·변경 | `openapi.yaml` → [API.md](./API.md) 절차 |
| 서버 구현 | `backend/src/` |
| Railway / Supabase 배포 | 인프라 (팀 내부 문서) |
| 앱 서버 URL · 세션 · 409 이어하기 | `android-native/.../data/` |
| Health Connect · GPS · 10분 전송 · FGS | `android-native/.../monitoring/`, `health/`, `location/` |
| E2E 확인 | 등록 → `/health` → 대시보드 목록/상세 |

---

## API 바꿀 때 (공통)

1. **`openapi.yaml`** 수정 (계약의 기준)
2. **`backend/`** Zod 스키마·controller 맞추기
3. **Android** `ApiModels.kt` / Retrofit (연동)
4. **Dashboard** `src/api/` (연동 또는 프론트에 스펙 전달)
5. Production 배포 후 smoke test

프론트만 UI 색·레이아웃 바꿀 때는 **openapi 수정 불필요**.

---

## PR · 브랜치 (권장)

- `feat/android/...` — `android-native/` UI
- `feat/dashboard/...` — `dashboard/` UI
- `feat/backend/...` — `backend/`
- `chore/openapi-...` — API 계약만

한 PR에 **앱 UI + 서버 스키마 + openapi** 를 섞지 않는 것을 권장.

---

## 자주 묻는 것

**Q. `frontend/` 폴더 하나로 묶으면 안 되나?**  
A. Android(Gradle)와 React(npm) 빌드가 달라서 **형제 폴더 `android-native/` + `dashboard/`** 가 일반적이다.

**Q. `mobile/` 은?**  
A. RN 레거시. 신규 기능은 **`android-native/`** 만.

**Q. KMP `shared/` 모듈?**  
A. 서버가 Nest(TS)이면 필수 아님. 계약은 **`openapi.yaml`** 로 맞춘다.

---

## 연락

- API·배포 이슈: 연동 담당
- Figma·화면 이슈: 프론트 담당 (플랫폼별로 앱 / 대시보드 구분)
