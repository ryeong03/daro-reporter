## Android Native (Kotlin) 앱

React Native(`mobile/`)를 Kotlin 네이티브로 마이그레이션하기 위한 신규 Android 앱 프로젝트다.

### 목표 기능 (RN과 동등)

- 사용자 등록/로컬 저장 (RN: `OnboardingScreen` + `AsyncStorage`)
- Health Connect에서 심박/걸음 읽기 (RN: `src/services/healthConnect.ts`)
- GPS 수집 (정상 5분, 이상 30초) (RN: `src/services/locationService.ts`)
- 주기적 서버 전송 + 오프라인 큐 (RN: `src/services/dataSync.ts`)
- Foreground 알림(백그라운드 유지) (RN: `src/services/backgroundService.ts`)

### 실행

Android Studio에서 `android-native/` 폴더를 열고 Gradle Sync 후 실행한다.

> 참고: 이 폴더는 **텍스트 기반 스캐폴딩만** 커밋되어 있고, `gradle-wrapper.jar` 같은 바이너리는 포함하지 않는다.  
> 만약 Gradle Wrapper 관련 오류가 나면 프로젝트 루트(`android-native/`)에서 아래로 wrapper를 생성하면 된다.
>
> ```bash
> gradle wrapper --gradle-version 8.7
> ```

> 주의: WorkManager의 주기 작업은 최소 15분 제한이 있어서, RN의 10분 주기를 정확히 맞추려면 ForegroundService 기반 루프(또는 AlarmManager 조합)가 필요하다. 이 프로젝트는 기본 뼈대에서 WorkManager를 먼저 붙이고, 다음 단계에서 ForegroundService 기반의 “실시간 모니터링 모드”로 확장한다.

