import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { BaselineService } from '../detection/baseline.service';
import { RegisterPayload } from './users.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private supabaseService: SupabaseService,
    private baselineService: BaselineService,
  ) {}

  async findByPhone(phone: string) {
    const db = this.supabaseService.db;

    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !user) throw new NotFoundException('User not found');
    return { user };
  }

  async register(payload: RegisterPayload) {
    const db = this.supabaseService.db;
    const { name, phone, device_id, gender, birth_date, guardians, heart_rate_history } = payload;
    const baseline = this.baselineService.calculateBaseline(heart_rate_history);

    const { data, error } = await db
      .from('users')
      .insert({ name, phone, device_id, gender, birth_date, baseline_bpm: baseline })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('Phone already registered');
      }
      this.logger.error('Register error', error);
      throw new Error('DB error');
    }

    if (guardians && guardians.length > 0 && data) {
      const guardianRows = guardians.map((g) => ({
        user_id: data.id,
        name: g.name,
        phone: g.phone,
        relation: g.relation || null,
      }));
      await db.from('guardians').insert(guardianRows);
    }

    return { user: data };
  }

  async getUserDetail(id: string) {
    const db = this.supabaseService.db;

    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) throw new NotFoundException('User not found');

    const { data: guardians } = await db
      .from('guardians')
      .select('*')
      .eq('user_id', id);

    const { data: latestLocation } = await db
      .from('health_data')
      .select('lat, lng, timestamp')
      .eq('user_id', id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    return {
      ...user,
      guardians: guardians || [],
      latest_location: latestLocation || null,
    };
  }

  async getBaseline(id: string) {
    const db = this.supabaseService.db;

    const { data, error } = await db
      .from('users')
      .select('baseline_bpm, baseline_updated_at')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('User not found');
    return data;
  }

  async listUsersWithStatus() {
    const db = this.supabaseService.db;

    const { data, error } = await db
      .from('users')
      .select('id, name, phone, device_id, baseline_bpm, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error('DB error');

    const usersWithStatus = await Promise.all(
      (data || []).map(async (user) => {
        const { data: activeAlert } = await db
          .from('alerts')
          .select('id, event_type, status')
          .eq('user_id', user.id)
          .in('status', ['triggered', 'calling'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { data: latestLocation } = await db
          .from('health_data')
          .select('lat, lng, timestamp')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        let status: 'normal' | 'warning' | 'emergency' = 'normal';
        if (activeAlert) {
          status = activeAlert.status === 'triggered' ? 'warning' : 'emergency';
        }

        return {
          ...user,
          status,
          active_alert: activeAlert || null,
          latest_location: latestLocation || null,
        };
      }),
    );

    return { users: usersWithStatus };
  }
}
