const DARO_CENTER = { lat: 35.6478, lng: 128.7341 };

let loadPromise: Promise<typeof kakao> | null = null;

export function getDefaultCenter() {
  return DARO_CENTER;
}

export function loadKakaoMaps(appKey: string): Promise<typeof kakao> {
  if (!appKey || appKey.includes('your-')) {
    return Promise.reject(new Error('REACT_APP_KAKAO_MAP_APP_KEY 가 없습니다.'));
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const onReady = () => {
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
    script.onerror = () => reject(new Error('카카오맵 SDK 로드 실패'));
    document.head.appendChild(script);
  });

  return loadPromise;
}
