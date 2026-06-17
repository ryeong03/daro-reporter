import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundException } from '@nestjs/common';

/** 시연용 농업인 — env 없으면 01025819543(다로리) 조회 */
export async function resolveDemoUserId(
  db: SupabaseClient,
  config: ConfigService,
): Promise<string> {
  const fromEnv = config.get<string>('DEMO_USER_ID')?.trim();
  if (fromEnv) return fromEnv;

  const demoPhone = config.get<string>('DEMO_USER_PHONE')?.trim() || '01025819543';
  const { data: byPhone } = await db
    .from('users')
    .select('id')
    .eq('phone', demoPhone)
    .maybeSingle();

  if (byPhone?.id) return byPhone.id;

  const demoName = config.get<string>('DEMO_USER_NAME')?.trim() || '다로리';
  const { data } = await db.from('users').select('id').eq('name', demoName).maybeSingle();

  if (!data?.id) {
    throw new NotFoundException(
      `시연 계정을 찾을 수 없습니다. DEMO_USER_ID를 설정하거나 다로리(01025819543)를 등록해주세요.`,
    );
  }

  return data.id;
}
