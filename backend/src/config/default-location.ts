/** 서울 서대문구 대현동 33-7 (이화여대길 52) — 이화스타트업오픈스페이스 */
export const EWHA_STARTUP_OPEN_SPACE = {
  lat: 37.559512,
  lng: 126.945572,
  label: '이화스타트업오픈스페이스',
  address: '서울 서대문구 대현동 33-7',
  roadAddress: '서울 서대문구 이화여대길 52',
};

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('82') && digits.length >= 11) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

function isDemoUser(phone?: string | null, userId?: string | null): boolean {
  const demoUserId = process.env.DEMO_USER_ID?.trim();
  const demoPhone = process.env.DEMO_USER_PHONE?.trim();

  if (demoUserId && userId && userId === demoUserId) return true;
  if (demoPhone && phone && normalizePhone(phone) === normalizePhone(demoPhone)) return true;
  return false;
}

/** DEMO_USER_ID / DEMO_USER_PHONE env 로 지정된 시연 계정만 고정 좌표 사용 */
export function getUserFixedLocation(
  phone?: string | null,
  userId?: string | null,
): { lat: number; lng: number } | null {
  if (!isDemoUser(phone, userId)) return null;
  return { lat: EWHA_STARTUP_OPEN_SPACE.lat, lng: EWHA_STARTUP_OPEN_SPACE.lng };
}

/** 고정 위치 시연 유저 또는 유효한 GPS만 반환. 없으면 null */
export function resolveCoordinates(
  source?: {
    lat?: number | null;
    lng?: number | null;
  } | null,
  userPhone?: string | null,
  userId?: string | null,
): { lat: number; lng: number } | null {
  const fixed = getUserFixedLocation(userPhone, userId);
  if (fixed) return { ...fixed };

  const lat = source?.lat != null ? Number(source.lat) : null;
  const lng = source?.lng != null ? Number(source.lng) : null;

  if (lat != null && lng != null && !(lat === 0 && lng === 0)) {
    return { lat, lng };
  }

  return null;
}
