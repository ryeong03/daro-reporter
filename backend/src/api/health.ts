import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/supabase';
import { processHealthData } from '../detection/engine';

const heartRateSampleSchema = z.object({
  t: z.string(),
  bpm: z.number().min(30).max(250),
});

const healthPayloadSchema = z.object({
  device_id: z.string(),
  user_id: z.string().uuid(),
  timestamp: z.string(),
  heart_rate: z.array(heartRateSampleSchema).min(1),
  steps_10min: z.number().int().min(0),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number(),
  }),
});

export type HealthPayload = z.infer<typeof healthPayloadSchema>;

export const healthRouter = Router();

healthRouter.post('/', async (req: Request, res: Response) => {
  const parsed = healthPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
  }

  const data = parsed.data;
  const avgBpm = data.heart_rate.reduce((sum, s) => sum + s.bpm, 0) / data.heart_rate.length;

  const { error } = await supabase.from('health_data').insert({
    user_id: data.user_id,
    timestamp: data.timestamp,
    heart_rate_avg: avgBpm,
    heart_rate_samples: data.heart_rate,
    steps_10min: data.steps_10min,
    lat: data.location.lat,
    lng: data.location.lng,
    accuracy: data.location.accuracy,
  });

  if (error) {
    console.error('[health] DB insert error:', error);
    return res.status(500).json({ error: 'DB error' });
  }

  const detectionResult = await processHealthData(data.user_id, {
    avgBpm,
    steps: data.steps_10min,
    lat: data.location.lat,
    lng: data.location.lng,
    timestamp: data.timestamp,
  });

  return res.json({ status: 'ok', detection: detectionResult });
});
