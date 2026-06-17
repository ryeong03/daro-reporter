import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) throw new Error('.env not found');
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

async function main() {
  loadEnv();
  const names = process.argv.slice(2);
  if (names.length === 0) {
    console.error('Usage: npx ts-node scripts/seed-rest-warning.ts <이름> [...]');
    process.exit(1);
  }

  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  for (const name of names) {
    const { data: user, error } = await db
      .from('users')
      .select('id, name, baseline_bpm')
      .eq('name', name)
      .maybeSingle();

    if (error || !user) {
      console.error(`❌ ${name}: 사용자 없음`);
      continue;
    }

    const baseline = Number(user.baseline_bpm) || 75;
    const targetBpm = Math.ceil(baseline * 1.55);

    const { error: insertError } = await db.from('health_data').insert({
      user_id: user.id,
      timestamp: new Date().toISOString(),
      heart_rate_avg: targetBpm,
      heart_rate_samples: [{ t: new Date().toISOString(), bpm: targetBpm }],
      steps_10min: 80,
      lat: null,
      lng: null,
      accuracy: null,
    });

    if (insertError) {
      console.error(`❌ ${name}: ${insertError.message}`);
    } else {
      console.log(`✅ ${name} — ${targetBpm} bpm (기준선 ${baseline})`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
