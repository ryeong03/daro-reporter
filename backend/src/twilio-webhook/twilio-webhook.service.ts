import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../database/supabase.service';
import { CallContext, CallPhase, TriggerService } from '../ai-call/trigger.service';
import { TwilioCallService } from '../ai-call/twilio-call.service';
import { SttService } from '../ai-call/stt.service';
import { ClassifyService, Classification } from '../ai-call/classify.service';
import { EmergencyService } from '../notify/emergency.service';
import { StateMachineService } from '../state/state-machine.service';

const MAX_ATTEMPTS = 2;
const MAX_CONFIRM_ATTEMPTS = 2;
const RETRY_DELAY_MS = 30_000;
const CONFIRM_CALL_DELAY_MS = 8_000;

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

  private escapeXmlText(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private buildRecordingAction(
    userId: string,
    eventType: string,
    phase: CallPhase,
    heardText?: string,
  ): string {
    const params = new URLSearchParams({ userId, eventType, phase });
    if (heardText) params.set('heardText', heardText.slice(0, 80));
    return this.escapeXmlAttr(`${this.baseUrl}/twilio/recording?${params.toString()}`);
  }

  async generateVoiceResponse(
    userId: string,
    eventType = 'syncope',
    phase: CallPhase = 'initial',
    heardText?: string,
  ): Promise<string> {
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

    const recordingAction = this.buildRecordingAction(userId, eventType, phase, heardText);

    if (phase === 'confirm') {
      const safeHeard = heardText?.trim();
      const confirmPrompt = safeHeard
        ? `${userName}님, ${this.escapeXmlText(safeHeard)}라고 하신 거 맞으신가요? 괜찮으시면 네, 도움이 필요하시면 아니요라고 말씀해 주세요.`
        : `${userName}님, 잘 못 들었습니다. 지금 괜찮으시면 네, 도움이 필요하시면 아니요라고 말씀해 주세요.`;

      return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say language="ko-KR">${confirmPrompt}</Say>
        <Record maxLength="15" playBeep="false" action="${recordingAction}" />
      </Response>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say language="ko-KR">${userName}님, 안녕하세요. 농업인 안전 확인 전화입니다. 워치에서 위험 신호가 감지됐어요. 괜찮으시면 괜찮아요, 괜찮아, 괜찮혀처럼 편하게 말씀해 주세요. 도움이 필요하시면 도와줘, 아파요 라고 말씀해 주세요.</Say>
        <Record maxLength="15" playBeep="false" action="${recordingAction}" />
      </Response>`;
  }

  async handleVoiceStatus(callSid: string, callStatus: string): Promise<void> {
    const ctx = this.triggerService.getCallContext(callSid);
    this.logger.log(
      `Call ${callSid}: ${callStatus} (phase ${ctx?.phase ?? '?'}, attempt ${ctx?.attempt ?? '?'})`,
    );

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
        claude_reasoning: ctx.phase === 'confirm' ? 'confirm_no_answer' : 'initial_no_answer',
      });

      if (ctx.phase === 'confirm') {
        if (ctx.confirmAttempt < MAX_CONFIRM_ATTEMPTS) {
          this.logger.log(`Confirm call no-answer — retry confirm #${ctx.confirmAttempt + 1}`);
          this.scheduleConfirmationCall(ctx, ctx.heardText, CONFIRM_CALL_DELAY_MS, ctx.confirmAttempt + 1);
        } else {
          this.logger.log('Confirm call unanswered — escalating to emergency');
          await this.emergencyService.notifyEmergency(
            ctx.userId, ctx.eventType, 'confirm_no_answer', ctx.alertId,
          );
          this.stateMachine.resolveAlert(ctx.userId);
        }
      } else if (ctx.attempt < MAX_ATTEMPTS) {
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
            this.triggerService.registerCallContext(
              newSid, ctx.userId, ctx.eventType, ctx.alertId, ctx.attempt + 1, 'initial', undefined, 1,
            );
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
    phase: CallPhase = 'initial',
    heardText?: string,
  ): Promise<string> {
    let ctx = this.triggerService.getCallContext(callSid);
    if (!ctx && userId) {
      ctx = await this.recoverCallContext(callSid, userId, eventType, phase, heardText);
    }
    this.logger.log(`Recording ready (${phase}): ${recordingSid} for call ${callSid}`);

    if (!ctx) {
      this.logger.warn(`No context for CallSid ${callSid}, skipping pipeline`);
      return '<Response><Hangup/></Response>';
    }

    void this.runRecordingPipeline(callSid, recordingUrl, recordingSid, ctx);

    const closingMessage = ctx.phase === 'confirm'
      ? '확인했습니다. 잠시만 기다려 주세요.'
      : '답변 확인했습니다. 잠시만 기다려 주세요.';

    return `
      <Response>
        <Say language="ko-KR">${closingMessage}</Say>
        <Hangup/>
      </Response>`;
  }

  private async runRecordingPipeline(
    callSid: string,
    recordingUrl: string,
    recordingSid: string,
    ctx: CallContext,
  ): Promise<void> {
    try {
      const sttResult = await this.sttService.transcribe(recordingUrl);
      this.logger.log(`STT result (${ctx.phase}): "${sttResult.text}" (confidence: ${sttResult.confidence})`);

      const classifyResult = ctx.phase === 'confirm'
        ? await this.classifyService.classifyConfirmation(sttResult.text, ctx.heardText)
        : await this.classifyService.classifyResponse(sttResult.text);

      this.logger.log(`Classification (${ctx.phase}): ${classifyResult.classification} — ${classifyResult.reasoning}`);

      await this.supabaseService.db.from('call_logs').insert({
        alert_id: ctx.alertId,
        attempt: ctx.phase === 'confirm' ? ctx.confirmAttempt : ctx.attempt,
        twilio_call_sid: callSid,
        recording_url: recordingUrl,
        stt_text: sttResult.text,
        classification: classifyResult.classification,
        claude_reasoning: `[${ctx.phase}] ${classifyResult.reasoning}`,
      });

      await this.applyClassification(classifyResult.classification, ctx, callSid, sttResult.text);
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
    ctx: CallContext,
    callSid: string,
    sttText: string,
  ): Promise<void> {
    const db = this.supabaseService.db;

    if (ctx.phase === 'confirm') {
      switch (classification) {
        case 'safe': {
          this.logger.log('Confirm safe — closing alert');
          await this.closeAllActiveAlertsSafe(ctx.userId);
          this.stateMachine.resolveAlert(ctx.userId);
          this.triggerService.removeCallContext(callSid);
          return;
        }
        case 'emergency': {
          this.logger.log('Confirm emergency — notifying all channels');
          await this.emergencyService.notifyEmergency(
            ctx.userId, ctx.eventType, 'emergency_confirmed_on_recheck', ctx.alertId,
          );
          this.stateMachine.resolveAlert(ctx.userId);
          this.triggerService.removeCallContext(callSid);
          return;
        }
        case 'unclear': {
          if (ctx.confirmAttempt < MAX_CONFIRM_ATTEMPTS) {
            this.logger.log(`Confirm unclear — retry confirm #${ctx.confirmAttempt + 1}`);
            this.scheduleConfirmationCall(ctx, ctx.heardText, CONFIRM_CALL_DELAY_MS, ctx.confirmAttempt + 1);
          } else {
            this.logger.log('Confirm unclear after max attempts — escalating to emergency');
            await this.emergencyService.notifyEmergency(
              ctx.userId, ctx.eventType, 'confirm_unclear_after_max_attempts', ctx.alertId,
            );
            this.stateMachine.resolveAlert(ctx.userId);
          }
          this.triggerService.removeCallContext(callSid);
        }
      }
      return;
    }

    switch (classification) {
      case 'safe': {
        this.logger.log(`Initial safe ("${sttText}") — scheduling confirmation call`);
        this.scheduleConfirmationCall(ctx, sttText, CONFIRM_CALL_DELAY_MS, 1);
        this.triggerService.removeCallContext(callSid);
        return;
      }

      case 'emergency': {
        this.logger.log('Emergency — notifying all channels immediately');
        await this.emergencyService.notifyEmergency(
          ctx.userId, ctx.eventType, 'emergency_confirmed_by_call', ctx.alertId,
        );
        this.stateMachine.resolveAlert(ctx.userId);
        this.triggerService.removeCallContext(callSid);
        return;
      }

      case 'unclear': {
        this.logger.log('Initial unclear — scheduling confirmation call');
        this.scheduleConfirmationCall(ctx, undefined, CONFIRM_CALL_DELAY_MS, 1);
        this.triggerService.removeCallContext(callSid);
      }
    }
  }

  private scheduleConfirmationCall(
    ctx: CallContext,
    heardText: string | undefined,
    delayMs: number,
    confirmAttempt: number,
  ): void {
    this.logger.log(
      `Scheduling confirm call #${confirmAttempt} in ${delayMs / 1000}s` +
      (heardText ? ` (heard: "${heardText}")` : ' (unclear initial)'),
    );

    setTimeout(async () => {
      const db = this.supabaseService.db;
      try {
        const { data: userData } = await db
          .from('users')
          .select('phone')
          .eq('id', ctx.userId)
          .single();

        const newSid = await this.twilioCallService.makeCall(
          userData!.phone,
          ctx.userId,
          ctx.eventType,
          { phase: 'confirm', heardText },
        );

        this.triggerService.registerCallContext(
          newSid,
          ctx.userId,
          ctx.eventType,
          ctx.alertId,
          ctx.attempt,
          'confirm',
          heardText,
          confirmAttempt,
        );
      } catch (err) {
        this.logger.error('Confirmation call failed', err);
        await this.emergencyService.notifyEmergency(
          ctx.userId, ctx.eventType, 'confirm_call_failed', ctx.alertId,
        );
        this.stateMachine.resolveAlert(ctx.userId);
      }
    }, delayMs);
  }

  private async closeAllActiveAlertsSafe(userId: string): Promise<void> {
    await this.supabaseService.db
      .from('alerts')
      .update({ status: 'closed_safe', resolved_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('status', ['triggered', 'calling']);
  }

  private async recoverCallContext(
    callSid: string,
    userId: string,
    eventType?: string,
    phase: CallPhase = 'initial',
    heardText?: string,
  ): Promise<CallContext | undefined> {
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

    this.logger.log(`Recovered call context for ${callSid} (user ${userId}, phase ${phase})`);
    const ctx: CallContext = {
      userId,
      eventType: resolvedEventType,
      alertId: alert?.id ?? null,
      attempt: 1,
      phase,
      heardText,
      confirmAttempt: 1,
    };
    this.triggerService.registerCallContext(
      callSid, userId, resolvedEventType, alert?.id ?? null, 1, phase, heardText, 1,
    );
    return ctx;
  }
}
