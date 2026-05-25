import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/supabase';
import { triggerAICall } from '../ai-call/trigger';

const alertPayloadSchema = z.object({
  device_id: z.string(),
  user_id: z.string().uuid(),
  type: z.enum(['bt_disconnect', 'app_crash', 'manual', 'fall_detected']),
  timestamp: z.string(),
  message: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

export const alertRouter = Router();

// 디바이스 이벤트 수신 (낙상 감지 포함)
alertRouter.post('/', async (req: Request, res: Response) => {
  const parsed = alertPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
  }

  const data = parsed.data;
  console.log(`[alert] Device event: ${data.type} from user ${data.user_id}`);

  // 낙상 감지 → 즉시 AI 콜 트리거
  if (data.type === 'fall_detected') {
    const lat = data.location?.lat || 0;
    const lng = data.location?.lng || 0;

    await supabase.from('alerts').insert({
      user_id: data.user_id,
      event_type: 'fall',
      status: 'triggered',
      lat,
      lng,
    });

    triggerAICall(data.user_id, 'syncope');
    return res.json({ status: 'ok', action: 'ai_call_triggered' });
  }

  return res.json({ status: 'ok', received: data.type });
});

// 알림 이력 조회 (관리자 대시보드용)
alertRouter.get('/', async (req: Request, res: Response) => {
  const { user_id, status, limit = '50', offset = '0' } = req.query;

  let query = supabase
    .from('alerts')
    .select('*, users(name, phone)')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (user_id) query = query.eq('user_id', user_id as string);
  if (status) query = query.eq('status', status as string);

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: 'DB error' });
  }

  return res.json({ alerts: data || [] });
});

// 알림 상세 + 콜 로그 (관리자 대시보드용)
alertRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: alert, error } = await supabase
    .from('alerts')
    .select('*, users(name, phone, baseline_bpm)')
    .eq('id', id)
    .single();

  if (error || !alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  const { data: callLogs } = await supabase
    .from('call_logs')
    .select('*')
    .eq('alert_id', id)
    .order('created_at', { ascending: true });

  const { data: notifications } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('alert_id', id)
    .order('created_at', { ascending: true });

  return res.json({
    ...alert,
    call_logs: callLogs || [],
    notifications: notifications || [],
  });
});

// 알림 상태 수동 변경 (관리자가 오탐 처리 등)
alertRouter.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['closed_safe', 'closed_emergency', 'false_alarm'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  const { data, error } = await supabase
    .from('alerts')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  return res.json(data);
});
