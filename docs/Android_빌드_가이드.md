# Android 빌드 가이드

> Hero 모바일 앱 — Android 네이티브 빌드 환경 구축 가이드
>
> 코드는 전부 작성 완료되어 있으니, 이 가이드대로 환경만 세팅하면 됩니다.

---

## 사전 준비

| 항목 | 필요 버전 |
|---|---|
| Node.js | 18 이상 |
| Java (JDK) | 17 |
| Android Studio | 최신 (Hedgehog 이상) |
| Android SDK | API 34 (minSdk 28) |
| 실기기 | Android 9+ (Galaxy Fit 3 페어링 된 폰) |

---

## Step 1: 프로젝트 의존성 설치

```bash
cd mobile
npm install
```

---

## Step 2: Android 네이티브 폴더 생성

현재 `android/` 폴더가 없으므로 생성해야 합니다.

```bash
# 방법 1: 기존 프로젝트에 android 폴더 추가
npx react-native eject

# 방법 2: 임시 프로젝트 생성 후 android/ 복사
npx react-native init HeroTemp --version 0.76.9
cp -r HeroTemp/android ./android
rm -rf HeroTemp
```

---

## Step 3: build.gradle 설정

### `android/build.gradle`

```gradle
buildscript {
    ext {
        minSdkVersion = 28
        targetSdkVersion = 34
        compileSdkVersion = 34
    }
}
```

### `android/app/build.gradle`

아래 의존성 추가:

```gradle
dependencies {
    // Health Connect
    implementation "androidx.health.connect:connect-client:1.1.0-alpha07"
    
    // Notifee (Foreground Service)
    implementation project(':@notifee_react-native')
}
```

---

## Step 4: AndroidManifest.xml 권한 추가

`android/app/src/main/AndroidManifest.xml`에 추가:

```xml
<manifest>
    <!-- 위치 권한 -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

    <!-- Foreground Service -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_HEALTH" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

    <!-- Health Connect -->
    <uses-permission android:name="android.permission.health.READ_HEART_RATE" />
    <uses-permission android:name="android.permission.health.READ_STEPS" />
    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />

    <application ...>
        <!-- Health Connect intent filter -->
        <activity ...>
            <intent-filter>
                <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
            </intent-filter>
        </activity>

        <!-- Foreground Service 선언 (Android 14+) -->
        <service
            android:name="app.notifee.core.ForegroundService"
            android:foregroundServiceType="health|location" />
    </application>
</manifest>
```

---

## Step 5: 알림 아이콘 추가

Foreground Service 알림에 사용할 아이콘:

```bash
# 아이콘 파일을 아래 경로에 배치 (24x24 ~ 96x96 png)
android/app/src/main/res/drawable/ic_notification.png
```

> 없으면 기본 앱 아이콘으로 대체되지만, 빌드 warning이 뜰 수 있음

---

## Step 6: 빌드 & 실행

```bash
# 실기기 USB 연결 후 (USB 디버깅 ON)
cd mobile
npx react-native run-android
```

빌드 성공하면 앱이 실기기에 설치됩니다.

---

## Step 7: 실기기 테스트 체크리스트

### 7-1. Health Connect 연동 확인

1. 폰에 **Health Connect 앱** 설치 (Google Play)
2. **Galaxy Fit 3** 페어링 (Galaxy Wearable 앱)
3. Galaxy Wearable → Health Connect 데이터 공유 허용
4. Hero 앱 실행 → 온보딩 3단계 완료 → 워치 연결 화면에서 권한 수락
5. 홈 화면에서 **심박수 표시** 확인
6. 10분 뒤 **걸음수** 표시 확인

### 7-2. GPS 백그라운드 수집 확인

1. 앱 실행 상태에서 위치 권한 "항상 허용"
2. 앱을 백그라운드로 보냄
3. 5분 후 서버(Railway)에 위치 데이터 들어왔는지 확인
4. Doze 모드에서도 동작하는지 확인 (화면 꺼두고 30분 방치)

### 7-3. Foreground Service 유지 확인

1. 앱 실행 → 상단 알림바에 "모니터링 중" 알림 표시 확인
2. 앱을 최근 앱에서 스와이프 kill
3. 알림이 여전히 살아있는지 확인
4. kill 후에도 심박/GPS 데이터 수집 계속되는지 확인

### 7-4. 서버 전송 확인

1. 앱 실행 10분 후 Railway 서버 로그 확인
2. `POST /health` 요청 정상 수신되는지
3. 응답의 `detection_state`가 `normal`인지

---

## 트러블슈팅

| 증상 | 해결 |
|---|---|
| Health Connect 권한 창 안 뜸 | 폰에 Health Connect 앱 설치 확인 (Android 13 이하는 별도 설치 필요) |
| 심박수가 안 읽힘 | Galaxy Wearable → 건강 데이터 → Health Connect 공유 ON 확인 |
| Foreground Service kill됨 | 배터리 최적화에서 Hero 앱 제외 |
| 백그라운드 GPS 안 됨 | 위치 권한 "항상 허용" 확인 + 배터리 최적화 제외 |
| 빌드 에러 | `cd android && ./gradlew clean` 후 재빌드 |

---

## 참고 파일

| 파일 | 설명 |
|---|---|
| `mobile/src/services/healthConnect.ts` | Health Connect 연동 코드 |
| `mobile/src/services/locationService.ts` | GPS 위치 서비스 코드 |
| `mobile/src/services/backgroundService.ts` | Foreground Service 코드 |
| `mobile/src/services/dataSync.ts` | 데이터 동기화 코드 |
| `mobile/src/hooks/useHealthData.ts` | 전체 모니터링 오케스트레이션 |

---

*작성: 2026.05.26 세령*
