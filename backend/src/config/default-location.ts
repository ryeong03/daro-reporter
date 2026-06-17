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

export function hasValidGps(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  return (
    Number.isFinite(la) &&
    Number.isFinite(ln) &&
    !(Math.abs(la) < 0.0001 && Math.abs(ln) < 0.0001)
  );
}

function isDemoUser(
  phone?: string | null,
  userId?: string | null,
  userName?: string | null,
): boolean {
  const demoUserId = process.env.DEMO_USER_ID?.trim();
  const demoPhone = process.env.DEMO_USER_PHONE?.trim();
  const demoName = process.env.DEMO_USER_NAME?.trim() || '다로리';

  if (demoUserId && userId && userId === demoUserId) return true;
  if (demoPhone && phone && normalizePhone(phone) === normalizePhone(demoPhone)) return true;
  if (userName && userName.trim() === demoName) return true;
  return false;
}

export function getUserFixedLocation(
  phone?: string | null,
  userId?: string | null,
  userName?: string | null,
): { lat: number; lng: number } | null {
  if (!isDemoUser(phone, userId, userName)) return null;
  return { lat: EWHA_STARTUP_OPEN_SPACE.lat, lng: EWHA_STARTUP_OPEN_SPACE.lng };
}

/** 지도 표시용 — 시연 고정 좌표 우선, 없으면 최근 GPS */
export function resolveUserMapLocation(
  latestHealth: { lat?: unknown; lng?: unknown; timestamp?: string } | null | undefined,
  phone?: string | null,
  userId?: string | null,
  userName?: string | null,
): { lat: number; lng: number; timestamp?: string } | null {
  const fixed = getUserFixedLocation(phone, userId, userName);
  if (fixed) {
    return {
      lat: fixed.lat,
      lng: fixed.lng,
      ...(latestHealth?.timestamp ? { timestamp: latestHealth.timestamp } : {}),
    };
  }

  if (latestHealth && hasValidGps(latestHealth.lat, latestHealth.lng)) {
    return {
      lat: Number(latestHealth.lat),
      lng: Number(latestHealth.lng),
      ...(latestHealth.timestamp ? { timestamp: latestHealth.timestamp } : {}),
    };
  }

  return null;
}

/** 고정 위치 시연 유저 또는 유효한 GPS만 반환. 없으면 null */
export function resolveCoordinates(
  source?: {
    lat?: number | null;
    lng?: number | null;
  } | null,
  userPhone?: string | null,
  userId?: string | null,
  userName?: string | null,
): { lat: number; lng: number } | null {
  const fixed = getUserFixedLocation(userPhone, userId, userName);
  if (fixed) return { ...fixed };

  const lat = source?.lat != null ? Number(source.lat) : null;
  const lng = source?.lng != null ? Number(source.lng) : null;

  if (lat != null && lng != null && !(lat === 0 && lng === 0)) {
    return { lat, lng };
  }

  return null;
}
