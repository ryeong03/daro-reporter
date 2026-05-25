/**
 * backend/.env 키 상태를 읽어 test/dashboard.html 생성 (키는 마스킹만 표시)
 * 실행: cd backend && npx ts-node ../test/visualize-env.ts
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'backend', '.env');
const OUT_PATH = path.join(__dirname, 'dashboard.html');

dotenv.config({ path: ENV_PATH });

type KeyStatus = 'empty' | 'placeholder' | 'configured';

interface KeyDef {
  name: string;
  label: string;
  group: string;
  placeholders?: string[];
}

const KEYS: KeyDef[] = [
  { name: 'PORT', label: '서버 포트', group: 'Server' },
  { name: 'BASE_URL', label: '공개 URL', group: 'Server', placeholders: ['your-server', 'ngrok'] },
  { name: 'SUPABASE_URL', label: 'Supabase URL', group: 'Database', placeholders: ['your-project'] },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role', group: 'Database', placeholders: ['your-service-role'] },
  { name: 'TWILIO_ACCOUNT_SID', label: 'Twilio Account SID', group: 'Twilio', placeholders: ['ACxxxx', 'your-'] },
  { name: 'TWILIO_AUTH_TOKEN', label: 'Twilio Auth Token', group: 'Twilio', placeholders: ['your-auth'] },
  { name: 'TWILIO_PHONE_NUMBER', label: 'Twilio 발신 번호', group: 'Twilio', placeholders: ['xxxxxxxx'] },
  { name: 'HEALTH_CENTER_PHONE', label: '보건소 번호', group: 'Twilio', placeholders: ['xxxxxxxx'] },
  { name: 'CLOVA_SPEECH_INVOKE_URL', label: 'Clova STT URL', group: 'AI / Speech', placeholders: ['your-'] },
  { name: 'CLOVA_SPEECH_SECRET', label: 'Clova Secret', group: 'AI / Speech', placeholders: ['your-clova'] },
  { name: 'ANTHROPIC_API_KEY', label: 'Claude API', group: 'AI / Speech', placeholders: ['sk-ant-xxx', 'xxxxxxxx'] },
  { name: 'SLACK_WEBHOOK_URL', label: 'Slack Webhook', group: 'Notify', placeholders: ['/xxx/xxx'] },
  { name: 'KMA_API_KEY', label: '기상청 API', group: 'External (Joonghyuk)', placeholders: ['your-kma'] },
  { name: 'KAKAO_MAP_API_KEY', label: '카카오맵 REST', group: 'External (Joonghyuk)', placeholders: ['your-kakao'] },
];

function getStatus(value: string | undefined, placeholders: string[] = []): KeyStatus {
  if (!value?.trim()) return 'empty';
  const lower = value.toLowerCase();
  if (placeholders.some((p) => lower.includes(p.toLowerCase()))) return 'placeholder';
  return 'configured';
}

function maskValue(value: string, status: KeyStatus): string {
  if (status === 'empty') return '(비어 있음)';
  if (status === 'placeholder') return value.length > 24 ? `${value.slice(0, 12)}…` : value;
  if (value.length <= 10) return '••••••••';
  return `${value.slice(0, 4)}${'•'.repeat(Math.min(12, value.length - 8))}${value.slice(-4)}`;
}

async function testKakao(key: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await axios.get('https://dapi.kakao.com/v2/local/geo/coord2address.json', {
      params: { x: 128.7341, y: 35.6478 },
      headers: { Authorization: `KakaoAK ${key}` },
      timeout: 8000,
    });
    const addr = res.data?.documents?.[0]?.address?.address_name;
    return { ok: !!addr, detail: addr ? `주소: ${addr}` : '응답 없음' };
  } catch (e: unknown) {
    const msg = axios.isAxiosError(e) ? `${e.response?.status ?? ''} ${e.message}` : String(e);
    return { ok: false, detail: msg.trim() };
  }
}

async function testKma(_key: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const { checkWeather } = await import('../backend/src/external/weather');
    const w = await checkWeather(35.6478, 128.7341);
    if (!w) return { ok: false, detail: 'checkWeather null (키·격자·시간 확인)' };
    return {
      ok: true,
      detail: `기온 ${w.temperature}°C · 습도 ${w.humidity}% · 체감 ${w.feelsLike}°C`,
    };
  } catch (e: unknown) {
    return { ok: false, detail: String(e) };
  }
}

interface Row extends KeyDef {
  status: KeyStatus;
  masked: string;
  liveTest?: { ok: boolean; detail: string };
}

async function buildRows(): Promise<Row[]> {
  const rows: Row[] = KEYS.map((k) => {
    const raw = process.env[k.name] ?? '';
    const status = getStatus(raw, k.placeholders);
    return { ...k, status, masked: maskValue(raw, status) };
  });

  const kakao = rows.find((r) => r.name === 'KAKAO_MAP_API_KEY');
  if (kakao?.status === 'configured') {
    kakao.liveTest = await testKakao(process.env.KAKAO_MAP_API_KEY!);
  }

  const kma = rows.find((r) => r.name === 'KMA_API_KEY');
  if (kma?.status === 'configured') {
    kma.liveTest = await testKma(process.env.KMA_API_KEY!);
  }

  return rows;
}

function statusLabel(s: KeyStatus): string {
  if (s === 'configured') return '설정됨';
  if (s === 'placeholder') return '예시값';
  return '미설정';
}

function statusClass(s: KeyStatus): string {
  if (s === 'configured') return 'ok';
  if (s === 'placeholder') return 'warn';
  return 'bad';
}

function renderHtml(rows: Row[], generatedAt: string): string {
  const groups = [...new Set(rows.map((r) => r.group))];
  const configured = rows.filter((r) => r.status === 'configured').length;
  const total = rows.length;

  const groupHtml = groups
    .map((group) => {
      const items = rows.filter((r) => r.group === group);
      const cards = items
        .map((r) => {
          const live =
            r.liveTest != null
              ? `<div class="live ${r.liveTest.ok ? 'live-ok' : 'live-fail'}">
              <span>${r.liveTest.ok ? '✓ API 연동' : '✗ API 실패'}</span>
              <small>${escapeHtml(r.liveTest.detail)}</small>
            </div>`
              : '';
          return `<article class="card">
            <header>
              <code>${r.name}</code>
              <span class="badge ${statusClass(r.status)}">${statusLabel(r.status)}</span>
            </header>
            <p class="label">${r.label}</p>
            <p class="masked">${escapeHtml(r.masked)}</p>
            ${live}
          </article>`;
        })
        .join('');
      return `<section><h2>${escapeHtml(group)}</h2><div class="grid">${cards}</div></section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Hero API Keys — test/dashboard</title>
  <style>
    :root {
      --bg: #0f172a; --panel: #1e293b; --text: #e2e8f0; --muted: #94a3b8;
      --ok: #22c55e; --warn: #eab308; --bad: #ef4444; --accent: #38bdf8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; font-family: "Segoe UI", system-ui, sans-serif;
      background: var(--bg); color: var(--text); line-height: 1.5;
      padding: 2rem 1.5rem 3rem;
    }
    .wrap { max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 1.75rem; margin: 0 0 0.25rem; }
    .sub { color: var(--muted); margin-bottom: 2rem; font-size: 0.95rem; }
    .summary {
      display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem;
    }
    .stat {
      background: var(--panel); border-radius: 12px; padding: 1rem 1.25rem;
      min-width: 140px; border: 1px solid #334155;
    }
    .stat strong { font-size: 1.5rem; color: var(--accent); display: block; }
    .stat span { font-size: 0.85rem; color: var(--muted); }
    section { margin-bottom: 2rem; }
    section h2 {
      font-size: 1rem; text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--muted); margin: 0 0 1rem; border-bottom: 1px solid #334155;
      padding-bottom: 0.5rem;
    }
    .grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .card {
      background: var(--panel); border-radius: 12px; padding: 1rem 1.1rem;
      border: 1px solid #334155;
    }
    .card header {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 0.5rem; margin-bottom: 0.35rem;
    }
    .card code { font-size: 0.72rem; color: var(--accent); word-break: break-all; }
    .badge {
      font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.5rem;
      border-radius: 6px; white-space: nowrap;
    }
    .badge.ok { background: rgba(34,197,94,0.2); color: var(--ok); }
    .badge.warn { background: rgba(234,179,8,0.2); color: var(--warn); }
    .badge.bad { background: rgba(239,68,68,0.2); color: var(--bad); }
    .label { margin: 0; font-weight: 600; font-size: 0.95rem; }
    .masked {
      margin: 0.5rem 0 0; font-family: ui-monospace, monospace;
      font-size: 0.85rem; color: var(--muted); word-break: break-all;
    }
    .live {
      margin-top: 0.75rem; padding: 0.5rem 0.65rem; border-radius: 8px;
      font-size: 0.8rem;
    }
    .live-ok { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.35); }
    .live-fail { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.35); }
    .live small { display: block; margin-top: 0.25rem; color: var(--muted); }
    footer { margin-top: 2rem; font-size: 0.8rem; color: var(--muted); }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>🔑 API 키 상태 대시보드</h1>
    <p class="sub">backend/.env 기준 · 생성: ${escapeHtml(generatedAt)} · 키는 마스킹만 표시</p>
    <div class="summary">
      <div class="stat"><strong>${configured}/${total}</strong><span>실제 설정됨</span></div>
      <div class="stat"><strong>2</strong><span>Joonghyuk 외부 API (라이브 테스트)</span></div>
    </div>
    ${groupHtml}
    <footer>다시 생성: <code>cd backend && npm run test:keys</code> · dashboard.html은 Git에 올리지 마세요.</footer>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function main() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error(`[visualize] ${ENV_PATH} 없음. backend/.env 를 먼저 만드세요.`);
    process.exit(1);
  }

  const rows = await buildRows();
  const html = renderHtml(rows, new Date().toLocaleString('ko-KR'));
  fs.writeFileSync(OUT_PATH, html, 'utf8');
  console.log(`[visualize] wrote ${OUT_PATH}`);
  console.log(`[visualize] configured: ${rows.filter((r) => r.status === 'configured').map((r) => r.name).join(', ') || '(none)'}`);
}

main().catch((err) => {
  console.error('[visualize]', err);
  process.exit(1);
});
