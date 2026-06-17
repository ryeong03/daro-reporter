/** 경북 청도군 각남면 다로리 — backend DEFAULT_LAT/LNG 와 동일 */
const DARO_CENTER = { lat: 35.6478, lng: 128.7341 };

let loadPromise: Promise<typeof kakao> | null = null;

export function getDefaultCenter() {
  return DARO_CENTER;
}

export function loadKakaoMaps(appKey: string): Promise<typeof kakao> {
  if (!appKey || appKey.includes('your-')) {
    return Promise.reject(new Error('REACT_APP_KAKAO_MAP_KEY 가 없습니다.'));
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const fail = (message: string) => {
      loadPromise = null;
      reject(new Error(message));
    };

    const onReady = () => {
      if (!window.kakao?.maps?.load) {
        fail(
          '카카오맵 SDK는 로드됐지만 maps API를 사용할 수 없습니다. JavaScript 키와 카카오맵 사용 설정을 확인하세요.'
        );
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao));
    };

    if (window.kakao?.maps) {
      onReady();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;
    script.onload = onReady;
    script.onerror = () =>
      fail(
        '카카오맵 SDK 로드 실패 — developers.kakao.com → 앱 → 플랫폼 → Web 에 ' +
          '브라우저 주소창과 같은 URL(예: http://localhost:3000)을 사이트 도메인으로 등록했는지 확인하세요. ' +
          'JavaScript 키를 사용해야 합니다(REST 키 X).'
      );
    document.head.appendChild(script);
  });

  return loadPromise;
}
