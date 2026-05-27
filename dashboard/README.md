# Hero Dashboard (보건소 PC)

농업인 목록·알림 이력·상세·등록 화면 — **React** 웹 앱.

> **팀 분담**: 농업인 Android 앱은 [`android-native/`](../android-native/) (별도 프로젝트).  
> 역할·수정 범위: [`docs/TEAM.md`](../docs/TEAM.md)  
> API 계약: [`openapi.yaml`](../openapi.yaml) · [`docs/API.md`](../docs/API.md)

## 실행

```bash
cd dashboard
npm install
npm start
```

로컬 백엔드: `http://localhost:3000` (Nest `npm run start:dev` in `backend/`)

## 프론트 작업 범위

| ✅ 주로 수정 | ⚠️ 연동 담당과 상의 |
|-------------|---------------------|
| `src/pages/`, `src/components/` | `src/api/` |
| 스타일·레이아웃·지도 UI | env · API base URL |

## 빌드

```bash
npm run build
```

---

아래는 Create React App 기본 안내입니다.

## Available Scripts

### `npm start`

개발 모드. 브라우저에서 확인.

### `npm test`

테스트 러너.

### `npm run build`

프로덕션 빌드 (`build/`).

### `npm run eject`

되돌릴 수 없음 — 필요할 때만.

## Learn More

- [Create React App](https://github.com/facebook/create-react-app/docs/getting-started)
- [React](https://reactjs.org/)
