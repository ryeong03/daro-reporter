import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { TriggerService } from '../ai-call/trigger.service';
import { AlertPayload } from './alert.schema';
import { resolveCoordinates } from '../config/default-location';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private supabaseService: SupabaseService,
    private triggerService: TriggerService,
  ) {}

  async handleDeviceEvent(data: AlertPayload) {
    this.logger.log(`Device event: ${data.type} from user ${data.user_id}`);
    const db = this.supabaseService.db;

    if (data.type === 'fall_detected') {
      const { data: user } = await db
        .from('users')
        .select('phone')
        .eq('id', data.user_id)
        .maybeSingle();

      const coords = resolveCoordinates(data.location, user?.phone);

      const { data: activeAlert } = await db
        .from('alerts')
        .select('id, status')
        .eq('user_id', data.user_id)
        .in('status', ['triggered', 'calling'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeAlert) {
        this.logger.warn(
          `Active alert ${activeAlert.id} (${activeAlert.status}) — skipping duplicate alert/call`,
        );
        return { status: 'ok', action: 'alert_already_active', alert_id: activeAlert.id };
      }

      await db.from('alerts').insert({
        user_id: data.user_id,
        event_type: 'fall',
        status: 'triggered',
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });

      this.triggerService.triggerAICall(data.user_id, 'syncope');
      return { status: 'ok', action: 'ai_call_triggered' };
    }

    return { status: 'ok', received: data.type };
  }

  async listAlerts(userId?: string, status?: string, limit = 50, offset = 0) {
    const db = this.supabaseService.db;

    let query = db
      .from('alerts')
      .select('*, users(name, phone)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) query = query.eq('user_id', userId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new Error('DB error');

    return { alerts: data || [] };
  }

  async getAlertDetail(id: string) {
    const db = this.supabaseService.db;

    const { data: alert, error } = await db
      .from('alerts')
      .select('*, users(name, phone, baseline_bpm)')
      .eq('id', id)
      .single();

    if (error || !alert) throw new NotFoundException('Alert not found');

    const { data: callLogs } = await db
      .from('call_logs')
      .select('*')
      .eq('alert_id', id)
      .order('created_at', { ascending: true });

    const { data: notifications } = await db
      .from('notification_logs')
      .select('*')
      .eq('alert_id', id)
      .order('created_at', { ascending: true });

    return {
      ...alert,
      call_logs: callLogs || [],
      notifications: notifications || [],
    };
  }

  async updateStatus(id: string, status: string) {
    const validStatuses = ['closed_safe', 'closed_emergency', 'false_alarm'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    const { data, error } = await this.supabaseService.db
      .from('alerts')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Alert not found');
    return data;
  }
}
