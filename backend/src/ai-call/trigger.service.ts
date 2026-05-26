import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { TwilioCallService } from './twilio-call.service';
import { EmergencyService } from '../notify/emergency.service';

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);

  private readonly callContextMap = new Map<string, {
    userId: string;
    eventType: 'heatstroke' | 'syncope';
    alertId: number | null;
    attempt: number;
  }>();

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
  ): void {
    this.callContextMap.set(callSid, { userId, eventType, alertId, attempt });
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

    const { data: alert } = await db
      .from('alerts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'triggered')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    this.logger.log(`Triggering call to ${user.name} (${user.phone}) for ${eventType}`);

    try {
      const callSid = await this.twilioCallService.makeCall(user.phone, userId, eventType);
      this.registerCallContext(callSid, userId, eventType, alert?.id ?? null, 1);
    } catch (err) {
      this.logger.error('Failed to initiate call', err);
      await this.emergencyService.notifyEmergency(userId, eventType, 'call_failed');
    }
  }
}
