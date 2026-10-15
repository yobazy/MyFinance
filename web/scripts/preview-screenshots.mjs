// Design-preview screenshot harness.
//
// Mocks Supabase auth + REST and the Next.js API routes in the browser, so every
// authenticated page renders with deterministic demo data — no database needed.
// Screenshots land in web/.preview-shots/.
//
//   npm run preview:shots -- light / /transactions /visualizations
//   MOBILE=1 npm run preview:shots -- dark /
//   NOSESSION=1 npm run preview:shots -- light /login     (public pages)
//
// PREVIEW_BASE_URL overrides the dev-server URL (default http://localhost:3000).
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = new URL('../.preview-shots/', import.meta.url).pathname;
const BASE = process.env.PREVIEW_BASE_URL || 'http://localhost:3000';
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"(.*)"$/, '$1')];}));
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split('.')[0];

const mode = process.argv[2] === 'dark' ? 'dark' : 'light';
const routes = process.argv.slice(3);
const mobile = process.env.MOBILE === '1';

// ---------- deterministic fixtures ----------
let seed = 42; const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const rnd = (a, b) => Math.round((a + rand() * (b - a)) * 100) / 100;
const uid = '00000000-0000-4000-8000-000000000001';
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'preview@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Baz Preview' }, created_at: '2026-01-01T00:00:00Z' };
const now = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const accounts = [
  { id: 'a1', user_id: uid, bank: 'TD', name: 'Everyday Chequing', type: 'checking', balance: 4821.37, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-09-20T00:00:00Z' },
  { id: 'a2', user_id: uid, bank: 'AMEX', name: 'Cobalt Card', type: 'credit', balance: -1264.12, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-09-25T00:00:00Z' },
  { id: 'a3', user_id: uid, bank: 'SCOTIA', name: 'High Interest Savings', type: 'savings', balance: 15200, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
];
const catDefs = [['Groceries','#10b981'],['Dining','#f59e0b'],['Transport','#3b82f6'],['Rent','#8b5cf6'],['Utilities','#14b8a6'],['Entertainment','#ec4899'],['Income','#0F8A63'],['Shopping','#f97316'],['Health','#ef4444']];
const categories = catDefs.map(([name, color], i) => ({ id: `c${i+1}`, user_id: uid, name, color, parent_id: null, description: '', is_active: true }));
const cat = Object.fromEntries(categories.map(c => [c.name, c]));
const merchants = [
  ['LOBLAWS #1234','Groceries',40,160,'a1'],['METRO GROCERY','Groceries',25,90,'a2'],['UBER EATS','Dining',18,60,'a2'],['TIM HORTONS','Dining',3,12,'a2'],['SUSHI KAJI','Dining',45,140,'a2'],
  ['PRESTO TRANSIT','Transport',3.35,3.35,'a1'],['UBER TRIP','Transport',9,38,'a2'],['PETRO-CANADA','Transport',40,85,'a2'],['HYDRO ONE','Utilities',60,120,'a1'],['ROGERS WIRELESS','Utilities',75,75,'a1'],
  ['NETFLIX.COM','Entertainment',22.99,22.99,'a2'],['SPOTIFY','Entertainment',11.99,11.99,'a2'],['CINEPLEX','Entertainment',15,42,'a2'],['AMAZON.CA','Shopping',12,210,'a2'],['UNIQLO','Shopping',40,130,'a2'],['SHOPPERS DRUG MART','Health',8,65,'a2'],
];
const transactions = [];
let tid = 1;
const push = (t) => transactions.push({ id: `t${tid++}`, user_id: uid, source: t.account_id === 'a1' ? 'plaid' : 'amex_upload', auto_categorized: false, confidence_score: null, suggested_category_id: null, category_id: null, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z', ...t });
for (let m = 5; m >= 0; m--) {
  const d0 = new Date(now.getFullYear(), now.getMonth() - m, 1);
  const dim = m === 0 ? now.getDate() : new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
  for (const day of [1, 15]) if (day <= dim) push({ account_id: 'a1', date: iso(new Date(d0.getFullYear(), d0.getMonth(), day)), description: 'PAYROLL DEPOSIT ACME CORP', amount: -3150, category_id: cat.Income.id, auto_categorized: true });
  if (dim >= 2) push({ account_id: 'a1', date: iso(new Date(d0.getFullYear(), d0.getMonth(), 2)), description: 'E-TRANSFER RENT PAYMENT', amount: 1850, category_id: cat.Rent.id, auto_categorized: true });
  const n = 30 + Math.floor(rand() * 8);
  for (let i = 0; i < n; i++) {
    const [desc, c, lo, hi, acct] = merchants[Math.floor(rand() * merchants.length)];
    const day = 1 + Math.floor(rand() * dim);
    const unc = rand() < 0.12;
    push({ account_id: acct, date: iso(new Date(d0.getFullYear(), d0.getMonth(), day)), description: desc, amount: rnd(lo, hi), category_id: unc ? null : cat[c].id, auto_categorized: !unc && rand() < 0.6, suggested_category_id: unc && rand() < 0.7 ? cat[c].id : null, confidence_score: unc ? Math.round((0.55 + rand() * 0.4) * 100) / 100 : null });
  }
}
push({ account_id: 'a3', date: iso(now), description: 'INTEREST PAID', amount: -42.18, category_id: cat.Income.id });
transactions.sort((a, b) => b.date.localeCompare(a.date));
const rules = [
  { id: 'r1', user_id: uid, name: 'Groceries: Loblaws', rule_type: 'contains', pattern: 'LOBLAWS', priority: 10, is_active: true, category_id: cat.Groceries.id },
  { id: 'r2', user_id: uid, name: 'Streaming', rule_type: 'regex', pattern: 'NETFLIX|SPOTIFY', priority: 5, is_active: true, category_id: cat.Entertainment.id },
  { id: 'r3', user_id: uid, name: 'Payroll', rule_type: 'contains', pattern: 'PAYROLL', priority: 20, is_active: false, category_id: cat.Income.id },
];
const uploads = [
  { id: 'u1', user_id: uid, account_id: 'a2', bank: 'AMEX', file_type: 'xlsx', original_filename: 'amex-statement-aug.xlsx', status: 'succeeded', error: null, rows_processed: 34, rows_reversed: 0, reversed_at: null, created_at: new Date(Date.now() - 3 * 864e5).toISOString() },
  { id: 'u2', user_id: uid, account_id: 'a2', bank: 'AMEX', file_type: 'csv', original_filename: 'amex-yearend.csv', status: 'reversed', error: null, rows_processed: 120, rows_reversed: 120, reversed_at: new Date().toISOString(), created_at: new Date(Date.now() - 20 * 864e5).toISOString() },
  { id: 'u3', user_id: uid, account_id: 'a2', bank: 'AMEX', file_type: 'xlsx', original_filename: 'amex-statement-jul.xlsx', status: 'failed', error: 'Unrecognized column layout', rows_processed: 0, rows_reversed: 0, reversed_at: null, created_at: new Date(Date.now() - 40 * 864e5).toISOString() },
];
const presets = [{ id: 'p1', key: 'household', name: 'Household essentials', description: 'A balanced starter set for personal budgets', version: 2, is_active: true }];
const presetCats = catDefs.map(([name], i) => ({ preset_id: 'p1', canonical_key: name.toLowerCase(), name, description: `${name} spending`, display_order: i }));
const insights = [
  { id: 'i1', period_start: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), period_end: iso(new Date(now.getFullYear(), now.getMonth(), 0)), narrative: 'Spending came in about 8% under the prior month, driven mostly by lower dining and shopping. Groceries stayed flat at roughly $620. Two payroll deposits landed as expected and the savings account earned a small interest payment. The largest single expense was rent at $1,850; after that, a $210 Amazon order stands out. You ended the month with roughly $1,400 left over, which is a healthy cushion.', created_at: new Date(Date.now() - 2 * 864e5).toISOString() },
  { id: 'i2', period_start: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), period_end: iso(new Date(now.getFullYear(), now.getMonth() - 1, 0)), narrative: 'A slightly heavier month. Dining out crossed $400 for the first time this year, and transport rose thanks to two fuel fill-ups and a handful of rides. Everything else tracked close to normal.', created_at: new Date(Date.now() - 33 * 864e5).toISOString() },
];

// ---------- PostgREST-ish filtering ----------
function embed(row, table) {
  const r = { ...row };
  if (table === 'transactions') {
    const a = accounts.find(x => x.id === r.account_id); r.accounts = a ? { name: a.name, bank: a.bank } : null;
    const c = categories.find(x => x.id === r.category_id); r.categories = c ? { name: c.name, color: c.color } : null;
    const s = categories.find(x => x.id === r.suggested_category_id); r.suggested = s ? { name: s.name, color: s.color } : null;
  }
  if (table === 'uploads') { const a = accounts.find(x => x.id === r.account_id); r.accounts = a ? { name: a.name } : null; }
  if (table === 'categorization_rules') { const c = categories.find(x => x.id === r.category_id); r.categories = c ? { name: c.name } : null; }
  return r;
}
function applyFilters(rows, sp) {
  let out = rows;
  for (const [k, v] of sp.entries()) {
    if (['select','order','limit','offset'].includes(k)) continue;
    const m = /^(not\.)?(eq|gte|lte|gt|lt|is|neq)\.(.*)$/.exec(v);
    if (!m) continue;
    const [, not, op, raw] = m;
    const val = raw === 'null' ? null : raw;
    out = out.filter(r => {
      const x = r[k]; let ok;
      switch (op) { case 'eq': ok = String(x) === val; break; case 'neq': ok = String(x) !== val; break; case 'gte': ok = x >= val; break; case 'lte': ok = x <= val; break; case 'gt': ok = x > val; break; case 'lt': ok = x < val; break; case 'is': ok = val === null ? x == null : String(x) === val; break; default: ok = true; }
      return not ? !ok : ok;
    });
  }
  const order = sp.get('order');
  if (order) { const [col, dir] = order.split('.'); out = [...out].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === 'desc' ? -1 : 1)); }
  return out;
}
const TABLES = { accounts, transactions, categories, categorization_rules: rules, uploads, category_presets: presets, category_preset_categories: presetCats };

async function handleSupabase(route, request) {
  const url = new URL(request.url());
  const p = url.pathname;
  const json = (body, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...headers }, body: JSON.stringify(body) });
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (p.startsWith('/auth/v1/user')) return json(user);
  if (p.startsWith('/auth/v1/token')) return json({ access_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, refresh_token: 'fake-r', user });
  if (p.startsWith('/auth/v1/logout')) return json({}, 204);
  if (p.startsWith('/rest/v1/rpc/get_account_balance_rollup')) {
    const rows = accounts.map(a => { const tx = transactions.filter(t => t.account_id === a.id); return { account_id: a.id, tx_sum: tx.reduce((s, t) => s + t.amount, 0), tx_count: tx.length, last_tx_date: tx[0]?.date ?? null }; });
    return json(rows);
  }
  if (p.startsWith('/rest/v1/rpc/')) return json(null);
  const m = /^\/rest\/v1\/([a-z_]+)$/.exec(p);
  if (m && TABLES[m[1]]) {
    const table = m[1];
    if (['POST','PATCH','DELETE'].includes(request.method())) return json(request.method() === 'DELETE' ? [] : [{ id: 'new' }], request.method() === 'POST' ? 201 : 200);
    let rows = applyFilters(TABLES[table], url.searchParams).map(r => embed(r, table));
    const total = rows.length;
    const rangeHdr = request.headers()['range'];
    if (rangeHdr) { const [s, e] = rangeHdr.split('-').map(Number); rows = rows.slice(s, e + 1); }
    const limit = url.searchParams.get('limit'); if (limit) rows = rows.slice(0, Number(limit));
    const prefer = request.headers()['prefer'] ?? '';
    const headers = prefer.includes('count=exact') ? { 'content-range': `0-${Math.max(rows.length-1,0)}/${total}` } : {};
    if (request.method() === 'HEAD') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...headers }, body: '' });
    return json(rows, 200, { 'access-control-expose-headers': 'content-range', ...headers });
  }
  return json([]);
}

