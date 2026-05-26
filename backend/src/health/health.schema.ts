import { z } from 'zod';

const heartRateSampleSchema = z.object({
  t: z.string(),
  bpm: z.number().min(30).max(250),
});

export const healthPayloadSchema = z.object({
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
