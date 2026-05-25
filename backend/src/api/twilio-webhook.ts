import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { transcribe } from '../ai-call/stt';
import { classifyResponse, Classification } from '../ai-call/classify';
import { makeCall } from '../ai-call/twilio';
import { notifyEmergency } from '../notify/emergency';
import { resolveAlert } from '../state/state-machine';

export const twilioRouter = Router();

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 30_000;

// CallSid → { userId, eventType, alertId, attempt } 매핑 (in-memory)
const callContextMap = new Map<string, {
  userId: string;
  eventType: 'heatstroke' | 'syncope';
  alertId: number | null;
  attempt: number;
}>();

/**
 * AI콜 시작 시 context 등록. trigger.ts → makeCall 후 호출용.
 */
export function registerCallContext(
  callSid: string,
  userId: string,
  eventType: 'heatstroke' | 'syncope',
  alertId: number | null,
  attempt: number = 1
): void {
  callContextMap.set(callSid, { userId, eventType, alertId, attempt });
}

// ─── TwiML 응답 (발신 시 재생할 음성 + 녹음 지시) ───

twilioRouter.post('/voice-response', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;

  let userName = '어르신';
  if (userId) {
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();
    if (user?.name) userName = user.name;
  }

  res.type('text/xml');
  res.send(`
    <Response>
      <Say language="ko-KR">${userName}님, 안녕하세요. 농업인 안전 확인 전화입니다. 워치에서 위험 신호가 감지됐어요. 지금 괜찮으시면 괜찮아요, 아프시거나 도움이 필요하시면 아파요 또는 도와줘 라고 말씀해 주세요.</Say>
      <Record maxLength="15" playBeep="false" action="/twilio/recording" recordingStatusCallback="/twilio/recording-status" />
      <Say language="ko-KR">응답이 없어 다시 여쭤봅니다. 지금 괜찮으신가요?</Say>
      <Record maxLength="15" playBeep="false" action="/twilio/recording" recordingStatusCallback="/twilio/recording-status" />
    </Response>
  `);
});

// ─── 콜 상태 콜백 ───

twilioRouter.post('/voice-status', async (req: Request, res: Response) => {
  const { CallSid, CallStatus } = req.body;
  const ctx = callContextMap.get(CallSid);

  console.log(`[twilio] Call ${CallSid}: ${CallStatus} (attempt ${ctx?.attempt ?? '?'})`);

  if (!ctx) {
    res.sendStatus(200);
    return;
  }

  if (CallStatus === 'in-progress') {
    // 전화 연결됨 → alert 상태를 calling으로 업데이트
    if (ctx.alertId) {
      await supabase
        .from('alerts')
        .update({ status: 'calling' })
        .eq('id', ctx.alertId);
    }
  }

  // no-answer, busy, failed, canceled → 재발신 또는 긴급 알림
  const failStatuses = ['no-answer', 'busy', 'failed', 'canceled'];
  if (failStatuses.includes(CallStatus)) {
    await supabase.from('call_logs').insert({
      alert_id: ctx.alertId,
      attempt: ctx.attempt,
      twilio_call_sid: CallSid,
      classification: 'no_answer',
    });

    if (ctx.attempt < MAX_ATTEMPTS) {
      console.log(`[twilio] Scheduling retry #${ctx.attempt + 1} in ${RETRY_DELAY_MS / 1000}s`);
      setTimeout(async () => {
        try {
          const newSid = await makeCall(
            (await supabase.from('users').select('phone').eq('id', ctx.userId).single()).data!.phone,
            ctx.userId,
            ctx.eventType
          );
          registerCallContext(newSid, ctx.userId, ctx.eventType, ctx.alertId, ctx.attempt + 1);
        } catch (err) {
          console.error('[twilio] Retry call failed:', err);
          await notifyEmergency(ctx.userId, ctx.eventType, 'no_answer_after_retry');
          resolveAlert(ctx.userId);
        }
      }, RETRY_DELAY_MS);
    } else {
      console.log(`[twilio] Max attempts reached — escalating to emergency`);
      await notifyEmergency(ctx.userId, ctx.eventType, 'no_answer_after_retry');
      resolveAlert(ctx.userId);
    }

    callContextMap.delete(CallSid);
  }

  // completed는 녹음 처리 후에 정리되므로 여기서는 무시
  if (CallStatus === 'completed') {
    callContextMap.delete(CallSid);
  }

  res.sendStatus(200);
});

// ─── 녹음 완료 콜백 (핵심 파이프라인) ───

