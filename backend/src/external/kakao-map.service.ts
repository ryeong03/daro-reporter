import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface AddressResult {
  address: string;
  roadAddress: string | null;
}

@Injectable()
export class KakaoMapService {
  private readonly logger = new Logger(KakaoMapService.name);

  constructor(private config: ConfigService) {}

  async coordToAddress(lat: number, lng: number): Promise<AddressResult | null> {
    const apiKey = this.config.get<string>('KAKAO_MAP_API_KEY');
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
      this.logger.error('Reverse geocoding failed', err);
      return null;
    }
  }
}
