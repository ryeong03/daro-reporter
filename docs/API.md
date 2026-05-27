# Hero API 계약 (OpenAPI)

서버·앱·대시보드가 따르는 REST API 스펙은 루트 [`openapi.yaml`](../openapi.yaml) 한 파일이 **기준(Single source of truth)** 입니다.

팀 역할·폴더 구분: [`TEAM.md`](./TEAM.md)

## 서버 URL

| 환경 | URL |
|------|-----|
| Production | `https://daro-reporter-production.up.railway.app` |
| Local | `http://localhost:3000` |

## Android 앱이 쓰는 엔드포인트

| Method | Path | 용도 |
|--------|------|------|
| POST | `/users/register` | 온보딩 등록 |
| GET | `/users/by-phone/{phone}` | 409 시 이어하기 |
| GET | `/users/{id}` | 사용자 상세 (선택) |
| POST | `/health` | 10분 헬스 전송 |
| POST | `/alert` | 낙상 등 이벤트 |

Kotlin 모델: [`ApiModels.kt`](../android-native/app/src/main/java/app/hero/heronative/data/ApiModels.kt)

## 스펙 보기

- [Swagger Editor](https://editor.swagger.io/)에 `openapi.yaml` 붙여넣기
- VS Code: OpenAPI (Swagger) 확장
- CLI: `npx @redocly/cli preview-docs openapi.yaml` (선택)

## API 변경 절차

1. `openapi.yaml` 수정
2. Nest `*.schema.ts` (Zod) 맞추기
3. Android `ApiModels.kt` / Retrofit 맞추기
4. Railway 배포 후 앱·대시보드 smoke test
