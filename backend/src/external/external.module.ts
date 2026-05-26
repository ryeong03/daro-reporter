import { Global, Module } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { KakaoMapService } from './kakao-map.service';

@Global()
@Module({
  providers: [WeatherService, KakaoMapService],
  exports: [WeatherService, KakaoMapService],
})
export class ExternalModule {}
