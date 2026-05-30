## Kotlin 네이티브 마이그레이션 플랜 (RN → Android)

### 0) 현재 RN이 제공하는 기능 요약

- **등록/저장**: `POST /users/register` 후 `user_id`, `device_id`, `baseline_bpm` 등을 로컬 저장
- **Health Connect**: 심박/걸음 Read 권한 요청 후 최근 10분 데이터를 읽음
- **GPS**: 기본 5분, 이상 감지 시 30초 간격으로 위치 수집
- **주기 전송**: 10분마다 `/health` 전송, 실패 시 오프라인 큐에 적재 후 재전송
- **이상 감지 대응**: 서버 응답 `detection.triggered` 시 “알림 문구 변경 + GPS alert 모드” 전환
- **Foreground 알림**: 지속 알림으로 백그라운드 실행 유지

---

### 1) Kotlin 네이티브 아키텍처 (권장)

- **UI**: Jetpack Compose (화면: Onboarding / Home / Settings)
- **데이터**:
  - 네트워크: Retrofit + Kotlinx Serialization
  - 로컬 저장: DataStore(Preferences) + (필요 시) Room
  - 오프라인 큐: 1차는 DataStore(JSON) 또는 Room 테이블(권장)
- **백그라운드/서비스**:
  - **정확한 10분 주기**를 유지하려면: ForegroundService 내부 코루틴 루프 + Notification
  - WorkManager는 주기 작업 최소 15분 제한이 있으므로 “보조/복구용”으로 사용
- **Health Connect**: `HealthConnectClient`로 ReadRecords
- **Location**: FusedLocationProviderClient
- **권한**: 런타임 권한 + 백그라운드 위치 “항상 허용” 플로우 설계

---

### 2) 단계별 이전 전략

#### Phase A — 네이티브 앱 골격 + 서버 연동 (1~2일)
- Compose 앱 생성, API 클라이언트 구축
- Onboarding에서 등록 성공 → DataStore 저장까지 완료
- Home/Settings는 RN과 동일 수준의 “표시만” 우선

#### Phase B — Health Connect + GPS 단독 수집 (2~4일)
- Health Connect 권한/초기화/심박·걸음 읽기 구현
- GPS 권한/수집 구현 (정상 5분)

#### Phase C — 주기 전송 + 오프라인 큐 + 상태 전이 (3~5일)
- 10분 전송 루프 구현(우선 ForegroundService)
- 전송 실패 시 큐 적재 / 성공 시 flush
- 서버 응답에 따라 상태(state/triggered) 반영 및 GPS 30초 모드 전환

#### Phase D — 운영 품질 (지속)
- 배터리 최적화(제외 안내), 백그라운드 정책 대응
- 크래시/로그 수집, 재부팅 후 자동 재개(BOOT_COMPLETED)
- 실기기(Play Services)에서 Health Connect/위치/서비스 지속성 검증

---

### 3) 리스크/주의사항

- **WorkManager 주기 최소 15분**: RN의 10분과 1:1 매칭이 안 됨 → ForegroundService 중심 설계 필요
- **백그라운드 위치**: Android 10+에서 “항상 허용” 유도 UX가 중요
- **Health Connect**: 기기/OS/Play Services 조건 영향 큼 → 실기기 테스트 필수

