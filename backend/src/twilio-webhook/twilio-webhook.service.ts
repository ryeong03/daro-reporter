import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { TriggerService } from '../ai-call/trigger.service';
import { TwilioCallService } from '../ai-call/twilio-call.service';
import { SttService } from '../ai-call/stt.service';
import { ClassifyService, Classification } from '../ai-call/classify.service';
import { EmergencyService } from '../notify/emergency.service';
import { StateMachineService } from '../state/state-machine.service';

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 30_000;

@Injectable()
export class TwilioWebhookService {
  private readonly logger = new Logger(TwilioWebhookService.name);

  constructor(
    private supabaseService: SupabaseService,
    private triggerService: TriggerService,
    private twilioCallService: TwilioCallService,
    private sttService: SttService,
    private classifyService: ClassifyService,
    private emergencyService: EmergencyService,
    private stateMachine: StateMachineService,
  ) {}

  async generateVoiceResponse(userId: string): Promise<string> {
    let userName = '어르신';

    if (userId) {
      try {
        const { data: user, error } = await this.supabaseService.db
          .from('users')
          .select('name')
          .eq('id', userId)
          .single();
        if (!error && user?.name) userName = user.name;
      } catch (err) {
        this.logger.warn(`Failed to fetch user name for ${userId}`);
      }
    }

    return `
      <Response>
        <Say language="ko-KR">${userName}님, 안녕하세요. 농업인 안전 확인 전화입니다. 워치에서 위험 신호가 감지됐어요. 지금 괜찮으시면 괜찮아요, 아프시거나 도움이 필요하시면 아파요 또는 도와줘 라고 말씀해 주세요.</Say>
        <Record maxLength="15" playBeep="false" action="/twilio/recording" recordingStatusCallback="/twilio/recording-status" />
        <Say language="ko-KR">응답이 없어 다시 여쭤봅니다. 지금 괜찮으신가요?</Say>
        <Record maxLength="15" playBeep="false" action="/twilio/recording" recordingStatusCallback="/twilio/recording-status" />
      </Response>
    `;
  }

  async handleVoiceStatus(callSid: string, callStatus: string): Promise<void> {
    const ctx = this.triggerService.getCallContext(callSid);
    this.logger.log(`Call ${callSid}: ${callStatus} (attempt ${ctx?.attempt ?? '?'})`);

    if (!ctx) return;

    const db = this.supabaseService.db;

    if (callStatus === 'in-progress') {
      if (ctx.alertId) {
        await db.from('alerts').update({ status: 'calling' }).eq('id', ctx.alertId);
      }
    }

    const failStatuses = ['no-answer', 'busy', 'failed', 'canceled'];
    if (failStatuses.includes(callStatus)) {
      await db.from('call_logs').insert({
        alert_id: ctx.alertId,
        attempt: ctx.attempt,
        twilio_call_sid: callSid,
        classification: 'no_answer',
      });

      if (ctx.attempt < MAX_ATTEMPTS) {
        this.logger.log(`Scheduling retry #${ctx.attempt + 1} in ${RETRY_DELAY_MS / 1000}s`);
        setTimeout(async () => {
          try {
            const { data: userData } = await db
              .from('users')
              .select('phone')
              .eq('id', ctx.userId)
              .single();
            const newSid = await this.twilioCallService.makeCall(
              userData!.phone, ctx.userId, ctx.eventType,
            );
            this.triggerService.registerCallContext(newSid, ctx.userId, ctx.eventType, ctx.alertId, ctx.attempt + 1);
          } catch (err) {
            this.logger.error('Retry call failed', err);
            await this.emergencyService.notifyEmergency(ctx.userId, ctx.eventType, 'no_answer_after_retry');
            this.stateMachine.resolveAlert(ctx.userId);
          }
        }, RETRY_DELAY_MS);
      } else {
        this.logger.log('Max attempts reached — escalating to emergency');
        await this.emergencyService.notifyEmergency(ctx.userId, ctx.eventType, 'no_answer_after_retry');
        this.stateMachine.resolveAlert(ctx.userId);
      }

      this.triggerService.removeCallContext(callSid);
    }

    if (callStatus === 'completed') {
      this.triggerService.removeCallContext(callSid);
    }
  }

