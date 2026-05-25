# API 키 시각화 (test)

`backend/.env`에 넣은 키 상태를 HTML 대시보드로 봅니다. **실제 키 전체는 표시하지 않습니다.**

## 실행

```bash
cd backend
npm install
npm run test:keys
```

생성 파일: `test/dashboard.html` → 브라우저로 열기

## 포함 내용

- 그룹별 카드 (Server, Database, Twilio, …)
- 상태: 설정됨 / 예시값 / 미설정
- 마스킹된 값 (`abcd••••••••wxyz`)
- **카카오맵 REST**, **기상청**: 설정된 경우 라이브 API 테스트 결과

`dashboard.html`은 `.gitignore` 처리되어 있습니다.
