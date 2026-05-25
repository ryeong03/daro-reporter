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
| `POST /health` | 심박+걸음수+GPS 전송 (10분 주기) |
| `POST /alert` | 낙상/이벤트 전송 (즉시) |

서버: `https://daro-reporter-production.up.railway.app`
