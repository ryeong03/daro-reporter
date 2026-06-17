import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundException } from '@nestjs/common';

/** 시연 계정 — DEMO_USER_ID / DEMO_USER_PHONE / DEMO_USER_NAME env 로만 지정 */
export async function resolveDemoUserId(
  db: SupabaseClient,
  config: ConfigService,
): Promise<string> {
  const fromEnv = config.get<string>('DEMO_USER_ID')?.trim();
  if (fromEnv) return fromEnv;

  const demoPhone = config.get<string>('DEMO_USER_PHONE')?.trim();
  if (demoPhone) {
    const { data: byPhone } = await db
      .from('users')
      .select('id')
      .eq('phone', demoPhone)
      .maybeSingle();
    if (byPhone?.id) return byPhone.id;
  }

  const demoName = config.get<string>('DEMO_USER_NAME')?.trim();
  if (demoName) {
    const { data } = await db.from('users').select('id').eq('name', demoName).maybeSingle();
    if (data?.id) return data.id;
  }

  throw new NotFoundException(
    '시연 계정을 찾을 수 없습니다. DEMO_USER_ID, DEMO_USER_PHONE, DEMO_USER_NAME 중 하나를 서버 env에 설정해주세요.',
  );
}
