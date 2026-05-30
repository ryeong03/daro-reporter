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

  async checkHealth(): Promise<{ ok: boolean; message?: string; code?: number | string }> {
    const invokeUrl = this.config.get<string>('CLOVA_SPEECH_INVOKE_URL');
    const secret = this.config.get<string>('CLOVA_SPEECH_SECRET');

    if (!invokeUrl || !secret) {
      return { ok: false, message: 'Missing CLOVA_SPEECH_INVOKE_URL or CLOVA_SPEECH_SECRET' };
    }

    try {
      const response = await axios.post(invokeUrl, Buffer.alloc(0), {
        headers: {
          'X-CLOVASPEECH-API-KEY': secret,
          'Content-Type': 'application/octet-stream',
        },
        params: { lang: 'Ko-KR' },
        timeout: 10000,
        validateStatus: () => true,
      });

      if (response.status === 404) {
        return { ok: false, code: 404, message: 'Invoke URL not found — NCP에서 도메인/URL 재발급 필요' };
      }
      if (response.status === 401) {
        return { ok: false, code: 401, message: 'Invalid Clova secret key' };
      }
      if (response.status === 400) {
        return { ok: true, message: 'Clova endpoint reachable (empty audio rejected as expected)' };
      }
      if (response.status >= 200 && response.status < 500) {
        return { ok: true, message: `Clova responded with ${response.status}` };
      }
      return { ok: false, code: response.status, message: 'Clova server error' };
    } catch (err: any) {
      return {
        ok: false,
        code: err.response?.status ?? 'n/a',
        message: err.response?.data?.message ?? err.message,
      };
    }
  }

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
