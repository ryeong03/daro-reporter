import { Router, Request, Response } from 'express';

export const twilioRouter = Router();

// Twilio Voice 상태 콜백
twilioRouter.post('/voice-status', async (req: Request, res: Response) => {
  const { CallSid, CallStatus, CallDuration } = req.body;
  console.log(`[twilio] Call ${CallSid}: ${CallStatus} (${CallDuration}s)`);

  // TODO: Step 4에서 구현 — 콜 상태머신 업데이트
  res.sendStatus(200);
});

// Twilio 녹음 완료 콜백
twilioRouter.post('/recording', async (req: Request, res: Response) => {
  const { CallSid, RecordingUrl, RecordingSid } = req.body;
  console.log(`[twilio] Recording ready for ${CallSid}: ${RecordingUrl}`);

  // TODO: Step 4에서 구현 — STT → Claude 분류 파이프라인 실행
  res.sendStatus(200);
});

// TwiML 응답 (발신 시 재생할 음성 + 녹음 지시)
twilioRouter.post('/voice-response', async (req: Request, res: Response) => {
  // TODO: Step 4에서 TwiML 구현
  res.type('text/xml');
  res.send(`
    <Response>
      <Say language="ko-KR">안녕하세요, 히어로 안전 모니터링입니다. 지금 괜찮으신가요? 상태를 말씀해 주세요.</Say>
      <Record maxLength="15" playBeep="false" action="/twilio/recording" />
      <Say language="ko-KR">응답이 없어 다시 여쭤봅니다. 지금 괜찮으신가요?</Say>
      <Record maxLength="15" playBeep="false" action="/twilio/recording" />
    </Response>
  `);
});
