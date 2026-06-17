/** YYYY-MM-DD 등 생년월일 문자열 → 만 나이. 파싱 실패 시 null */
export function computeAgeFromBirthDate(birthDate?: string | null): number | null {
  if (!birthDate?.trim()) return null;

  const parsed = new Date(birthDate.trim());
  if (Number.isNaN(parsed.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }

  return age >= 0 && age <= 120 ? age : null;
}
