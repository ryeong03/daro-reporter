import axios from 'axios';

interface AddressResult {
  address: string;
  roadAddress: string | null;
}

/**
 * 카카오맵 API: GPS 좌표 → 주소 변환 (역지오코딩)
 */
export async function coordToAddress(lat: number, lng: number): Promise<AddressResult | null> {
  const apiKey = process.env.KAKAO_MAP_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await axios.get('https://dapi.kakao.com/v2/local/geo/coord2address.json', {
      params: { x: lng, y: lat },
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });

    const documents = response.data?.documents;
    if (!documents || documents.length === 0) return null;

    const doc = documents[0];
    return {
      address: doc.address?.address_name || '',
      roadAddress: doc.road_address?.address_name || null,
    };
  } catch (err) {
    console.error('[kakao-map] Reverse geocoding failed:', err);
    return null;
  }
}
