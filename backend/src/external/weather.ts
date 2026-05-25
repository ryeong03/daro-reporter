import axios from 'axios';
import { applyShortenedWindow } from '../state/state-machine';

interface WeatherData {
  temperature: number;
  humidity: number;
  feelsLike: number;
}

/**
 * 기상청 초단기실황 API 호출.
 * 체감온도가 33도 이상이면 감지 로직의 관찰 윈도우를 단축.
 */
export async function checkWeather(lat: number, lng: number): Promise<WeatherData | null> {
  const apiKey = process.env.KMA_API_KEY;
  if (!apiKey) return null;

  try {
    const { nx, ny } = convertToGrid(lat, lng);
    const now = new Date();
    const baseDate = formatDate(now);
    const baseTime = getBaseTime(now);

    const url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';
    const response = await axios.get(url, {
      params: {
        serviceKey: apiKey,
        numOfRows: 10,
        pageNo: 1,
        dataType: 'JSON',
        base_date: baseDate,
        base_time: baseTime,
        nx,
        ny,
      },
    });

    const items = response.data?.response?.body?.items?.item || [];
    let temperature = 0;
    let humidity = 0;

    for (const item of items) {
      if (item.category === 'T1H') temperature = parseFloat(item.obsrValue);
      if (item.category === 'REH') humidity = parseFloat(item.obsrValue);
    }

    const feelsLike = calculateFeelsLike(temperature, humidity);

    return { temperature, humidity, feelsLike };
  } catch (err) {
    console.error('[weather] API call failed:', err);
    return null;
  }
}

/**
 * 환경 가중치 적용: 체감온도 33도 이상 시 관찰 윈도우 단축
 */
export async function applyWeatherWeight(userId: string, lat: number, lng: number): Promise<boolean> {
  const weather = await checkWeather(lat, lng);
  if (!weather) return false;

  if (weather.feelsLike >= 33) {
    applyShortenedWindow(userId);
    console.log(`[weather] Shortened window applied for user ${userId} (feelsLike: ${weather.feelsLike}°C)`);
    return true;
  }

  return false;
}

function calculateFeelsLike(temp: number, humidity: number): number {
  // 열지수(Heat Index) 간이 계산
  if (temp < 27) return temp;
  const hi = -8.784 + 1.611 * temp + 2.338 * humidity
    - 0.1461 * temp * humidity - 0.01230 * temp * temp
    - 0.01642 * humidity * humidity + 0.002211 * temp * temp * humidity
    + 0.000725 * temp * humidity * humidity - 0.000003582 * temp * temp * humidity * humidity;
  return Math.round(hi * 10) / 10;
}

/**
 * 위경도 → 기상청 격자 좌표 변환 (간이)
 */
function convertToGrid(lat: number, lng: number): { nx: number; ny: number } {
  // 청도 다로리 기준 근사값 (실제 운영 시 정밀 변환 필요)
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { nx, ny };
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function getBaseTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  // 초단기실황은 매시 정각 기준, 40분 이후 제공
  let baseH = h;
  if (m < 40) baseH = h - 1;
  if (baseH < 0) baseH = 23;
  return String(baseH).padStart(2, '0') + '00';
}