async function handleApi(route, request) {
  const p = new URL(request.url()).pathname;
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (p === '/api/insights') return json({ insights });
  if (p === '/api/insights/generate') return json({ ok: true });
  if (p === '/api/user-settings/anthropic-key') return request.method() === 'GET' ? json({ hasKey: true, maskedKey: 'sk-ant-...9f3a' }) : json({ ok: true });
  if (p === '/api/chat') return json({ reply: 'Last month you spent $3,412.55 across 41 transactions. The biggest categories were Rent ($1,850), Groceries ($612), and Dining ($388).' });
  return route.continue();
}

const session = { access_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, refresh_token: 'fake-r', user };

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: mode });
await ctx.route(`${SUPA}/**`, (route, req) => handleSupabase(route, req));
await ctx.route(`${BASE}/api/**`, (route, req) => handleApi(route, req));
await ctx.addInitScript(([key, sess, m, noSession]) => { if (!noSession) localStorage.setItem(key, JSON.stringify(sess)); localStorage.setItem('theme', m); }, [`sb-${REF}-auth-token`, session, mode, process.env.NOSESSION === '1']);

const page = await ctx.newPage();
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 300)));
for (const r of routes) {
  const name = (r === '/' ? 'home' : r.replace(/^\//, '').replace(/\//g, '-')) + (mobile ? '-mobile' : '') + '-' + mode;
  await page.goto(BASE + r, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log('shot', name);
}
if (errors.length) console.log('CONSOLE ERRORS:\n' + [...new Set(errors)].join('\n'));
await browser.close();
