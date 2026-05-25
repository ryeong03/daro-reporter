import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/supabase';
import { calculateBaseline } from '../detection/baseline';

const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  device_id: z.string(),
  heart_rate_history: z.array(z.number()).optional(),
});

export const userRouter = Router();

userRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
  }

  const { name, phone, device_id, heart_rate_history } = parsed.data;
  const baseline = calculateBaseline(heart_rate_history);

  const { data, error } = await supabase
    .from('users')
    .insert({ name, phone, device_id, baseline_bpm: baseline })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Phone already registered' });
    }
    console.error('[user] Register error:', error);
    return res.status(500).json({ error: 'DB error' });
  }

  return res.status(201).json({ user: data });
});

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
