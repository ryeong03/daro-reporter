import dotenv from 'dotenv';

dotenv.config();

import { coordToAddress } from '../src/external/kakao-map';

const DARO_LAT = 35.6478;
const DARO_LNG = 128.7341;

async function main() {
  const key = process.env.KAKAO_MAP_API_KEY;
  if (!key || key.includes('your-kakao')) {
    console.error('[test-kakao] backend/.env 에 KAKAO_MAP_API_KEY=REST_API_키 를 넣어 주세요.');
    process.exit(1);
  }

  console.log(`[test-kakao] coordToAddress(${DARO_LAT}, ${DARO_LNG}) ...`);
  const result = await coordToAddress(DARO_LAT, DARO_LNG);

  if (!result) {
    console.error('[test-kakao] 실패 — 키·REST API 활성화·좌표를 확인하세요.');
    process.exit(1);
  }

  console.log('[test-kakao] OK');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('[test-kakao]', err);
  process.exit(1);
});
