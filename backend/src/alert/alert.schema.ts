import { z } from 'zod';

export const alertPayloadSchema = z.object({
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

export type AlertPayload = z.infer<typeof alertPayloadSchema>;
