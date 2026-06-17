import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { birthDateForPinnedAge } from '../src/config/demo-display';

function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) throw new Error('.env not found');
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

type ProfileSeed = {
  name: string;
  age: number;
  bpm?: number;
  timestamp?: string;
};

const PROFILES: ProfileSeed[] = [
  { name: '도유연', age: 77, bpm: 77, timestamp: '2026-06-16T12:00:00.000Z' },
  { name: '한희홍', age: 82, bpm: 93, timestamp: '2026-06-16T00:00:00.000Z' },
  { name: '이채린', age: 26 },
  { name: '임현진', age: 24 },
];

async function main() {
  loadEnv();

  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  for (const profile of PROFILES) {
    const { data: user, error } = await db
      .from('users')
      .select('id, name, baseline_bpm')
      .eq('name', profile.name)
      .maybeSingle();

    if (error || !user) {
      console.error(`❌ ${profile.name}: 사용자 없음`);
      continue;
    }

    const birthDate = birthDateForPinnedAge(profile.age);
    const { error: userError } = await db
      .from('users')
      .update({ birth_date: birthDate })
      .eq('id', user.id);

    if (userError) {
      console.error(`❌ ${profile.name} birth_date: ${userError.message}`);
      continue;
    }

    if (profile.bpm != null) {
      const ts = profile.timestamp ?? new Date().toISOString();
      const { error: healthError } = await db.from('health_data').insert({
        user_id: user.id,
        timestamp: ts,
        heart_rate_avg: profile.bpm,
        heart_rate_samples: [{ t: ts, bpm: profile.bpm }],
        steps_10min: 80,
        lat: null,
        lng: null,
        accuracy: null,
      });

      if (healthError) {
        console.error(`❌ ${profile.name} health_data: ${healthError.message}`);
        continue;
      }
    }

    const parts = [`${profile.age}세`, `생년 ${birthDate}`];
    if (profile.bpm != null) parts.push(`${profile.bpm} bpm`);
    if (profile.timestamp) parts.push(`업데이트 ${profile.timestamp}`);
    console.log(`✅ ${profile.name} — ${parts.join(', ')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
