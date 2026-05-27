# Hero Mobile (React Native Android)

농업인 안전 모니터링 앱 — 스마트워치 심박 수집 → 서버 전송 → AI 콜 트리거

## 사전 준비

1. **Node.js 18+** 설치
2. **Android Studio** + Android SDK 설치
3. **JDK 17** 설치
4. 실기기 또는 에뮬레이터 준비 (Health Connect는 Play Services 필요)

## 설치 및 실행

```bash
cd mobile
npm install

# Android 에뮬레이터/실기기 연결 후
npm run android
```

## 권한 연동 (Health Connect + GPS)

앱 최초 실행 시 `PermissionsScreen`에서 아래 세 가지 권한을 요청합니다.

| 권한 | 용도 | 연동 |
|---|---|---|
| 심박수 (Heart Rate) | Galaxy Fit3 심박 데이터 | Health Connect |
| 걸음수 (Steps) | Galaxy Fit3 걸음 데이터 | Health Connect |
| 위치 (GPS) | 어르신 현재 위치 | react-native-geolocation-service |

### Android 네이티브 설정

- `android/app/src/main/AndroidManifest.xml` — Health Connect·GPS·Foreground Service 권한
- `MainActivity.kt` — `HealthConnectPermissionDelegate` 등록
- `PermissionsRationaleActivity.kt` — Health Connect 개인정보 안내

### Fit3 데이터 흐름

1. Galaxy Wearable에서 Fit3 연결
2. 삼성 헬스 → Health Connect 데이터 공유 ON
3. Hero 앱에서 Health Connect 심박·걸음 읽기 허용

### 백그라운드 수집 (Notifee Foreground Service)

권한 허용 후 상태바에 **「안전 모니터링 동작 중」** 알림이 고정 표시되며, 앱이 백그라운드여도 데이터를 수집합니다.

| 주기 | 수집 항목 |
|---|---|
| 10초 | Health Connect 심박·걸음 |
| 5분 | GPS + **POST /health** 서버 전송 |

### POST /health 스키마

```typescript
interface HealthPostRequest {
  userId: string;
  heartRate: number;
  steps: number;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO 8601
}
```

핵심 파일: `src/api/client.ts` (`postHealth`), `src/services/dataSync.ts`, `foregroundTask.ts`

## 프로젝트 구조

```
src/
  screens/
    OnboardingScreen.tsx    # 최초 등록 (3단계)
    HomeScreen.tsx           # 메인 대시보드
    SettingsScreen.tsx       # 설정
  api/
    client.ts               # axios API 클라이언트
    types.ts                 # 요청/응답 타입
  services/
    healthConnect.ts         # Health Connect 심박/걸음수
    locationService.ts       # GPS 위치 수집
    backgroundService.ts     # ForegroundService
    dataSync.ts              # 주기적 데이터 전송
  hooks/
    useUser.tsx              # 유저 상태 관리
  storage/
    userStorage.ts           # AsyncStorage 유저 정보
```

## API 연동

| 엔드포인트 | 용도 |
|---|---|
| `POST /users/register` | 농업인 등록 (최초 1회) |
| `POST /health` | 심박+걸음수+GPS 전송 (5분 주기) |
| `POST /alert` | 낙상/이벤트 전송 (즉시) |

서버: `https://daro-reporter-production.up.railway.app`
