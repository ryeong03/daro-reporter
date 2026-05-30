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
    const audio = await this.downloadAudio(recordingUrl);

    const response = await axios.post(invokeUrl, audio, {
      headers: {
        'X-CLOVASPEECH-API-KEY': secret,
        'Content-Type': 'application/octet-stream',
      },
      params: { lang: 'Ko-KR' },
    });

    const segments = response.data?.segments || [];
    if (segments.length > 0) {
      const fullText = segments.map((s: { text: string }) => s.text).join(' ');
      const avgConfidence = segments.reduce(
        (sum: number, s: { confidence?: number }) => sum + (s.confidence || 0),
        0,
      ) / segments.length;
      return { text: fullText.trim(), confidence: avgConfidence };
    }

    return {
      text: (response.data?.text ?? '').trim(),
      confidence: response.data?.confidence ?? 0,
    };
  }

  private async downloadAudio(recordingUrl: string): Promise<Buffer> {
    const url = recordingUrl.endsWith('.wav') ? recordingUrl : `${recordingUrl}.wav`;

    if (url.includes('api.twilio.com')) {
      this.logger.log('Downloading Twilio recording for STT');
      const { data } = await axios.get(url, {
        auth: {
          username: this.config.get<string>('TWILIO_ACCOUNT_SID')!,
          password: this.config.get<string>('TWILIO_AUTH_TOKEN')!,
        },
        responseType: 'arraybuffer',
      });
      return Buffer.from(data);
    }

    const { data } = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(data);
  }
}
