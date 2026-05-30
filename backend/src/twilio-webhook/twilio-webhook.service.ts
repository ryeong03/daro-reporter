import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private config: ConfigService,
    private supabaseService: SupabaseService,
    private triggerService: TriggerService,
    private twilioCallService: TwilioCallService,
    private sttService: SttService,
    private classifyService: ClassifyService,
    private emergencyService: EmergencyService,
    private stateMachine: StateMachineService,
  ) {}

  private get baseUrl(): string {
    return this.config.get<string>('BASE_URL') || 'https://daro-reporter-production.up.railway.app';
  }

  private escapeXmlAttr(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async generateVoiceResponse(userId: string, eventType = 'syncope'): Promise<string> {
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

    const recordingAction = this.escapeXmlAttr(
      `${this.baseUrl}/twilio/recording?userId=${userId}&eventType=${eventType}`,
    );

    return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say language="ko-KR">${userName}님, 안녕하세요. 농업인 안전 확인 전화입니다. 워치에서 위험 신호가 감지됐어요. 지금 괜찮으시면 괜찮아요, 아프시거나 도움이 필요하시면 아파요 또는 도와줘 라고 말씀해 주세요.</Say>
        <Record maxLength="15" playBeep="false" action="${recordingAction}" />
      </Response>`;
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
            await this.emergencyService.notifyEmergency(
              ctx.userId, ctx.eventType, 'no_answer_after_retry', ctx.alertId,
            );
            this.stateMachine.resolveAlert(ctx.userId);
          }
        }, RETRY_DELAY_MS);
      } else {
        this.logger.log('Max attempts reached — escalating to emergency');
        await this.emergencyService.notifyEmergency(
          ctx.userId, ctx.eventType, 'no_answer_after_retry', ctx.alertId,
        );
        this.stateMachine.resolveAlert(ctx.userId);
      }

      this.triggerService.removeCallContext(callSid);
    }

    if (callStatus === 'completed') {
      this.triggerService.removeCallContext(callSid);
    }
  }

  async handleRecording(
    callSid: string,
    recordingUrl: string,
    recordingSid: string,
    userId?: string,
    eventType?: string,
  ): Promise<string> {
    let ctx = this.triggerService.getCallContext(callSid);
    if (!ctx && userId) {
      ctx = await this.recoverCallContext(callSid, userId, eventType);
    }
    this.logger.log(`Recording ready: ${recordingSid} for call ${callSid}`);

    if (!ctx) {
      this.logger.warn(`No context for CallSid ${callSid}, skipping pipeline`);
      return '<Response><Hangup/></Response>';
    }

    void this.runRecordingPipeline(callSid, recordingUrl, recordingSid, ctx);

    return `
      <Response>
        <Say language="ko-KR">답변 확인했습니다. 잠시만 기다려 주세요.</Say>
        <Hangup/>
      </Response>`;
  }

  private async runRecordingPipeline(
    callSid: string,
    recordingUrl: string,
    recordingSid: string,
    ctx: { userId: string; eventType: 'heatstroke' | 'syncope'; alertId: number | null; attempt: number },
  ): Promise<void> {
    try {
      const sttResult = await this.sttService.transcribe(recordingUrl);
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

      await this.applyClassification(classifyResult.classification, ctx, callSid);
    } catch (err) {
      this.logger.error('Error in recording pipeline', err);
      await this.emergencyService.notifyEmergency(
        ctx.userId, ctx.eventType, 'pipeline_error', ctx.alertId,
      );
      this.stateMachine.resolveAlert(ctx.userId);
      this.triggerService.removeCallContext(callSid);
    }
  }

  private async applyClassification(
    classification: Classification,
    ctx: { userId: string; eventType: 'heatstroke' | 'syncope'; alertId: number | null; attempt: number },
    callSid: string,
  ): Promise<void> {
    const db = this.supabaseService.db;

    switch (classification) {
      case 'safe': {
        this.logger.log('Safe — closing alert, returning to normal');
        const resolvedAt = new Date().toISOString();
        await db
          .from('alerts')
          .update({ status: 'closed_safe', resolved_at: resolvedAt })
          .eq('user_id', ctx.userId)
          .in('status', ['triggered', 'calling']);
        this.stateMachine.resolveAlert(ctx.userId);
        this.triggerService.removeCallContext(callSid);
        return;
      }

      case 'emergency': {
        this.logger.log('Emergency — notifying all channels');
        await this.emergencyService.notifyEmergency(
          ctx.userId, ctx.eventType, 'emergency_confirmed_by_call', ctx.alertId,
        );
        this.stateMachine.resolveAlert(ctx.userId);
        this.triggerService.removeCallContext(callSid);
        return;
      }

      case 'unclear': {
        if (ctx.attempt < MAX_ATTEMPTS) {
          this.logger.log(`Unclear — scheduling retry call #${ctx.attempt + 1}`);
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
              this.triggerService.registerCallContext(
                newSid, ctx.userId, ctx.eventType, ctx.alertId, ctx.attempt + 1,
              );
            } catch (err) {
              this.logger.error('Unclear retry call failed', err);
              await this.emergencyService.notifyEmergency(
                ctx.userId, ctx.eventType, 'unclear_after_max_attempts', ctx.alertId,
              );
              this.stateMachine.resolveAlert(ctx.userId);
            }
          }, RETRY_DELAY_MS);
        } else {
          this.logger.log('Unclear after max attempts — escalating to emergency');
          await this.emergencyService.notifyEmergency(
            ctx.userId, ctx.eventType, 'unclear_after_max_attempts', ctx.alertId,
          );
          this.stateMachine.resolveAlert(ctx.userId);
        }
        this.triggerService.removeCallContext(callSid);
      }
    }
  }

  private async recoverCallContext(
    callSid: string,
    userId: string,
    eventType?: string,
  ): Promise<{ userId: string; eventType: 'heatstroke' | 'syncope'; alertId: number | null; attempt: number } | undefined> {
    const db = this.supabaseService.db;
    const resolvedEventType = eventType === 'heatstroke' ? 'heatstroke' : 'syncope';

    const { data: alert } = await db
      .from('alerts')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['triggered', 'calling'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    this.logger.log(`Recovered call context for ${callSid} (user ${userId})`);
    this.triggerService.registerCallContext(callSid, userId, resolvedEventType, alert?.id ?? null, 1);
    return { userId, eventType: resolvedEventType, alertId: alert?.id ?? null, attempt: 1 };
  }
}
