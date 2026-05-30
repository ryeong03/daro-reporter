import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { TwilioCallService } from './twilio-call.service';
import { EmergencyService } from '../notify/emergency.service';

export type CallPhase = 'initial' | 'confirm';

export interface CallContext {
  userId: string;
  eventType: 'heatstroke' | 'syncope';
  alertId: number | null;
  attempt: number;
  phase: CallPhase;
  heardText?: string;
  confirmAttempt: number;
}

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);

  private readonly callContextMap = new Map<string, CallContext>();

  constructor(
    private supabaseService: SupabaseService,
    private twilioCallService: TwilioCallService,
    private emergencyService: EmergencyService,
  ) {}

  get contextMap() {
    return this.callContextMap;
  }

  registerCallContext(
    callSid: string,
    userId: string,
    eventType: 'heatstroke' | 'syncope',
    alertId: number | null,
    attempt: number = 1,
    phase: CallPhase = 'initial',
    heardText?: string,
    confirmAttempt: number = 1,
  ): void {
    this.callContextMap.set(callSid, {
      userId, eventType, alertId, attempt, phase, heardText, confirmAttempt,
    });
  }

  removeCallContext(callSid: string): void {
    this.callContextMap.delete(callSid);
  }

  getCallContext(callSid: string) {
    return this.callContextMap.get(callSid);
  }

  async triggerAICall(userId: string, eventType: 'heatstroke' | 'syncope'): Promise<void> {
    const db = this.supabaseService.db;

    const { data: user } = await db
      .from('users')
      .select('phone, name')
      .eq('id', userId)
      .single();

    if (!user) {
      this.logger.error(`User ${userId} not found`);
      return;
    }

    const { data: activeAlert } = await db
      .from('alerts')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['triggered', 'calling'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeAlert?.status === 'calling') {
      this.logger.warn(`Alert ${activeAlert.id} already calling — skipping duplicate call`);
      return;
    }

    const alertId = activeAlert?.id ?? null;

    this.logger.log(`Triggering call to ${user.name} (${user.phone}) for ${eventType}`);

    try {
      const callSid = await this.twilioCallService.makeCall(user.phone, userId, eventType);
      this.registerCallContext(callSid, userId, eventType, alertId, 1);
    } catch (err: any) {
      this.logger.error(`Failed to initiate call: ${err.message} (code ${err.code ?? 'n/a'})`);
      await this.emergencyService.notifyEmergency(userId, eventType, 'call_failed', alertId);
    }
  }
}
