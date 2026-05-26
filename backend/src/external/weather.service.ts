import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { StateMachineService } from '../state/state-machine.service';

interface WeatherData {
  temperature: number;
  humidity: number;
  feelsLike: number;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    private config: ConfigService,
    private stateMachine: StateMachineService,
  ) {}

  async checkWeather(lat: number, lng: number): Promise<WeatherData | null> {
    const apiKey = this.config.get<string>('KMA_API_KEY');
    if (!apiKey) return null;

    try {
      const { nx, ny } = this.convertToGrid(lat, lng);
      const now = new Date();
      const baseDate = this.formatDate(now);
      const baseTime = this.getBaseTime(now);

      const common = new URLSearchParams({
        numOfRows: '10',
        pageNo: '1',
        dataType: 'JSON',
        base_date: baseDate,
        base_time: baseTime,
        nx: String(nx),
        ny: String(ny),
      });
      const serviceKeyQuery = apiKey.includes('%')
        ? `serviceKey=${apiKey}`
        : new URLSearchParams({ serviceKey: apiKey }).toString();
      const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?${serviceKeyQuery}&${common.toString()}`;
      const response = await axios.get(url);

      const items = response.data?.response?.body?.items?.item || [];
      let temperature = 0;
      let humidity = 0;

      for (const item of items) {
        if (item.category === 'T1H') temperature = parseFloat(item.obsrValue);
        if (item.category === 'REH') humidity = parseFloat(item.obsrValue);
      }

      const feelsLike = this.calculateFeelsLike(temperature, humidity);
      return { temperature, humidity, feelsLike };
    } catch (err) {
      this.logger.error('Weather API call failed', err);
      return null;
    }
  }

  async applyWeatherWeight(userId: string, lat: number, lng: number): Promise<boolean> {
    const weather = await this.checkWeather(lat, lng);
    if (!weather) return false;

    if (weather.feelsLike >= 33) {
      this.stateMachine.applyShortenedWindow(userId);
      this.logger.log(`Shortened window applied for user ${userId} (feelsLike: ${weather.feelsLike}°C)`);
      return true;
    }

    return false;
  }

  private calculateFeelsLike(temp: number, humidity: number): number {
    if (temp < 27) return temp;
    const hi = -8.784 + 1.611 * temp + 2.338 * humidity
      - 0.1461 * temp * humidity - 0.01230 * temp * temp
      - 0.01642 * humidity * humidity + 0.002211 * temp * temp * humidity
      + 0.000725 * temp * humidity * humidity - 0.000003582 * temp * temp * humidity * humidity;
    return Math.round(hi * 10) / 10;
  }

  private convertToGrid(lat: number, lng: number): { nx: number; ny: number } {
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

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  private getBaseTime(date: Date): string {
    const h = date.getHours();
    const m = date.getMinutes();
    let baseH = h;
    if (m < 40) baseH = h - 1;
    if (baseH < 0) baseH = 23;
    return String(baseH).padStart(2, '0') + '00';
  }
}
