import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundException } from '@nestjs/common';

/** env 미설정 시 마지막으로 조회할 시연 계정 이름 */
const DEFAULT_DEMO_USER_NAME = '다로리';

/** 시연 계정 — DEMO_USER_ID / DEMO_USER_PHONE / DEMO_USER_NAME env (없으면 다로리) */
export async function resolveDemoUserId(
  db: SupabaseClient,
  config: ConfigService,
): Promise<string> {
  const fromEnv = config.get<string>('DEMO_USER_ID')?.trim();
  if (fromEnv) {
    const { data } = await db.from('users').select('id').eq('id', fromEnv).maybeSingle();
    if (data?.id) return data.id;
  }

  const demoPhone = config.get<string>('DEMO_USER_PHONE')?.trim();
  if (demoPhone) {
    const { data: byPhone } = await db
      .from('users')
      .select('id')
      .eq('phone', demoPhone)
      .maybeSingle();
    if (byPhone?.id) return byPhone.id;
  }

  const demoName = config.get<string>('DEMO_USER_NAME')?.trim() || DEFAULT_DEMO_USER_NAME;
  const { data } = await db.from('users').select('id').eq('name', demoName).maybeSingle();
  if (data?.id) return data.id;

  throw new NotFoundException(
    `시연 계정 "${demoName}"을(를) 찾을 수 없습니다. Railway env의 DEMO_USER_ID/PHONE/NAME을 확인해주세요.`,
  );
}
