import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { BaselineService } from '../detection/baseline.service';
import { RegisterPayload, UpdateProfilePayload } from './users.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private supabaseService: SupabaseService,
    private baselineService: BaselineService,
  ) {}

  async register(payload: RegisterPayload) {
    const db = this.supabaseService.db;
    const { name, phone, device_id, gender, birth_date, guardians, heart_rate_history } = payload;
    const baseline = this.baselineService.calculateBaseline(heart_rate_history);

    // 프로토타입: 같은 번호로 반복 가입 허용 — phone 충돌 시 타임스탬프 suffix 추가
    let storedPhone = phone;
    let { data, error } = await db
      .from('users')
      .insert({ name, phone: storedPhone, device_id, gender, birth_date, baseline_bpm: baseline })
      .select()
      .single();

    if (error?.code === '23505') {
      storedPhone = `${phone}_${Date.now()}`;
      const retry = await db
        .from('users')
        .insert({ name, phone: storedPhone, device_id, gender, birth_date, baseline_bpm: baseline })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
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

    return { user: { ...data, phone } };
  }

  async getUserByPhone(phone: string) {
    const db = this.supabaseService.db;

    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('phone', phone.trim())
      .single();

    if (error || !user) throw new NotFoundException('User not found');
    return { user };
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

  async updateProfile(id: string, payload: UpdateProfilePayload) {
    const { name, phone } = payload;
    const normalizedPhone = phone.trim();

    const rpcResult = await this.supabaseService.db.rpc('update_farmer_profile', {
      p_user_id: id,
      p_name: name.trim(),
      p_phone: normalizedPhone,
    });

    if (!rpcResult.error && rpcResult.data) {
      return { user: rpcResult.data };
    }

    if (this.isRpcMissing(rpcResult.error)) {
      return this.updateProfileFallback(id, name.trim(), normalizedPhone);
    }

    this.throwUserMutationError(rpcResult.error, 'Update profile');
  }

  async deleteUser(id: string): Promise<void> {
    const rpcResult = await this.supabaseService.db.rpc('delete_farmer', {
      p_user_id: id,
    });

    if (!rpcResult.error) return;

    if (this.isRpcMissing(rpcResult.error)) {
      await this.deleteUserFallback(id);
      return;
    }

    this.throwUserMutationError(rpcResult.error, 'Delete user');
  }

  private async updateProfileFallback(id: string, name: string, phone: string) {
    const db = this.supabaseService.db;

    const { data: existing } = await db.from('users').select('id').eq('id', id).maybeSingle();
    if (!existing) throw new NotFoundException('User not found');

    const { data: duplicate } = await db
      .from('users')
      .select('id')
      .eq('phone', phone)
      .neq('id', id)
      .maybeSingle();

    if (duplicate) {
      throw new ConflictException('이미 등록된 전화번호입니다.');
    }

    const { data, error } = await db
      .from('users')
      .update({ name, phone })
      .eq('id', id)
      .select()
      .single();

    if (error?.code === 'PGRST116' || (!data && !error)) {
      throw new NotFoundException('User not found');
    }
    if (error?.code === '23505') {
      throw new ConflictException('이미 등록된 전화번호입니다.');
    }
    if (error) {
      this.logger.error('Update profile error', error);
      throw new Error('DB error');
    }

    return { user: data };
  }

  private async deleteUserFallback(id: string): Promise<void> {
    const db = this.supabaseService.db;

    const { data: existing } = await db.from('users').select('id').eq('id', id).maybeSingle();
    if (!existing) throw new NotFoundException('User not found');

    const { error } = await db.from('users').delete().eq('id', id);
    if (error) {
      this.logger.error('Delete user error', error);
      throw new Error('DB error');
    }
  }

  private isRpcMissing(error: { code?: string; message?: string } | null): boolean {
    if (!error) return false;
    return error.code === 'PGRST202' || (error.message?.includes('Could not find the function') ?? false);
  }

  private throwUserMutationError(error: { code?: string; message?: string } | null, context: string): never {
    const message = error?.message ?? '';

    if (message.includes('user_not_found') || error?.code === 'P0002') {
      throw new NotFoundException('User not found');
    }
    if (message.includes('phone_already_exists') || error?.code === '23505') {
      throw new ConflictException('이미 등록된 전화번호입니다.');
    }
    if (message.includes('invalid_phone') || message.includes('name_required')) {
      throw new BadRequestException('이름과 전화번호(10자리 이상)를 확인해주세요.');
    }

    this.logger.error(`${context} error`, error);
    throw new Error('DB error');
  }
}
