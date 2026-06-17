/** 서울 서대문구 이화여대길 52 — 이화스타트업오픈스페이스 (카카오 키워드 검색 기준) */
export const EWHA_STARTUP_OPEN_SPACE = {
  lat: 37.559512,
  lng: 126.945572,
  label: '이화스타트업오픈스페이스',
};

/** 데모/테스트용 — 휴대폰 번호별 고정 위치 (GPS 무시) */
const USER_FIXED_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  '01025819543': EWHA_STARTUP_OPEN_SPACE,
};

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('82') && digits.length >= 11) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function getUserFixedLocation(
  phone?: string | null,
): { lat: number; lng: number } | null {
  if (!phone) return null;
  return USER_FIXED_LOCATIONS[normalizePhone(phone)] ?? null;
}

/** 고정 위치 유저 또는 유효한 GPS만 반환. 없으면 null (가짜 좌표 없음) */
export function resolveCoordinates(
  source?: {
    lat?: number | null;
    lng?: number | null;
  } | null,
  userPhone?: string | null,
): { lat: number; lng: number } | null {
  const fixed = getUserFixedLocation(userPhone);
  if (fixed) return { ...fixed };

  const lat = source?.lat != null ? Number(source.lat) : null;
  const lng = source?.lng != null ? Number(source.lng) : null;

  if (lat != null && lng != null && !(lat === 0 && lng === 0)) {
    return { lat, lng };
  }

  return null;
}
