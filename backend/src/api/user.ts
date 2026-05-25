import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/supabase';
import { calculateBaseline } from '../detection/baseline';

const guardianSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  relation: z.string().optional(),
});

const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  device_id: z.string(),
  gender: z.enum(['male', 'female']).optional(),
  birth_date: z.string().optional(),
  guardians: z.array(guardianSchema).optional(),
  heart_rate_history: z.array(z.number()).optional(),
});

export const userRouter = Router();

// 농업인 등록
userRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
  }

  const { name, phone, device_id, gender, birth_date, guardians, heart_rate_history } = parsed.data;
  const baseline = calculateBaseline(heart_rate_history);

  const { data, error } = await supabase
    .from('users')
    .insert({
      name, phone, device_id, gender, birth_date,
      baseline_bpm: baseline,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Phone already registered' });
    }
    console.error('[user] Register error:', error);
    return res.status(500).json({ error: 'DB error' });
  }

  // 보호자 등록 (복수 가능)
  if (guardians && guardians.length > 0 && data) {
    const guardianRows = guardians.map((g) => ({
      user_id: data.id,
      name: g.name,
      phone: g.phone,
      relation: g.relation || null,
    }));
    await supabase.from('guardians').insert(guardianRows);
  }

  return res.status(201).json({ user: data });
});

// 농업인 개인 정보 조회
userRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { data: guardians } = await supabase
    .from('guardians')
    .select('*')
    .eq('user_id', id);

  const { data: latestLocation } = await supabase
    .from('health_data')
    .select('lat, lng, timestamp')
    .eq('user_id', id)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  return res.json({
    ...user,
    guardians: guardians || [],
    latest_location: latestLocation || null,
  });
});

// 기준선 조회
userRouter.get('/:id/baseline', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('users')
    .select('baseline_bpm, baseline_updated_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json(data);
});

// 농업인 목록 (관리자 대시보드용)
userRouter.get('/', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, device_id, baseline_bpm, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'DB error' });
  }

  // 각 사용자의 최신 상태 조회
  const usersWithStatus = await Promise.all(
    (data || []).map(async (user) => {
      const { data: activeAlert } = await supabase
        .from('alerts')
        .select('id, event_type, status')
        .eq('user_id', user.id)
        .in('status', ['triggered', 'calling'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: latestLocation } = await supabase
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
    })
  );

  return res.json({ users: usersWithStatus });
});