  async handleRecording(callSid: string, recordingUrl: string, recordingSid: string): Promise<string> {
    const ctx = this.triggerService.getCallContext(callSid);
    this.logger.log(`Recording ready: ${recordingSid} for call ${callSid}`);

    if (!ctx) {
      this.logger.warn(`No context for CallSid ${callSid}, skipping pipeline`);
      return '<Response><Hangup/></Response>';
    }

    try {
      const recordingUrlWithAuth = `${recordingUrl}.wav`;
      const sttResult = await this.sttService.transcribe(recordingUrlWithAuth);
      this.logger.log(`STT result: "${sttResult.text}" (confidence: ${sttResult.confidence})`);

      const classifyResult = await this.classifyService.classifyResponse(sttResult.text);
      this.logger.log(`Classification: ${classifyResult.classification} — ${classifyResult.reasoning}`);

      await this.supabaseService.db.from('call_logs').insert({
        alert_id: ctx.alertId,
        attempt: ctx.attempt,
        twilio_call_sid: callSid,
        recording_url: recordingUrl,
        stt_text: sttResult.text,
        classification: classifyResult.classification,
        claude_reasoning: classifyResult.reasoning,
      });

      return this.handleClassification(classifyResult.classification, ctx, callSid);
    } catch (err) {
      this.logger.error('Error in recording pipeline', err);
      await this.emergencyService.notifyEmergency(ctx.userId, ctx.eventType, 'pipeline_error');
      this.stateMachine.resolveAlert(ctx.userId);
      return '<Response><Hangup/></Response>';
    }
  }

  private async handleClassification(
    classification: Classification,
    ctx: { userId: string; eventType: 'heatstroke' | 'syncope'; alertId: number | null; attempt: number },
    callSid: string,
  ): Promise<string> {
    const db = this.supabaseService.db;

    switch (classification) {
      case 'safe': {
        this.logger.log('Safe — closing alert, returning to normal');
        if (ctx.alertId) {
          await db
            .from('alerts')
            .update({ status: 'closed_safe', resolved_at: new Date().toISOString() })
            .eq('id', ctx.alertId);
        }
        this.stateMachine.resolveAlert(ctx.userId);
        this.triggerService.removeCallContext(callSid);

        return `
          <Response>
            <Say language="ko-KR">다행이에요. 심박이 높아서 걱정했어요. 오늘도 건강하고 안전하게 일하세요!</Say>
            <Hangup/>
          </Response>
        `;
      }

      case 'emergency': {
        this.logger.log('Emergency — notifying all channels');
        await this.emergencyService.notifyEmergency(ctx.userId, ctx.eventType, 'emergency_confirmed_by_call');
        this.stateMachine.resolveAlert(ctx.userId);
        this.triggerService.removeCallContext(callSid);

        return `
          <Response>
            <Say language="ko-KR">알겠습니다. 지금 바로 도움을 요청하겠습니다. 잠시만 기다려 주세요.</Say>
            <Hangup/>
          </Response>
        `;
      }

      case 'unclear': {
        if (ctx.attempt < MAX_ATTEMPTS) {
          this.logger.log(`Unclear — asking again (attempt ${ctx.attempt})`);
          this.triggerService.registerCallContext(callSid, ctx.userId, ctx.eventType, ctx.alertId, ctx.attempt + 1);
          return `
            <Response>
              <Say language="ko-KR">죄송해요, 잘 못 들었어요. 다시 한 번 여쭤보겠습니다. 지금 괜찮으시면 괜찮아요, 도움이 필요하시면 아파요 또는 도와줘 라고 말씀해 주세요.</Say>
              <Record maxLength="15" playBeep="false" action="/twilio/recording" />
              <Say language="ko-KR">응답이 확인되지 않아 도움을 요청하겠습니다.</Say>
              <Hangup/>
            </Response>
          `;
        } else {
          this.logger.log('Unclear after max attempts — escalating to emergency');
          await this.emergencyService.notifyEmergency(ctx.userId, ctx.eventType, 'unclear_after_max_attempts');
          this.stateMachine.resolveAlert(ctx.userId);
          this.triggerService.removeCallContext(callSid);

          return `
            <Response>
              <Say language="ko-KR">다시 질문했으나 모두 어르신의 대답을 확인할 수 없습니다. 도움을 요청할게요.</Say>
              <Hangup/>
            </Response>
          `;
        }
      }
    }
  }
}
