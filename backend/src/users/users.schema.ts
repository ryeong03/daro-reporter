import { z } from 'zod';

const guardianSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  relation: z.string().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  device_id: z.string(),
  gender: z.enum(['male', 'female']).optional(),
  birth_date: z.string().optional(),
  guardians: z.array(guardianSchema).optional(),
  heart_rate_history: z.array(z.number()).optional(),
});

export type RegisterPayload = z.infer<typeof registerSchema>;
