import { Router, Request, Response } from 'express';
import { z } from 'zod';

const alertPayloadSchema = z.object({
  device_id: z.string(),
  user_id: z.string().uuid(),
  type: z.enum(['bt_disconnect', 'app_crash', 'manual']),
  timestamp: z.string(),
  message: z.string().optional(),
});

export const alertRouter = Router();

alertRouter.post('/', async (req: Request, res: Response) => {
  const parsed = alertPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
  }

  const data = parsed.data;
  console.log(`[alert] Device event: ${data.type} from user ${data.user_id}`);

  // Phase 1: BT 끊김 등은 로깅만, 추후 대시보드에서 표시
  return res.json({ status: 'ok', received: data.type });
});
