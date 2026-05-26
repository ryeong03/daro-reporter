import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface STTResult {
  text: string;
  confidence: number;
}

@Injectable()
export class SttService {
  private readonly logger = new Logger(SttService.name);

  constructor(private config: ConfigService) {}

  async transcribe(recordingUrl: string): Promise<STTResult> {
    const invokeUrl = this.config.get<string>('CLOVA_SPEECH_INVOKE_URL')!;
    const secret = this.config.get<string>('CLOVA_SPEECH_SECRET')!;

    const response = await axios.post(
      invokeUrl,
      {
        url: recordingUrl,
        language: 'ko-KR',
        completion: 'sync',
      },
      {
        headers: {
          'X-CLOVASPEECH-API-KEY': secret,
          'Content-Type': 'application/json',
        },
      },
    );

    const segments = response.data?.segments || [];
    const fullText = segments.map((s: any) => s.text).join(' ');
    const avgConfidence = segments.length > 0
      ? segments.reduce((sum: number, s: any) => sum + (s.confidence || 0), 0) / segments.length
      : 0;

    return {
      text: fullText.trim(),
      confidence: avgConfidence,
    };
  }
}
