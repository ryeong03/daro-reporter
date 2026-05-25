import axios from 'axios';

interface STTResult {
  text: string;
  confidence: number;
}

/**
 * Clova Speech STT: 녹음 URL → 텍스트 변환
 */
export async function transcribe(recordingUrl: string): Promise<STTResult> {
  const invokeUrl = process.env.CLOVA_SPEECH_INVOKE_URL!;
  const secret = process.env.CLOVA_SPEECH_SECRET!;

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
    }
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