twilioRouter.post('/recording', async (req: Request, res: Response) => {
  const { CallSid, RecordingUrl, RecordingSid } = req.body;
  const ctx = callContextMap.get(CallSid);

  console.log(`[twilio] Recording ready: ${RecordingSid} for call ${CallSid}`);

  if (!ctx) {
    console.warn(`[twilio] No context for CallSid ${CallSid}, skipping pipeline`);
    res.type('text/xml');
    res.send('<Response><Hangup/></Response>');
    return;
  }

  try {
    // 1) STT: 녹음 → 텍스트
    const recordingUrlWithAuth = `${RecordingUrl}.wav`;
    const sttResult = await transcribe(recordingUrlWithAuth);
    console.log(`[pipeline] STT result: "${sttResult.text}" (confidence: ${sttResult.confidence})`);

    // 2) Claude 분류: 텍스트 → safe / emergency / unclear
    const classifyResult = await classifyResponse(sttResult.text);
    console.log(`[pipeline] Classification: ${classifyResult.classification} — ${classifyResult.reasoning}`);

    // 3) call_logs에 기록
    await supabase.from('call_logs').insert({
      alert_id: ctx.alertId,
      attempt: ctx.attempt,
      twilio_call_sid: CallSid,
      recording_url: RecordingUrl,
      stt_text: sttResult.text,
      classification: classifyResult.classification,
      claude_reasoning: classifyResult.reasoning,
    });

    // 4) 분류 결과에 따라 분기
    await handleClassification(
      classifyResult.classification,
      ctx,
      CallSid,
      res
    );
  } catch (err) {
    console.error('[pipeline] Error in recording pipeline:', err);
    // 파이프라인 실패 → 안전을 위해 긴급 알림
    await notifyEmergency(ctx.userId, ctx.eventType, 'pipeline_error');
    resolveAlert(ctx.userId);
    res.type('text/xml');
    res.send('<Response><Hangup/></Response>');
  }
});

async function handleClassification(
  classification: Classification,
  ctx: { userId: string; eventType: 'heatstroke' | 'syncope'; alertId: number | null; attempt: number },
  callSid: string,
  res: Response
): Promise<void> {
  switch (classification) {
    case 'safe': {
      console.log(`[pipeline] Safe — closing alert, returning to normal`);
      if (ctx.alertId) {
        await supabase
          .from('alerts')
          .update({ status: 'closed_safe', resolved_at: new Date().toISOString() })
          .eq('id', ctx.alertId);
      }
      resolveAlert(ctx.userId);
      callContextMap.delete(callSid);

      res.type('text/xml');
      res.send(`
        <Response>
          <Say language="ko-KR">다행이에요. 심박이 높아서 걱정했어요. 오늘도 건강하고 안전하게 일하세요!</Say>
          <Hangup/>
        </Response>
      `);
      break;
    }

    case 'emergency': {
      console.log(`[pipeline] Emergency — notifying all channels`);
      await notifyEmergency(ctx.userId, ctx.eventType, 'emergency_confirmed_by_call');
      resolveAlert(ctx.userId);
      callContextMap.delete(callSid);

      res.type('text/xml');
      res.send(`
        <Response>
          <Say language="ko-KR">알겠습니다. 지금 바로 도움을 요청하겠습니다. 잠시만 기다려 주세요.</Say>
          <Hangup/>
        </Response>
      `);
      break;
    }

    case 'unclear': {
      if (ctx.attempt < MAX_ATTEMPTS) {
        console.log(`[pipeline] Unclear — asking again (attempt ${ctx.attempt})`);
        res.type('text/xml');
        res.send(`
          <Response>
            <Say language="ko-KR">죄송해요, 잘 못 들었어요. 다시 한 번 여쭤보겠습니다. 지금 괜찮으시면 괜찮아요, 도움이 필요하시면 아파요 또는 도와줘 라고 말씀해 주세요.</Say>
            <Record maxLength="15" playBeep="false" action="/twilio/recording" />
            <Say language="ko-KR">응답이 확인되지 않아 도움을 요청하겠습니다.</Say>
            <Hangup/>
          </Response>
        `);
        callContextMap.set(callSid, { ...ctx, attempt: ctx.attempt + 1 });
      } else {
        console.log(`[pipeline] Unclear after max attempts — escalating to emergency`);
        await notifyEmergency(ctx.userId, ctx.eventType, 'unclear_after_max_attempts');
        resolveAlert(ctx.userId);
        callContextMap.delete(callSid);

        res.type('text/xml');
        res.send(`
          <Response>
            <Say language="ko-KR">다시 질문했으나 모두 어르신의 대답을 확인할 수 없습니다. 도움을 요청할게요.</Say>
            <Hangup/>
          </Response>
        `);
      }
      break;
    }
  }
}
