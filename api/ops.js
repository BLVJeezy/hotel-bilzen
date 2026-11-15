// Villa Amano · Operations Center API
// Opslag: Vercel Blob (privé). Vereist BLOB_READ_WRITE_TOKEN (automatisch na "Connect store" in Vercel).
// Optioneel: OPS_SECRET (sessies), OPS_OWNER_PIN (vaste eigenaars-pincode).
const crypto = require('crypto');
const mail = require('./_mail');
const BZ = require('./_biz');
let blob = null;
try { blob = require('@vercel/blob'); } catch (e) { /* lokaal zonder dependency */ }

const ROOMS = ['rose', 'clear', 'sun', 'moon', 'amethyst'];
const ROOM_NAMES = { rose: 'Rose Quartz', clear: 'Clear Quartz', sun: 'Sunstone', moon: 'Moonstone', amethyst: 'Amethyst' };
const ROLES = {
  owner: ['today', 'orders', 'calendar', 'agenda', 'menus', 'prices', 'staff', 'log', 'connect', 'guests', 'scan'],
  receptie: ['today', 'orders', 'calendar', 'agenda', 'connect', 'guests', 'scan'],
  keuken: ['today', 'orders', 'menus', 'scan'],
};

const DEFAULTS = {
  config: () => ({
    staff: [],
    ownerPinHash: null,
    icalKey: crypto.randomBytes(12).toString('hex'),
    prices: { rose: 225, clear: 225, sun: 225, moon: 235, amethyst: 245 },
    ical: Object.fromEntries(ROOMS.map(r => [r, { booking: '', airbnb: '' }])),
  }),
  calendar: () => ({ entries: [] }),
  agenda: () => ({ events: [
    { id: 'e1', date: '2026-11-14', cat: 'event', time: '19:00 – 21:00', title: 'Sound bath in de wellness', text: 'Klankschalen, kaarslicht en een glas kruidenthee. Max. 10 gasten.', price: '€ 35 p.p.' },
    { id: 'e2', date: '2026-11-27', cat: 'pottery', time: '19:00 – 22:00', title: 'Raku-avond', text: 'Stook je eigen stuk in het vuur in de tuin.', price: '€ 65 p.p.' },
    { id: 'e3', date: '2026-12-06', cat: 'event', time: '14:00 – 17:00', title: 'Kerstmarkt van The Amano Shop', text: 'Keramiek, kaarsen en cadeaubonnen.', price: 'Gratis' },
    { id: 'e4', date: '2026-12-24', cat: 'ontbijt', time: '08:00 – 11:00', title: 'Kerstavond-brunch', text: 'Brunch met bubbels en huisgemaakte stol.', price: '€ 39 p.p.' },
    { id: 'e5', date: '2026-12-31', cat: 'event', time: '20:00 – 00:30', title: 'Oudejaar: ceramics & bubbels', text: 'Maak je wensenschaaltje, champagne om middernacht.', price: '€ 75 p.p.' },
  ] }),
  menus: () => ({
    menus: [
      { id: 'classic', name: 'Amano Classic', tag: 'Meest gekozen', price: 25, active: true, items: ['Croissant & zuurdesembrood', 'Roerei of zachtgekookt ei', 'Lokale kaas & ham', 'Huisgemaakte confituur', 'Verse jus & koffie of thee'] },
      { id: 'green', name: 'Green & Light', tag: 'Vegetarisch', price: 25, active: true, items: ['Griekse yoghurt & granola', 'Seizoensfruit & bessen', 'Avocado op zuurdesem', 'Groene smoothie', 'Kruidenthee of matcha'] },
      { id: 'med', name: 'Ibiza Sunrise', tag: 'Mediterraan', price: 28, active: true, items: ['Shakshuka met feta', 'Hummus, olijven & pita', 'Gegrilde tomaat & kruiden', 'Granaatappel-yoghurt', 'Glas cava inbegrepen'] },
    ],
    extras: [
      { id: 'prosecco', name: 'Prosecco', price: 6.5, active: true },
      { id: 'jus', name: 'Vers geperst sinaasappelsap', price: 4.5, active: true },
      { id: 'benedict', name: 'Eggs Benedict', price: 7, active: true },
      { id: 'bday', name: 'Verjaardagsverrassing', price: 12, active: true },
    ],
  }),
  orders: () => ({ orders: [] }),
  guests: () => ({ guests: [], reservations: [], requests: [] }),
  log: () => ({ log: [] }),
  housekeeping: () => ({ days: {} }),
  auth: () => ({ fails: {} }),
  tv: () => ({ def: { greeting: 'Welkom in Villa Amano', greetingGuest: 'Welkom, {naam}', sub: 'Rest · Create · Be', bg: 'villa-avond', lines: ['Ontbijt van 7:30 tot 10:30', 'Pottery House open tot 22:00', 'Vragen? Open je portaal of spreek ons aan'] }, rooms: {}, pending: {}, v: 1 }),
};

const PLANS = {
  'pottery-lid': { cat: 'pottery', name: 'Pottery House-lidmaatschap', price: '€ 25 eenmalig', text: 'Nodig voor vrij atelier en lessen. Inclusief Villa Amano-schort.' },
  'pottery-10': { cat: 'pottery', name: 'Atelierkaart · 10 beurten', price: '€ 270', text: '10 blokken van 3 uur vrij atelier, 1 jaar geldig.' },
  'pottery-onbeperkt': { cat: 'pottery', name: 'Onbeperkt atelier', price: '€ 95 / maand', text: 'Zo vaak je wil vrij atelier, maandelijks opzegbaar.' },
  'wellness-5': { cat: 'wellness', name: 'Wellness · 5-beurtenkaart', price: '€ 160', text: '5 bezoeken van max. 3 uur, 6 maanden geldig.' },
  'wellness-maand': { cat: 'wellness', name: 'Wellness maandabonnement', price: '€ 110 / maand', text: '4 bezoeken per maand, voorrang bij tijdsloten.' },
  'club': { cat: 'hotel', name: 'Amano Club', price: 'Gratis', text: '10% op elk verblijf, voorrang bij events en een welkomstdrankje.' },
};
const EXTRA_PRICES = { ontbijt: 25, well: 35, bike: 45, late: 45 };
function quote(cfg, r) {
  if (r.kind === 'room') {
    const n = Math.max(1, Math.round((new Date(r.to) - new Date(r.from)) / 864e5)), g = r.guests;
    let t = (cfg.prices[r.room] || 225) * n;
    if (r.extras.ontbijt) t += (r.bfPrice || 25) * g * n; if (r.extras.well) t += 35 * g; if (r.extras.bike) t += 45 * g * n; if (r.extras.late) t += 45;
    return { total: t, nights: n };
  }
  const base = r.kind === 'lessen' ? 385 : 30;
  return { total: base * r.guests + (r.member ? 0 : 25 * r.guests), nights: 0 };
}
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
const today = () => new Date(Date.now() + 3600e3).toISOString().slice(0, 10);
const daysUntil = d => Math.round((new Date(d + 'T12:00Z') - new Date(today() + 'T12:00Z')) / 864e5);

// ---------- storage ----------
const mem = {}; // fallback zonder Blob (alleen voor lokaal testen)
const hasStore = () => !!(blob && (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID));
async function load(name) {
  if (!hasStore()) { if (!mem[name]) mem[name] = { data: DEFAULTS[name](), etag: null }; return { data: JSON.parse(JSON.stringify(mem[name].data)), etag: 'mem' }; }
  const r = await blob.get(`ops/${name}.json`, { access: 'private', useCache: false }).catch(e => (e && e.name === 'BlobNotFoundError' ? null : Promise.reject(e)));
  if (!r) return { data: DEFAULTS[name](), etag: null };
  const text = await new Response(r.stream).text();
  return { data: JSON.parse(text || '{}'), etag: r.blob.etag };
}
async function save(name, data, etag) {
  if (!hasStore()) { mem[name] = { data }; return; }
  const opts = { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 };
  if (etag) opts.ifMatch = etag;
  await blob.put(`ops/${name}.json`, JSON.stringify(data), opts);
}
async function mutate(name, fn) {
  for (let i = 0; i < 7; i++) {
    const { data, etag } = await load(name);
    let cur = etag;
    if (hasStore() && etag) { try { const h = await blob.head(`ops/${name}.json`); cur = h && h.etag; } catch (e) { cur = null; } }
    const out = await fn(data);
    try { await save(name, data, cur); return out; }
    catch (e) { if (e && e.name === 'BlobPreconditionFailedError') { await new Promise(r => setTimeout(r, 80 * (i + 1) + Math.random() * 120)); continue; } throw e; }
  }
  throw new Error('Even druk, probeer opnieuw.');
}

// ---------- auth ----------
const secret = () => process.env.OPS_SECRET || crypto.createHash('sha256').update('va:' + (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID || 'local-dev')).digest('hex');
const hashPin = pin => crypto.createHmac('sha256', secret()).update('pin:' + String(pin)).digest('hex');
function sign(payload) {
  const b = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return b + '.' + crypto.createHmac('sha256', secret()).update(b).digest('base64url');
}
function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [b, s] = token.split('.');
  const exp = crypto.createHmac('sha256', secret()).update(b).digest('base64url');
  if (s.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(exp))) return null;
  const p = JSON.parse(Buffer.from(b, 'base64url').toString());
  return p.exp > Date.now() ? p : null;
}
const qrSig = (t, x) => crypto.createHmac('sha256', secret()).update('qr:' + t + ':' + x).digest('base64url').slice(0, 14);
const qrCode = (t, x) => 'VA' + t + '-' + x + '-' + qrSig(t, x);
const invKey = rid => crypto.createHmac('sha256', secret()).update('inv:' + rid).digest('base64url').slice(0, 16);
const SITE = () => process.env.SITE_URL || 'https://hotel-bilzen.vercel.app';
const encKey = () => crypto.createHash('sha256').update('enc:' + secret()).digest();
const enc = v => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', encKey(), iv); const d = Buffer.concat([c.update(String(v), 'utf8'), c.final()]); return 'enc:' + Buffer.concat([iv, c.getAuthTag(), d]).toString('base64url'); };
const dec = v => { if (!v || !String(v).startsWith('enc:')) return v || ''; try { const b = Buffer.from(String(v).slice(4), 'base64url'), d = crypto.createDecipheriv('aes-256-gcm', encKey(), b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'); } catch (e) { return ''; } };
const mcfg = C => ({ ...(C.mail || {}), key: dec((C.mail || {}).key) });
const mollieKey = C => process.env.MOLLIE_API_KEY || dec((C.biz || {}).mollieKey) || '';
async function mollie(C, path, opts = {}) {
  const r = await fetch('https://api.mollie.com/v2/' + path, { ...opts, headers: { authorization: 'Bearer ' + mollieKey(C), 'content-type': 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j && (j.detail || j.title)) || 'Betaling mislukt');
  return j;
}
async function ensureInvoiceNo(rid) {
  const { data: C } = await load('config'); const old = C.invoiceSeq || {}; let no = null;
  await mutate('guests', d => { const r = d.reservations.find(x => x.id === rid); if (!r) return; if (r.invoiceNo) { no = r.invoiceNo; return; }
    const y = new Date().getFullYear(); d.invoiceSeq = d.invoiceSeq || {}; d.invoiceSeq[y] = Math.max(d.invoiceSeq[y] || 0, old[y] || 0) + 1;
    no = y + '-' + String(d.invoiceSeq[y]).padStart(4, '0'); r.invoiceNo = no; r.invoiceDate = today(); });
  return no;
}
function qrParse(code) {
  const m = /^VA([RM])-([A-Za-z0-9]+)-([\w-]{14})$/.exec(String(code || '').trim().replace(/^.*[?#&]qr=/, ''));
  if (!m || m[3] !== qrSig(m[1], m[2])) return null;
  return { t: m[1], x: m[2] };
}
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
function validity(r) {
  const t = today();
  if (r.status === 'geannuleerd') return { ok: false, why: 'Geannuleerd' };
  const from = r.from || r.date, to = r.kind === 'room' ? r.to : r.kind === 'lessen' ? addDays(r.date, 56) : r.date;
  if (t < from) return { ok: false, why: 'Nog niet geldig · vanaf ' + from, early: true };
  if (t > to) return { ok: false, why: 'Verlopen · was geldig t/m ' + to };
  const single = r.kind === 'pottery' || r.kind === 'event' || r.kind === 'wellness';
  const used = (r.scans || []).some(s => s.ok && new Date(s.t).toISOString().slice(0, 10) === t);
  if (single && (r.scans || []).some(s => s.ok)) return { ok: false, why: 'Al gebruikt', used: true };
  return { ok: true, why: r.kind === 'room' ? 'Geldig verblijf' : r.kind === 'lessen' ? 'Geldige lessenreeks' : 'Geldig voor vandaag', again: used };
}
async function seedDemo(email, name) {
  const { data: C } = await load('config'), { data: K } = await load('calendar'), { data: A } = await load('agenda');
  const t = today(), used = [];
  const free = (f, n, pref) => { for (let i = 0; i < 60; i++) { const from = addDays(f, i), to = addDays(from, n); const room = [pref, ...ROOMS].find(rm => !used.some(u => u.room === rm && u.from < to && u.to > from) && !K.entries.some(e => e.demoFor !== email && e.room === rm && e.from < to && e.to > from)); if (room) { used.push({ room, from, to }); return { room, from, to }; } } return null; };
  const P0 = free(addDays(t, -9), 3, 'sun'), P1 = free(addDays(t, -1), 2, 'rose'), P2 = free(addDays(t, 21), 2, 'moon');
  const room = P1.room, from = P1.from, to = P1.to;
  const ev = A.events.filter(e => e.date > t).sort((x, y) => x.date < y.date ? -1 : 1)[0];
  let pw = null, g;
  await mutate('guests', d => {
    g = d.guests.find(x => x.email === email);
    if (!g) { pw = 'amano-' + crypto.randomBytes(3).toString('hex'); const salt = crypto.randomBytes(12).toString('hex'); g = { id: id(), email, name, phone: '', salt, pw: hashPw(pw, salt), created: Date.now(), memberships: {} }; d.guests.push(g); }
  d.reservations = d.reservations.filter(r => !(r.demo && r.guestId === g.id));
    const base = { guestId: g.id, guestName: g.name, created: Date.now(), status: 'bevestigd', demo: true };
    const mk = (k, x) => ({ id: 'R' + (Date.now() + k).toString(36).toUpperCase(), ...base, ...x });
    const stay = (k, P, ex) => { const r = mk(k, { kind: 'room', room: P.room, roomName: ROOM_NAMES[P.room], roomNo: ROOMS.indexOf(P.room) + 1, from: P.from, to: P.to, guests: 2, extras: { ontbijt: true, well: false, bike: false, late: false, ...ex } }); Object.assign(r, quote(C, r)); return r; };
    const r0 = stay(0, P0, { bike: true }); r0.scans = [{ t: new Date(P0.to + 'T10:40:00').getTime(), by: 'Receptie', ok: true }, { t: new Date(P0.from + 'T16:05:00').getTime(), by: 'Receptie', ok: true }]; r0.checkedIn = r0.scans[1].t;
    const r1 = stay(1, P1, { well: true });
    const r9 = stay(9, P2, { late: true });
    const r2 = mk(2, { kind: 'pottery', date: t, guests: 2, member: false }); Object.assign(r2, quote(C, r2));
    const rs = [r0, r1, r2];
    if (ev) rs.push(mk(3, { kind: 'event', eventId: ev.id, title: ev.title, date: ev.date, time: ev.time, guests: 2, total: (parseFloat(String(ev.price).replace(/[^\d,.]/g, '').replace(',', '.')) || 0) * 2 }));
    rs.push(r9); d.reservations.push(...rs); g._rs = rs;
  });
  const rs = g._rs; delete g._rs;
  await mutate('calendar', d => { d.entries = d.entries.filter(e => e.demoFor !== email); rs.filter(r => r.kind === 'room').forEach(r => d.entries.push({ id: 'c' + r.id, ref: r.id, room: r.room, from: r.from, to: r.to, type: 'booking', guest: g.name, guestId: g.id, note: 'Voorbeeld · 2 pers. · ontbijt', by: 'Demo', demo: true, demoFor: email, created: Date.now() })); });
  return { g, pw, rs, t };
}
async function sendMail(fn, ...args) { try { const { data: C } = await load('config'); mail.use(mcfg(C)); await mail[fn](...args); } catch (e) { console.error('mail', e && e.message); } }
const ipOf = req => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
async function locked(...keys) { const { data } = await load('auth'); let m = 0; keys.forEach(k => { const f = (data.fails || {})[k]; if (f && f.until > Date.now()) m = Math.max(m, Math.ceil((f.until - Date.now()) / 60000)); }); return m; }
async function failed(pairs) { try { await mutate('auth', d => { d.fails = d.fails || {}; const now = Date.now(); Object.keys(d.fails).forEach(k => { if ((d.fails[k].t || 0) < now - 3600e3) delete d.fails[k]; }); pairs.forEach(([k, max]) => { const f = d.fails[k] || { n: 0 }; if (f.t && f.t < now - 15 * 60e3) f.n = 0; f.n++; f.t = now; if (f.n >= max) { f.until = now + 15 * 60e3; f.n = 0; } d.fails[k] = f; }); }); } catch (e) {} }
const can = (u, perm) => u && (ROLES[u.role] || []).includes(perm);
async function addLog(u, text) {
  try { await mutate('log', d => { d.log.unshift({ t: Date.now(), who: u ? u.name : 'Website', text }); d.log = d.log.slice(0, 400); }); } catch (e) {}
}

// ---------- helpers ----------
const id = () => crypto.randomBytes(5).toString('hex');
// ---------- smart tv ----------
const TV_IMGS = ['villa-avond', 'villa-poort', 'terras', 'lounge', 'lounge2', 'pottery', 'rose-1', 'clear-1', 'sun-1', 'moon-1', 'ame-1'];
const tvHash = s => crypto.createHash('sha256').update('tv:' + String(s)).digest('hex');
const tvBg = v => { v = String(v || ''); return TV_IMGS.includes(v) ? v : /^https:\/\/[^\s"'<>]{8,300}$/.test(v) ? v : ''; };
function tvScreen(T, room) {
  const D = T.def || {}, R = (T.rooms || {})[room] || {}, o = R.override || {}, name = (R.manual && R.manual.name) || (R.auto && R.auto.name) || '';
  return { room, roomName: ROOM_NAMES[room], no: ROOMS.indexOf(room) + 1, title: o.title || (name ? String(D.greetingGuest || 'Welkom, {naam}').replace('{naam}', name) : D.greeting || 'Welkom'), sub: o.sub || D.sub || '', bg: tvBg(o.bg) || tvBg(D.bg) || 'villa-avond', lines: (D.lines || []).slice(0, 4), personal: !!name };
}
// Enige plek waar een gast aan een tv gekoppeld wordt. Nu gevoed door onze eigen reservaties; later door Mews (check-in / check-out).
async function tvSync() {
  const { data: G } = await load('guests'); const t = today(); const want = {};
  ROOMS.forEach(room => { const r = G.reservations.find(x => x.kind === 'room' && x.room === room && x.status !== 'geannuleerd' && !x.checkedOut && x.from <= t && x.to >= t && !(x.to === t && G.reservations.some(y => y !== x && y.kind === 'room' && y.room === room && y.status !== 'geannuleerd' && y.from === t)));
    want[room] = r ? { name: r.checkin && r.checkin.main ? (r.checkin.main.first + ' ' + r.checkin.main.last).trim() : r.guestName, ref: r.id } : null; });
  const { data: T0 } = await load('tv');
  const diff = ROOMS.some(room => JSON.stringify(((T0.rooms || {})[room] || {}).auto || null) !== JSON.stringify(want[room]));
  if (diff) await mutate('tv', T => { T.rooms = T.rooms || {}; ROOMS.forEach(room => { const R = T.rooms[room] = T.rooms[room] || {}; if (want[room]) R.auto = want[room]; else { delete R.auto; } }); T.v = (T.v || 0) + 1; });
}
async function tvClear(room) { try { await mutate('tv', T => { const R = (T.rooms || {})[room]; if (!R) return; delete R.auto; delete R.manual; delete R.override; T.v = (T.v || 0) + 1; }); } catch (e) {} }
const clean = (v, n = 300) => String(v == null ? '' : v).replace(/[<>]/g, '').slice(0, n).trim();
const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
function send(res, code, obj, headers = {}) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(obj));
}
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return await new Promise(r => { let d = ''; req.on('data', c => (d += c)); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch (e) { r({}); } }); });
}
function icsEscape(s) { return String(s).replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n'); }
const ymd = d => d.replace(/-/g, '');

// ---------- handler ----------
module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const a = url.searchParams.get('a') || '';
  try {
    // ===== publiek =====
    if (a === 'status') return send(res, 200, { ok: true, store: hasStore(), sdk: !!blob, env: { token: !!process.env.BLOB_READ_WRITE_TOKEN, storeId: !!process.env.BLOB_STORE_ID, oidc: !!process.env.VERCEL_OIDC_TOKEN } });
    if (a === 'menus') {
      const { data } = await load('menus');
      return send(res, 200, data, { 'cache-control': 's-maxage=20, stale-while-revalidate=60' });
    }
    if (a === 'events') {
      const { data } = await load('agenda');
      return send(res, 200, { events: data.events }, { 'cache-control': 's-maxage=30, stale-while-revalidate=120' });
    }
    if (a === 'prices') {
      const { data } = await load('config');
      return send(res, 200, { prices: data.prices }, { 'cache-control': 's-maxage=60' });
    }
    if (a === 'order' && req.method === 'POST') {
      const b = await body(req);
      const gu = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
      if (!gu || gu.role !== 'guest') return send(res, 401, { error: 'Log in via je portaal om ontbijt te bestellen' });
      const date = isDate(b.date) ? b.date : new Date(Date.now() + 3600e3).toISOString().slice(0, 10);
      const { data: G } = await load('guests');
      const stay = G.reservations.filter(r => r.guestId === gu.gid && r.kind === 'room' && r.status !== 'geannuleerd' && r.from < date && r.to >= date).sort((x, y) => x.from < y.from ? 1 : -1)[0];
      if (!stay) return send(res, 409, { error: 'Geen verblijf gevonden voor die dag. Ontbijt kan je bestellen vanaf de ochtend na aankomst tot en met je vertrekdag.' });
      const room = stay.roomNo;
      const { data: M } = await load('menus'), { data: O0 } = await load('orders');
      let items = (b.items || []).map(x => {
        const m = M.menus.find(y => y.id === x.id && y.active);
        const q = Math.max(0, Math.min(6, parseInt(x.qty, 10) || 0));
        return m && q ? { id: m.id, name: m.name, qty: q, price: m.price } : null;
      }).filter(Boolean);
      if (!items.length) return send(res, 400, { error: 'Kies minstens één menu' });
      // ontbijt inbegrepen in het verblijf: zoveel menu's gratis als er gasten zijn, per dag
      let incl = 0;
      if (stay.extras && stay.extras.ontbijt) {
        const used = O0.orders.filter(o => o.reservationId === stay.id && o.date === date && o.status !== 'geannuleerd').reduce((n, o) => n + (o.included || 0), 0);
        incl = Math.max(0, (stay.guests || 1) - used);
      }
      let left = incl, included = 0;
      items = items.map(it => { const f = Math.min(left, it.qty); left -= f; included += f; return { ...it, free: f, line: (it.qty - f) * it.price }; });
      const extras = (b.extras || []).map(eid => M.extras.find(y => y.id === eid && y.active)).filter(Boolean).map(e => ({ id: e.id, name: e.name, price: e.price }));
      const total = items.reduce((s, x) => s + x.line, 0) + extras.reduce((s, x) => s + x.price, 0);
      const order = {
        id: 'VA-' + Date.now().toString().slice(-6), created: Date.now(), status: 'nieuw',
        room, roomName: ROOM_NAMES[ROOMS[room - 1]], date,
        time: /^\d{2}:\d{2}$/.test(b.time) ? b.time : '08:30', where: b.where === 'terras' ? 'terras' : 'kamer',
        guestId: gu.gid, guestName: stay.guestName, reservationId: stay.id, items, extras, diet: (b.diet || []).map(d => clean(d, 40)).slice(0, 6), note: clean(b.note, 300), total, included, payment: 'kamerrekening',
      };
      await mutate('orders', d => { d.orders.unshift(order); d.orders = d.orders.slice(0, 600); });
      if (total > 0) await mutate('guests', d => { const r = d.reservations.find(x => x.id === stay.id); if (r) { r.charges = r.charges || []; r.charges.push({ id: order.id, label: 'Ontbijt ' + date, amount: total, t: Date.now() }); } });
      await addLog(null, `Nieuwe ontbijtbestelling ${order.id} · kamer ${room} · ${stay.guestName} · € ${total}`);
      { const gg = G.guests.find(x => x.id === gu.gid); if (gg) await sendMail('order', gg, order); }
      return send(res, 200, { ok: true, id: order.id, total, included, room, roomName: order.roomName });
    }
    if (a === 'invoice') {
      const rid = url.searchParams.get('id') || '', k = url.searchParams.get('k') || '';
      if (!rid || k.length !== 16 || k !== invKey(rid)) return send(res, 404, { error: 'Factuur niet gevonden' });
      const [{ data: C }, { data: G }] = await Promise.all([load('config'), load('guests')]);
      const r = G.reservations.find(x => x.id === rid); if (!r) return send(res, 404, { error: 'Factuur niet gevonden' });
      const no = r.invoiceNo || null;
      const g = G.guests.find(x => x.id === r.guestId) || {};
      const B = BZ.biz(C); delete B.mollieKey;
      return send(res, 200, { biz: B, doc: no ? 'factuur' : 'leverbon', invoiceNo: no || 'LB-' + r.id, invoiceDate: r.invoiceDate || today(), guest: { name: g.name || r.guestName, email: g.email || '', phone: g.phone || '', company: (r.bill || {}).company || g.company || '', vat: (r.bill || {}).vat || g.vatNo || '', address: (r.bill || {}).address || '' }, reservation: { id: r.id, kind: r.kind, status: r.status, roomName: r.roomName, from: r.from, to: r.to, date: r.date, guests: r.guests }, payments: (r.payments || []).filter(p => p.status === 'paid').map(p => ({ amount: p.amount, method: p.method, t: p.t })), ...BZ.totals(C, r) });
    }
    if (a === 'mollie-hook' && req.method === 'POST') {
      let b = req.body; if (typeof b === 'string') b = Object.fromEntries(new URLSearchParams(b)); if (!b || typeof b !== 'object') b = Object.fromEntries(new URLSearchParams(await new Promise(r => { let d = ''; req.on('data', c => (d += c)); req.on('end', () => r(d)); })));
      const pid = String(b.id || ''); if (!/^tr_\w+$/.test(pid)) return send(res, 200, { ok: true });
      const { data: C } = await load('config');
      const p = await mollie(C, 'payments/' + pid);
      const rid = p.metadata && p.metadata.rid; let nm = '';
      await mutate('guests', d => { const r = d.reservations.find(x => x.id === rid); if (!r) return; nm = r.guestName; r.payments = r.payments || []; let q = r.payments.find(x => x.mollieId === pid); if (!q) { q = { id: pid, mollieId: pid, amount: +p.amount.value, method: 'online', t: Date.now() }; r.payments.push(q); } q.status = p.status === 'paid' ? 'paid' : p.status; if (p.status === 'paid') { q.t = Date.now(); q.method = 'online · ' + (p.method || 'Mollie'); } });
      if (p.status === 'paid') await addLog(null, `Online betaling ontvangen · ${rid} · € ${p.amount.value} · ${nm}`);
      return send(res, 200, { ok: true });
    }
    if (a === 'tv-pair-start' && req.method === 'POST') {
      const lk = await locked('tv:' + ipOf(req)); if (lk) return send(res, 429, { error: 'Even wachten' });
      await failed([['tv:' + ipOf(req), 12]]);
      const secretTv = crypto.randomBytes(24).toString('base64url'); let code;
      await mutate('tv', T => { T.pending = T.pending || {}; const now = Date.now(); Object.keys(T.pending).forEach(k => { if (T.pending[k].t < now - 15 * 60e3) delete T.pending[k]; }); const ks = Object.keys(T.pending); if (ks.length >= 20) delete T.pending[ks[0]];
        do { code = String(crypto.randomInt(100000, 999999)); } while (T.pending[code]); T.pending[code] = { h: tvHash(secretTv), t: now }; });
      return send(res, 200, { code, secret: secretTv });
    }
    if (a === 'tv-state') {
      const h = tvHash(req.headers['x-tv'] || ''); const { data: T } = await load('tv');
      const room = ROOMS.find(r => ((T.rooms || {})[r] || {}).h === h);
      if (!room) { const pc = Object.keys(T.pending || {}).find(k => T.pending[k].h === h && T.pending[k].t > Date.now() - 15 * 60e3); return send(res, 200, pc ? { paired: false, code: pc } : { paired: false, expired: true }); }
      if (!(T.rooms[room].seen > Date.now() - 5 * 60e3)) { try { await mutate('tv', X => { if (X.rooms && X.rooms[room]) X.rooms[room].seen = Date.now(); }); } catch (e) {} }
      res.setHeader('cache-control', 'no-store');
      return send(res, 200, { paired: true, v: T.v || 0, screen: tvScreen(T, room) });
    }
    if (a === 'cron') {
      const okCron = /vercel-cron/i.test(req.headers['user-agent'] || '') || (process.env.CRON_SECRET && (req.headers.authorization || '') === 'Bearer ' + process.env.CRON_SECRET);
      const uu = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
      if (!okCron && !(uu && uu.role === 'owner')) return send(res, 401, { error: 'unauthorized' });
      const [{ data: C }, { data: G }] = await Promise.all([load('config'), load('guests')]);
      mail.use(mcfg(C));
      const t = today(), todo = [];
      try { await tvSync(); } catch (e) {}
      for (const r of G.reservations) {
        if (r.kind !== 'room' || r.status === 'geannuleerd' || r.demo) continue;
        const g = G.guests.find(x => x.id === r.guestId); if (!g || g.demo || !g.email) continue;
        const m = r.mails || {}, dIn = daysUntil(r.from), dOut = daysUntil(r.to);
        if (!m.pre && dIn >= 1 && dIn <= 3 && !(r.checkin && r.checkin.t && dIn < 1)) todo.push([r.id, 'pre', () => mail.preArrival(g, { ...r, _days: dIn })]);
        if (!m.out && dOut === 0 && !r.checkedOut) todo.push([r.id, 'out', () => mail.checkoutDay(g, r, BZ.totals(C, r))]);
        if (!m.post && dOut <= -1 && dOut >= -3) todo.push([r.id, 'post', () => mail.postStay(g, r)]);
      }
      const sent = [];
      for (const [rid, k, fn] of todo) { try { const x = await fn(); if (x && !x.skipped && !x.error) sent.push([rid, k]); } catch (e) {} }
      if (sent.length) await mutate('guests', d => { sent.forEach(([rid, k]) => { const r = d.reservations.find(x => x.id === rid); if (r) { r.mails = r.mails || {}; r.mails[k] = Date.now(); } }); });
      if (sent.length) await addLog(null, `Automatische mails verstuurd: ${sent.length}`);
      return send(res, 200, { ok: true, date: t, sent });
    }
    if (a === 'ical') {
      const room = url.searchParams.get('room');
      const { data: C } = await load('config');
      if (!ROOMS.includes(room) || url.searchParams.get('k') !== C.icalKey) { res.statusCode = 404; return res.end('Not found'); }
      const { data: K } = await load('calendar');
      const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Villa Amano//Ops//NL', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:Villa Amano · ${ROOM_NAMES[room]}`];
      K.entries.filter(e => e.room === room).forEach(e => {
        lines.push('BEGIN:VEVENT', `UID:${e.id}@villa-amano`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
          `DTSTART;VALUE=DATE:${ymd(e.from)}`, `DTEND;VALUE=DATE:${ymd(e.to)}`, `SUMMARY:${icsEscape(e.type === 'booking' ? 'Geboekt' : 'Niet beschikbaar')}`, 'END:VEVENT');
      });
      lines.push('END:VCALENDAR');
      res.setHeader('content-type', 'text/calendar; charset=utf-8');
      res.setHeader('cache-control', 'no-store');
      return res.end(lines.join('\r\n'));
    }

    // ===== alleen-lezen export voor Solyn Hub OS =====
    // Bearer-token vergeleken met een sha256-hash; verandert niets aan de data.
    if (a === 'hub-export') {
      const tok = (req.headers.authorization || '').replace(/^Bearer /, '');
      const h = crypto.createHash('sha256').update(tok).digest();
      const want = Buffer.from('e90eee71d18b9ce42970c81552537774f31b34d4d1b366cc9557af808113a902', 'hex');
      if (!tok || !crypto.timingSafeEqual(h, want)) return send(res, 401, { error: 'unauthorized' });
      const [{ data: G }, { data: K }, { data: O }] = await Promise.all([load('guests'), load('calendar'), load('orders')]);
      const guestById = Object.fromEntries((G.guests || []).map(g => [g.id, g]));
      const KIND = { room: 'Kamer', pottery: 'Pottery', lessen: 'Pottery-lessenreeks', event: 'Event', wellness: 'Wellness' };
      const records = [];
      for (const r of G.reservations || []) {
        if (r.demo) continue;
        const g = guestById[r.guestId] || {};
        records.push({
          kind: 'reservatie', external_id: r.id,
          starts_at: r.from || r.date || null, ends_at: r.to || null,
          status: r.status || null,
          title: r.kind === 'room' ? `${r.roomName || 'Kamer'}` : r.kind === 'event' ? (r.title || 'Event') : (KIND[r.kind] || r.kind) + (r.time ? ' ' + r.time : ''),
          customer_name: r.guestName || g.name || null, customer_email: g.email || null, customer_phone: g.phone || null,
          message: null, amount: typeof r.total === 'number' ? r.total + (r.charges || []).reduce((s, c) => s + (c.amount || 0), 0) : null,
          source: 'website', extra: { soort: r.kind, gasten: r.guests, extras: r.extras, ingecheckt: !!r.checkedIn },
          source_created_at: r.created ? new Date(r.created).toISOString() : null,
        });
      }
      for (const e of K.entries || []) {
        if (e.ref || e.demoFor) continue; // eigen website-reservaties staan hierboven al
        records.push({
          kind: e.type === 'booking' ? 'reservatie' : 'blokkade', external_id: 'cal-' + e.id,
          starts_at: e.from, ends_at: e.to, status: e.type === 'booking' ? 'bevestigd' : 'geblokkeerd',
          title: ROOM_NAMES[e.room] || e.room, customer_name: e.guest || null, customer_email: null, customer_phone: null,
          message: e.note || null, amount: null, source: e.source || (e.by ? 'manueel' : 'kalender'), extra: {},
          source_created_at: e.created ? new Date(e.created).toISOString() : null,
        });
      }
      for (const o of O.orders || []) {
        const g = guestById[o.guestId] || {};
        records.push({
          kind: 'bestelling', external_id: o.id,
          starts_at: o.date ? `${o.date}T${o.time || '08:30'}:00+01:00` : null, ends_at: null, status: o.status || null,
          title: `Ontbijt · ${o.roomName || 'kamer ' + o.room}`, customer_name: o.guestName || g.name || null,
          customer_email: g.email || null, customer_phone: g.phone || null,
          message: (o.items || []).map(i => `${i.qty}× ${i.name}`).join(', ') + (o.note ? ' · ' + o.note : ''),
          amount: o.total, source: 'website', extra: { waar: o.where, dieet: o.diet },
          source_created_at: o.created ? new Date(o.created).toISOString() : null,
        });
      }
      return send(res, 200, { ok: true, records }, { 'cache-control': 'no-store' });
    }

    // ===== nachtelijke off-site back-up (Solyn) =====
    // Bearer: hub-export-token of het gedeelde Solyn back-up-token. Geeft alle ops-documenten terug, zonder
    // pincodes, sleutels of geheime iCal-links. Verandert niets aan de data.
    if (a === 'backup-export') {
      const tok = (req.headers.authorization || '').replace(/^Bearer /, '');
      const h = crypto.createHash('sha256').update(tok).digest();
      const ok = ['e90eee71d18b9ce42970c81552537774f31b34d4d1b366cc9557af808113a902',
                  '07cc86d4b801acd9882c238a7bc712c243469ec8f557382b52893a702810a7b4']
        .some(x => crypto.timingSafeEqual(h, Buffer.from(x, 'hex')));
      if (!tok || !ok) return send(res, 401, { error: 'unauthorized' });
      const SECRET = /(pin|hash|secret|token|password|key|pw|salt)$/i;
      const scrub = v => Array.isArray(v) ? v.map(scrub)
        : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v)
            .filter(([k]) => !SECRET.test(k) && k !== 'ical').map(([k, x]) => [k, scrub(x)]))
        : v;
      const names = Object.keys(DEFAULTS);
      const docs = await Promise.all(names.map(n => load(n).then(r => r.data)));
      const data = Object.fromEntries(names.map((n, i) => [n, scrub(docs[i])]));
      const counts = {};
      for (const n of names) for (const [k, v] of Object.entries(data[n] || {})) if (Array.isArray(v)) counts[`${n}.${k}`] = v.length;
      return send(res, 200, { target: 'villa-amano', exported_at: new Date().toISOString(), format: 2, tables: counts, data });
    }

    // ===== inloggen =====
    if (a === 'setup-needed') {
      const { data: C } = await load('config');
      return send(res, 200, { setup: !process.env.OPS_OWNER_PIN && !C.ownerPinHash, store: hasStore() });
    }
    if (a === 'setup' && req.method === 'POST') {
      const b = await body(req);
      const pin = String(b.pin || '');
      if (!/^\d{4,8}$/.test(pin)) return send(res, 400, { error: 'Kies een pincode van 4 tot 8 cijfers' });
      const out = await mutate('config', C => {
        if (process.env.OPS_OWNER_PIN || C.ownerPinHash) return false;
        C.ownerPinHash = hashPin(pin); C.ownerName = clean(b.name, 40) || 'Eigenaar'; return true;
      });
      if (!out) return send(res, 403, { error: 'Al ingesteld' });
      await addLog({ name: clean(b.name, 40) || 'Eigenaar' }, 'Operations center ingesteld');
      return send(res, 200, { ok: true });
    }
    if (a === 'login' && req.method === 'POST') {
      const b = await body(req);
      const pin = String(b.pin || '');
      const lk = await locked('pin:' + ipOf(req), 'pin:*'); if (lk) return send(res, 429, { error: `Te veel pogingen. Probeer opnieuw over ${lk} minuten.` });
      await new Promise(r => setTimeout(r, 350));
      const { data: C } = await load('config');
      let user = null;
      if ((process.env.OPS_OWNER_PIN && pin === process.env.OPS_OWNER_PIN) || (C.ownerPinHash && hashPin(pin) === C.ownerPinHash)) user = { id: 'owner', name: C.ownerName || 'Eigenaar', role: 'owner' };
      else if (C.adminPinHash && hashPin(pin) === C.adminPinHash) user = { id: 'admin', name: 'Solyn', role: 'beheer' };
      else { const s = C.staff.find(x => x.pinHash === hashPin(pin) && x.active !== false); if (s) user = { id: s.id, name: s.name, role: s.role }; }
      const demoOn = C.demoLogin !== false;
      if (!user && demoOn && String(b.email || '').trim().toLowerCase() === 'admin' && String(b.password || '') === 'admin') user = { id: 'demo-owner', name: 'Admin (demo)', role: 'owner' };
      if (!user) { await failed([['pin:' + ipOf(req), 5], ['pin:*', 40]]); return send(res, 401, { error: b.email !== undefined ? 'Onbekende login' : 'Onbekende pincode' }); }
      const token = sign({ ...user, exp: Date.now() + 30 * 864e5 });
      await addLog(user, 'Ingelogd');
      return send(res, 200, { token, user: user.role === 'beheer' ? { ...user, role: 'owner', admin: true } : user, perms: ROLES[user.role === 'beheer' ? 'owner' : user.role] });
    }

    // ===== gasten: account =====
    if (a === 'plans') return send(res, 200, { plans: PLANS });
    if (a === 'g-config') { const { data: C } = await load('config'); return send(res, 200, { google: process.env.GOOGLE_CLIENT_ID || C.googleClientId || null }); }
    if (a === 'g-google' && req.method === 'POST') {
      const b = await body(req);
      const { data: C } = await load('config');
      const cid = process.env.GOOGLE_CLIENT_ID || C.googleClientId;
      if (!cid) return send(res, 400, { error: 'Google-login is nog niet ingesteld' });
      let info;
      try { const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(b.credential || ''))); info = r.ok ? await r.json() : null; } catch (e) { info = null; }
      if (!info || info.aud !== cid || !['accounts.google.com', 'https://accounts.google.com'].includes(info.iss) || String(info.email_verified) !== 'true' || Number(info.exp) * 1000 < Date.now())
        return send(res, 401, { error: 'Inloggen met Google mislukt, probeer opnieuw' });
      const email = String(info.email).toLowerCase();
      let g, isNew = false;
      await mutate('guests', d => {
        g = d.guests.find(x => x.googleSub === info.sub) || d.guests.find(x => x.email === email);
        if (g) { g.googleSub = info.sub; if (!g.name) g.name = clean(info.name, 80); return; }
        g = { id: id(), email, name: clean(info.name || email.split('@')[0], 80), phone: '', googleSub: info.sub, created: Date.now(), memberships: {} };
        d.guests.push(g); isNew = true;
      });
      if (isNew) { await addLog({ name: g.name }, 'Nieuw gastaccount (Google)'); await sendMail('welcome', g); }
      return send(res, 200, { token: sign({ gid: g.id, name: g.name, role: 'guest', exp: Date.now() + 180 * 864e5 }), name: g.name, isNew, needPhone: !g.phone });
    }
    if (a === 'g-forgot' && req.method === 'POST') {
      const b = await body(req); const email = clean(b.email, 120).toLowerCase();
      await new Promise(r => setTimeout(r, 400));
      const { data: G } = await load('guests'); const g = G.guests.find(x => x.email === email && !x.demo);
      if (g) { const pl = Buffer.from(JSON.stringify({ gid: g.id, exp: Date.now() + 3600e3, v: String(g.pw || g.googleSub || '').slice(0, 10) })).toString('base64url');
        const tok = pl + '.' + crypto.createHmac('sha256', secret()).update('reset:' + pl).digest('base64url');
        await sendMail('reset', g, SITE() + '/portaal/?reset=' + tok); await addLog({ name: g.name }, 'Wachtwoord-herstel aangevraagd'); }
      return send(res, 200, { ok: true });
    }
    if (a === 'g-reset' && req.method === 'POST') {
      const b = await body(req); const [pl, sg] = String(b.token || '').split('.'); const pw = String(b.password || '');
      let d = null; try { const ex = crypto.createHmac('sha256', secret()).update('reset:' + pl).digest('base64url'); if (sg && sg.length === ex.length && crypto.timingSafeEqual(Buffer.from(sg), Buffer.from(ex))) d = JSON.parse(Buffer.from(pl, 'base64url').toString()); } catch (e) {}
      if (!d || d.exp < Date.now()) return send(res, 400, { error: 'Deze link is verlopen. Vraag een nieuwe aan.' });
      if (pw.length < 6) return send(res, 400, { error: 'Wachtwoord: minstens 6 tekens' });
      let g = null;
      await mutate('guests', G => { const x = G.guests.find(y => y.id === d.gid); if (!x || String(x.pw || x.googleSub || '').slice(0, 10) !== d.v) return; x.salt = crypto.randomBytes(12).toString('hex'); x.pw = hashPw(pw, x.salt); g = x; });
      if (!g) return send(res, 400, { error: 'Deze link is al gebruikt. Vraag een nieuwe aan.' });
      await addLog({ name: g.name }, 'Wachtwoord opnieuw ingesteld');
      return send(res, 200, { token: sign({ gid: g.id, name: g.name, role: 'guest', exp: Date.now() + 180 * 864e5 }), name: g.name });
    }
    if ((a === 'g-register' || a === 'g-login') && req.method === 'POST') {
      const b = await body(req);
      let email = clean(b.email, 120).toLowerCase(), pw = String(b.password || '');
      if (a === 'g-login' && email === 'customer' && pw === 'customer') {
        const { data: C } = await load('config');
        if (C.demoLogin === false) return send(res, 401, { error: 'Demo-login staat uit' });
        let g;
        await mutate('guests', d => { g = d.guests.find(x => x.email === 'customer@demo.villa-amano.be'); if (!g) { const salt = crypto.randomBytes(12).toString('hex'); g = { id: id(), email: 'customer@demo.villa-amano.be', name: 'Demo Gast', phone: '+32 470 00 00 00', salt, pw: hashPw('customer', salt), created: Date.now(), memberships: {}, demo: true }; d.guests.push(g); } });
        const { data: G1 } = await load('guests');
        if (!G1.reservations.some(r => r.guestId === g.id)) await seedDemo('customer@demo.villa-amano.be', 'Demo Gast');
        return send(res, 200, { token: sign({ gid: g.id, name: g.name, role: 'guest', exp: Date.now() + 180 * 864e5 }), name: g.name });
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return send(res, 400, { error: 'Vul een geldig e-mailadres in' });
      if (pw.length < 6) return send(res, 400, { error: 'Wachtwoord: minstens 6 tekens' });
      await new Promise(r => setTimeout(r, 250));
      let g;
      if (a === 'g-register') {
        const name = clean(b.name, 80);
        if (!name) return send(res, 400, { error: 'Vul je naam in' });
        const r = await mutate('guests', d => {
          if (d.guests.some(x => x.email === email)) return 'dup';
          const salt = crypto.randomBytes(12).toString('hex');
          g = { id: id(), email, name, phone: clean(b.phone, 40), salt, pw: hashPw(pw, salt), created: Date.now(), memberships: {} };
          d.guests.push(g); return 'ok';
        });
        if (r === 'dup') return send(res, 409, { error: 'Er bestaat al een account met dit e-mailadres. Log in.' });
        await addLog({ name: g.name }, 'Nieuw gastaccount');
        await sendMail('welcome', g);
      } else {
        const lk = await locked('g:' + ipOf(req), 'g:' + email); if (lk) return send(res, 429, { error: `Te veel pogingen. Probeer opnieuw over ${lk} minuten of kies 'Wachtwoord vergeten'.` });
        const { data } = await load('guests');
        g = data.guests.find(x => x.email === email);
        if (g && !g.pw) return send(res, 401, { error: 'Dit account gebruikt Google. Tik op “Doorgaan met Google”.' });
        if (!g || hashPw(pw, g.salt) !== g.pw) { await failed([['g:' + ipOf(req), 20], ['g:' + email, 8]]); return send(res, 401, { error: 'E-mail of wachtwoord klopt niet' }); }
      }
      return send(res, 200, { token: sign({ gid: g.id, name: g.name, role: 'guest', exp: Date.now() + 180 * 864e5 }), name: g.name });
    }

    // ===== beveiligd =====
    const u = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
    if (!u) return send(res, 401, { error: 'Log opnieuw in' });
    let tech = false;
    if (u.role === 'guest') {
      const gid = u.gid;
      if (a === 'g-me') {
        const [{ data: G }, { data: O }, { data: C0 }] = await Promise.all([load('guests'), load('orders'), load('config')]);
        const g = G.guests.find(x => x.id === gid);
        if (!g) return send(res, 401, { error: 'Log opnieuw in' });
        return send(res, 200, {
          me: { name: g.name, email: g.email, phone: g.phone, memberships: g.memberships || {}, memberNo: 'VA-' + g.id.slice(0, 6).toUpperCase(), qr: qrCode('M', g.id) },
          reservations: G.reservations.filter(r => r.guestId === gid).map(r => ({ ...r, pay: (({ total, paid, due, deposit }) => ({ total, paid, due, deposit }))(BZ.totals(C0, r)), inv: '/factuur?id=' + r.id + '&k=' + invKey(r.id), qr: qrCode('R', r.id), valid: validity(r), lastScan: (r.scans || [])[0] || null, extraTotal: (r.charges || []).reduce((n, c) => n + c.amount, 0) })).sort((x, y) => ((x.from || x.date) < (y.from || y.date) ? -1 : 1)),
          requests: G.requests.filter(r => r.guestId === gid).slice(0, 30),
          orders: O.orders.filter(o => o.guestId === gid).slice(0, 30), plans: PLANS, today: today(), payOnline: !!mollieKey(C0), depositPct: BZ.biz(C0).deposit,
        });
      }
      if (req.method !== 'POST') return send(res, 405, { error: 'POST verwacht' });
      const b = await body(req);
      if (a === 'g-reserve') {
        const kind = ['room', 'pottery', 'lessen', 'event', 'wellness'].includes(b.kind) ? b.kind : null;
        if (!kind) return send(res, 400, { error: 'Ongeldige reservatie' });
        const { data: C } = await load('config');
        const { data: G0 } = await load('guests');
        const g = G0.guests.find(x => x.id === gid);
        if (!g) return send(res, 401, { error: 'Log opnieuw in' });
        const r = { id: 'R' + Date.now().toString(36).toUpperCase(), guestId: gid, guestName: g.name, kind, created: Date.now(), status: 'bevestigd', guests: Math.max(1, Math.min(6, parseInt(b.guests, 10) || 1)) };
        if (kind === 'room') {
          if (!ROOMS.includes(b.room) || !isDate(b.from) || !isDate(b.to) || b.to <= b.from || b.from < today()) return send(res, 400, { error: 'Kies geldige data' });
          r.room = b.room; r.roomName = ROOM_NAMES[b.room]; r.roomNo = ROOMS.indexOf(b.room) + 1; r.from = b.from; r.to = b.to;
          r.guests = Math.min(r.guests, b.room === 'amethyst' ? 3 : 2);
          r.extras = Object.fromEntries(Object.keys(EXTRA_PRICES).map(k => [k, !!(b.extras || {})[k]]));
          if (r.extras.ontbijt && b.bfMenu) { const { data: MM } = await load('menus'); const mm = MM.menus.find(x => x.id === b.bfMenu && x.active); if (mm) { r.bfMenu = mm.id; r.bfName = mm.name; r.bfPrice = mm.price; } }
        } else if (kind === 'event') {
          const { data: A } = await load('agenda');
          const ev = A.events.find(e => e.id === b.eventId);
          if (!ev || ev.date < today()) return send(res, 400, { error: 'Dit event is niet meer beschikbaar' });
          if (G0.reservations.some(x => x.guestId === gid && x.eventId === ev.id && x.status !== 'geannuleerd')) return send(res, 409, { error: 'Je bent al ingeschreven voor dit event' });
          r.eventId = ev.id; r.title = ev.title; r.date = ev.date; r.time = ev.time;
        } else {
          if (!isDate(b.date) || b.date < today()) return send(res, 400, { error: 'Kies een geldige datum' });
          r.date = b.date; r.member = !!(g.memberships['pottery-lid'] && g.memberships['pottery-lid'].status === 'actief') || !!b.member;
          if (/^\d{2}:\d{2}$/.test(b.time || '')) r.time = b.time;
        }
        if (kind === 'wellness') { const wm = Object.entries(g.memberships || {}).some(([k, m]) => /^wellness/.test(k) && m.status === 'actief'); r.total = wm ? 0 : 35 * r.guests; r.member = wm; }
        else if (kind === 'event') { const { data: A } = await load('agenda'); const ev = A.events.find(e => e.id === r.eventId); const n = parseFloat(String(ev.price).replace(/[^\d,.]/g, '').replace(',', '.')) || 0; r.total = n * r.guests; }
        else Object.assign(r, quote(C, r));
        if (kind === 'room') {
          const clash = await mutate('calendar', d => { const c = d.entries.find(x => x.room === r.room && x.from < r.to && x.to > r.from); if (c) return c; d.entries.push({ id: 'c' + r.id, ref: r.id, room: r.room, from: r.from, to: r.to, type: 'booking', guest: g.name, guestId: gid, note: 'Online · ' + r.guests + ' pers.' + (r.extras.ontbijt ? ' · ontbijt' + (r.bfName ? ' (' + r.bfName + ')' : '') : '') + (r.extras.late ? ' · late check-out' : ''), by: 'Website', created: Date.now() }); return null; });
          if (clash) return send(res, 409, { error: 'Deze kamer is net bezet voor (een deel van) deze periode. Kies andere data.' });
        }
        await mutate('guests', d => { d.reservations.push(r); });
        await addLog({ name: g.name }, `Reservatie ${r.id} · ${kind === 'room' ? r.roomName + ' ' + r.from + ' → ' + r.to : (kind === 'event' ? r.title + ' ' : kind === 'wellness' ? 'Wellness ' : kind === 'lessen' ? 'Lessenreeks ' : 'Vrij atelier ') + r.date}`);
        if (kind === 'room' && r.from <= today()) { try { await tvSync(); } catch (e) {} }
        await sendMail('reservation', g, r);
        return send(res, 200, { ok: true, reservation: r });
      }
      if (a === 'g-pay') {
        const { data: C } = await load('config');
        if (!mollieKey(C)) return send(res, 400, { error: 'Online betalen is nog niet beschikbaar. Je betaalt ter plaatse.' });
        const { data: G } = await load('guests');
        const r = G.reservations.find(x => x.id === b.id && x.guestId === gid);
        if (!r || r.status === 'geannuleerd') return send(res, 404, { error: 'Reservatie niet gevonden' });
        const T = BZ.totals(C, r);
        const amount = BZ.r2(b.what === 'deposit' ? Math.min(T.deposit, T.due) : T.due);
        if (amount < 1) return send(res, 400, { error: 'Er staat niets meer open' });
        const p = await mollie(C, 'payments', { method: 'POST', body: JSON.stringify({ amount: { currency: 'EUR', value: amount.toFixed(2) }, description: `Villa Amano · ${r.id}${b.what === 'deposit' ? ' · voorschot' : ''}`, redirectUrl: SITE() + '/portaal/?betaald=' + r.id, webhookUrl: SITE() + '/api/ops?a=mollie-hook', locale: 'nl_BE', metadata: { rid: r.id } }) });
        await mutate('guests', d => { const x = d.reservations.find(y => y.id === r.id); if (x) { x.payments = x.payments || []; x.payments.push({ id: p.id, mollieId: p.id, amount, status: 'open', method: 'online', t: Date.now(), what: b.what === 'deposit' ? 'voorschot' : 'saldo' }); } });
        return send(res, 200, { ok: true, url: p._links.checkout.href });
      }
      if (a === 'g-checkin') {
        const tx = (v, n) => clean(v, n || 80);
        const m = b.main || {};
        const main = { first: tx(m.first), last: tx(m.last), birth: isDate(m.birth) ? m.birth : '', birthplace: tx(m.birthplace), nationality: tx(m.nationality, 40), street: tx(m.street, 120), zip: tx(m.zip, 12), city: tx(m.city), country: tx(m.country, 40), idType: ['identiteitskaart', 'paspoort', 'rijbewijs', 'verblijfsvergunning'].includes(m.idType) ? m.idType : 'identiteitskaart', idNo: tx(m.idNo, 30) };
        if (!main.first || !main.last || !main.birth || !main.nationality || !main.city || !main.country || !main.idNo) return send(res, 400, { error: 'Vul alle verplichte velden in' });
        if (!b.consent) return send(res, 400, { error: 'Bevestig dat de gegevens kloppen' });
        const others = (b.others || []).slice(0, 5).map(o => ({ first: tx(o.first), last: tx(o.last), birth: isDate(o.birth) ? o.birth : '', nationality: tx(o.nationality, 40) })).filter(o => o.first && o.last);
        let out = null, gg = null;
        await mutate('guests', d => { const r = d.reservations.find(x => x.id === b.id && x.guestId === gid && x.kind === 'room'); if (!r || r.status === 'geannuleerd') return; if (daysUntil(r.from) > 7 || daysUntil(r.to) < 0) { out = 'time'; return; }
          r.checkin = { main, others, arrival: /^\d{2}:\d{2}$/.test(b.arrival || '') ? b.arrival : '', plate: tx(b.plate, 20), wishes: tx(b.wishes, 300), t: Date.now() }; out = r; gg = d.guests.find(x => x.id === gid);
          if (gg && !gg.phone && b.phone) gg.phone = tx(b.phone, 40); });
        if (!out) return send(res, 404, { error: 'Reservatie niet gevonden' });
        if (out === 'time') return send(res, 400, { error: 'Online inchecken kan vanaf 7 dagen voor aankomst' });
        await addLog({ name: out.guestName }, `Online ingecheckt · ${out.roomName} · ${out.from}`);
        if (gg) await sendMail('checkinDone', gg, out);
        return send(res, 200, { ok: true });
      }
      if (a === 'g-checkout') {
        const { data: C } = await load('config');
        let out = null, gg = null;
        await mutate('guests', d => { const r = d.reservations.find(x => x.id === b.id && x.guestId === gid && x.kind === 'room'); if (!r || r.status === 'geannuleerd') return; if (daysUntil(r.to) > 1 || daysUntil(r.from) > 0) { out = 'time'; return; } if (r.checkedOut) { out = 'done'; return; }
          r.checkedOut = Date.now(); if (b.rating) r.feedback = { rating: Math.max(1, Math.min(5, parseInt(b.rating, 10) || 5)), note: clean(b.note, 400) }; out = r; gg = d.guests.find(x => x.id === gid); });
        if (!out) return send(res, 404, { error: 'Reservatie niet gevonden' });
        if (out === 'time') return send(res, 400, { error: 'Uitchecken kan vanaf de dag voor vertrek, tijdens je verblijf' });
        if (out === 'done') return send(res, 400, { error: 'Je bent al uitgecheckt' });
        const T = BZ.totals(C, out);
        await addLog({ name: out.guestName }, `Online uitgecheckt · ${out.roomName}${T.due ? ' · open € ' + T.due : ''}`);
        await tvClear(out.room);
        if (gg) await sendMail('checkedOut', gg, out, T, '/factuur?id=' + out.id + '&k=' + invKey(out.id));
        return send(res, 200, { ok: true, due: T.due });
      }
      if (a === 'g-modify') {
        const [{ data: C }, { data: G0 }] = await Promise.all([load('config'), load('guests')]);
        const r0 = G0.reservations.find(x => x.id === b.id && x.guestId === gid && x.kind === 'room');
        if (!r0 || r0.status === 'geannuleerd') return send(res, 404, { error: 'Reservatie niet gevonden' });
        if (daysUntil(r0.from) < 2) return send(res, 400, { error: 'Wijzigen kan tot 48 uur vooraf. Neem contact met ons op.' });
        if (!isDate(b.from) || !isDate(b.to) || b.to <= b.from || daysUntil(b.from) < 2) return send(res, 400, { error: 'Kies geldige data, minstens 48 uur vanaf nu' });
        const guests = Math.max(1, Math.min(r0.room === 'amethyst' ? 3 : 2, parseInt(b.guests, 10) || r0.guests));
        const old = { from: r0.from, to: r0.to, guests: r0.guests, total: r0.total };
        const clash = await mutate('calendar', d => { const c = d.entries.find(x => x.room === r0.room && x.ref !== r0.id && x.from < b.to && x.to > b.from); if (c) return c; const e = d.entries.find(x => x.ref === r0.id); if (e) { e.from = b.from; e.to = b.to; e.note = String(e.note || '').replace(/\d+ pers\./, guests + ' pers.'); } return null; });
        if (clash) return send(res, 409, { error: 'De kamer is niet vrij op die data. Kies andere data.' });
        let out = null;
        await mutate('guests', d => { const r = d.reservations.find(x => x.id === r0.id); if (!r) return; r.from = b.from; r.to = b.to; r.guests = guests; Object.assign(r, quote(C, r)); r.modified = Date.now(); delete r.checkin; r.mails = {}; out = r; });
        const gg = G0.guests.find(x => x.id === gid);
        await addLog({ name: out.guestName }, `Reservatie ${out.id} gewijzigd: ${old.from} → ${old.to} wordt ${out.from} → ${out.to}`);
        if (gg) await sendMail('modified', gg, out, old);
        return send(res, 200, { ok: true, reservation: out });
      }
      if (a === 'g-cancel') {
        let out = null;
        await mutate('guests', d => { const r = d.reservations.find(x => x.id === b.id && x.guestId === gid); if (!r || r.status === 'geannuleerd') { out = 'nf'; return; } if (daysUntil(r.from || r.date) < 2) { out = 'late'; return; } r.status = 'geannuleerd'; r.cancelled = Date.now(); out = r; });
        if (out === 'nf') return send(res, 404, { error: 'Niet gevonden' });
        if (out === 'late') return send(res, 400, { error: 'Annuleren kan tot 48 uur vooraf. Neem contact met ons op.' });
        if (out.kind === 'room') await mutate('calendar', d => { d.entries = d.entries.filter(x => x.ref !== out.id); });
        if (out.kind === 'room' && out.from <= today()) { try { await tvSync(); } catch (e) {} }
        await addLog({ name: out.guestName }, `Reservatie ${out.id} geannuleerd door gast`);
        { const { data: Gx } = await load('guests'); const gg = Gx.guests.find(x => x.id === gid); if (gg) await sendMail('cancelled', gg, out); }
        return send(res, 200, { ok: true });
      }
      if (a === 'g-member') {
        if (!PLANS[b.plan]) return send(res, 400, { error: 'Onbekend abonnement' });
        let nm = '';
        await mutate('guests', d => { const g = d.guests.find(x => x.id === gid); if (!g) return; nm = g.name; g.memberships = g.memberships || {}; if (!g.memberships[b.plan] || g.memberships[b.plan].status === 'gestopt') g.memberships[b.plan] = { status: 'aangevraagd', since: Date.now() }; });
        await addLog({ name: nm }, `Abonnement aangevraagd: ${PLANS[b.plan].name}`);
        return send(res, 200, { ok: true });
      }
      if (a === 'g-request') {
        const text = clean(b.text, 300), type = clean(b.type, 60);
        if (!type) return send(res, 400, { error: 'Kies wat je nodig hebt' });
        let rq;
        await mutate('guests', d => { const g = d.guests.find(x => x.id === gid); const act = d.reservations.find(r => r.guestId === gid && r.kind === 'room' && r.status !== 'geannuleerd' && r.from <= today() && r.to >= today()); rq = { id: id(), guestId: gid, guestName: g ? g.name : '', room: act ? act.roomName : null, type, text, status: 'open', created: Date.now() }; d.requests.unshift(rq); d.requests = d.requests.slice(0, 500); });
        await addLog({ name: rq.guestName }, `Verzoek: ${type}${rq.room ? ' · ' + rq.room : ''}`);
        return send(res, 200, { ok: true });
      }
      if (a === 'g-profile') {
        await mutate('guests', d => { const g = d.guests.find(x => x.id === gid); if (!g) return; if (clean(b.name, 80)) g.name = clean(b.name, 80); g.phone = clean(b.phone, 40); if (b.password && String(b.password).length >= 6) { g.salt = crypto.randomBytes(12).toString('hex'); g.pw = hashPw(b.password, g.salt); } });
        return send(res, 200, { ok: true });
      }
      return send(res, 403, { error: 'Geen toegang' });
    }
    { const { data: Cx } = await load('config');
      const alive = u.id === 'owner' ? true : u.id === 'admin' ? !!Cx.adminPinHash : u.id === 'demo-owner' ? Cx.demoLogin !== false : (Cx.staff || []).some(x => x.id === u.id && x.active !== false && x.role === u.role);
      if (!alive) return send(res, 401, { error: 'Log opnieuw in' });
      if (u.role === 'beheer') { u.role = 'owner'; u.admin = true; }
      tech = !!u.admin || (u.role === 'owner' && !Cx.adminPinHash); }
    if (a === 'me') return send(res, 200, { user: u, perms: ROLES[u.role] });

    if (a === 'bootstrap') {
      const [C, K, A, M, O] = await Promise.all(['config', 'calendar', 'agenda', 'menus', 'orders'].map(n => load(n).then(r => r.data)));
      const out = { user: u, perms: ROLES[u.role], orders: can(u, 'orders') ? O.orders.slice(0, 200) : [], menus: M };
      if (can(u, 'calendar')) out.calendar = K.entries;
      if (can(u, 'agenda')) out.events = A.events;
      if (can(u, 'connect')) out.ical = C.ical, out.icalKey = C.icalKey;
      if (can(u, 'connect')) out.googleClientId = C.googleClientId || '', out.googleEnv = !!process.env.GOOGLE_CLIENT_ID;
      if (u.role === 'owner') out.demoLogin = C.demoLogin !== false;
      out.tech = tech; out.hasAdmin = !!C.adminPinHash;
      if (tech && ((C.mail && C.mail.key && !String(C.mail.key).startsWith('enc:')) || (C.biz && C.biz.mollieKey && !String(C.biz.mollieKey).startsWith('enc:')))) await mutate('config', X => { if (X.mail && X.mail.key && !String(X.mail.key).startsWith('enc:')) X.mail.key = enc(X.mail.key); if (X.biz && X.biz.mollieKey && !String(X.biz.mollieKey).startsWith('enc:')) X.biz.mollieKey = enc(X.biz.mollieKey); });
      if (can(u, 'prices')) out.prices = C.prices;
      if (can(u, 'staff')) out.staff = C.staff.map(s => ({ id: s.id, name: s.name, role: s.role, active: s.active !== false }));
      if (can(u, 'log')) out.log = (await load('log')).data.log.slice(0, 120);
      if (can(u, 'guests')) { const { data: G } = await load('guests'); out.guests = G.guests.map(g => ({ id: g.id, name: g.name, email: g.email, phone: g.phone, memberships: g.memberships || {}, n: G.reservations.filter(r => r.guestId === g.id && r.status !== 'geannuleerd').length })); out.reservations = G.reservations.slice(-200).map(r => r.checkin ? { ...r, checkin: { arrival: r.checkin.arrival, plate: r.checkin.plate, wishes: r.checkin.wishes, t: r.checkin.t } } : r); out.requests = G.requests.slice(0, 100); out.plans = PLANS; }
      out.store = hasStore();
      return send(res, 200, out);
    }
    if (a === 'orders') {
      if (!can(u, 'orders')) return send(res, 403, { error: 'Geen toegang' });
      const { data } = await load('orders');
      return send(res, 200, { orders: data.orders.slice(0, 200) });
    }
    if (a === 'register' || a === 'register-csv') {
      if (!can(u, 'guests')) return send(res, 403, { error: 'Geen toegang' });
      const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '') ? url.searchParams.get('month') : today().slice(0, 7);
      const { data: G } = await load('guests');
      const rows = G.reservations.filter(r => r.kind === 'room' && r.status !== 'geannuleerd' && r.from && r.from.slice(0, 7) === month).sort((x, y) => (x.from < y.from ? -1 : 1))
        .map(r => ({ id: r.id, room: r.roomName, from: r.from, to: r.to, guests: r.guests, guestName: r.guestName, checkin: r.checkin || null, checkedIn: r.checkedIn || null, checkedOut: r.checkedOut || null }));
      if (a === 'register') return send(res, 200, { month, rows });
      const L = [['Aankomst', 'Vertrek', 'Kamer', 'Reservatie', 'Rol', 'Voornaam', 'Naam', 'Geboortedatum', 'Geboorteplaats', 'Nationaliteit', 'Adres', 'Postcode', 'Gemeente', 'Land', 'Identiteitsdocument', 'Documentnummer', 'Online ingecheckt']];
      rows.forEach(r => { const c = r.checkin; if (!c) { L.push([r.from, r.to, r.room, r.id, 'hoofdgast', r.guestName, '', '', '', '', '', '', '', '', '', '', 'nee']); return; } const M = c.main;
        L.push([r.from, r.to, r.room, r.id, 'hoofdgast', M.first, M.last, M.birth, M.birthplace, M.nationality, M.street, M.zip, M.city, M.country, M.idType, M.idNo, new Date(c.t).toISOString().slice(0, 16).replace('T', ' ')]);
        c.others.forEach(o => L.push([r.from, r.to, r.room, r.id, 'medereiziger', o.first, o.last, o.birth, '', o.nationality, '', '', '', '', '', '', ''])); });
      res.statusCode = 200; res.setHeader('content-type', 'text/csv; charset=utf-8'); res.setHeader('content-disposition', `attachment; filename="gastenregister-${month}.csv"`);
      return res.end('\ufeff' + L.map(r => r.map(v => { let x = String(v == null ? '' : v); if (/^[=+\-@\t]/.test(x)) x = "'" + x; return /[;"\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(';')).join('\r\n'));
    }
    if (a === 'mail-preview') {
      if (u.role !== 'owner') return send(res, 403, { error: 'Geen toegang' });
      const { data: C } = await load('config'); mail.use(mcfg(C));
      if (!url.searchParams.get('t')) return send(res, 200, { templates: mail.TEMPLATES });
      return send(res, 200, { mails: mail.preview(url.searchParams.get('t')) });
    }
    if (a === 'tv-get') {
      if (!can(u, 'guests')) return send(res, 403, { error: 'Geen toegang' });
      try { await tvSync(); } catch (e) {}
      const { data: T } = await load('tv');
      return send(res, 200, { def: T.def, images: TV_IMGS, rooms: ROOMS.map(room => { const R = (T.rooms || {})[room] || {}; return { room, name: ROOM_NAMES[room], no: ROOMS.indexOf(room) + 1, paired: !!R.h, pairedAt: R.pairedAt || null, seen: R.seen || null, online: !!(R.h && R.seen > Date.now() - 11 * 60e3), auto: R.auto ? R.auto.name : '', manual: R.manual ? R.manual.name : '', override: R.override || null, screen: tvScreen(T, room) }; }) });
    }
    if (a === 'hk') {
      if (!can(u, 'today')) return send(res, 403, { error: 'Geen toegang' });
      const date = isDate(url.searchParams.get('date')) ? url.searchParams.get('date') : today();
      const [{ data: K }, { data: G }, { data: HK }] = await Promise.all([load('calendar'), load('guests'), load('housekeeping')]);
      return send(res, 200, { date, rooms: BZ.housekeeping(K, G, HK, date) });
    }
    if (a === 'report' || a === 'export') {
      if (u.role !== 'owner') return send(res, 403, { error: 'Alleen de eigenaar' });
      const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '') ? url.searchParams.get('month') : today().slice(0, 7);
      const [{ data: C }, { data: K }, { data: G }, { data: O }] = await Promise.all(['config', 'calendar', 'guests', 'orders'].map(n => load(n)));
      if (a === 'export') { res.statusCode = 200; res.setHeader('content-type', 'text/csv; charset=utf-8'); res.setHeader('content-disposition', `attachment; filename="villa-amano-${month}.csv"`); return res.end(BZ.exportMonth(C, G, month)); }
      return send(res, 200, BZ.report(C, K, G, O, month));
    }
    if (a === 'res-list') {
      if (!can(u, 'guests')) return send(res, 403, { error: 'Geen toegang' });
      const [{ data: C }, { data: G }] = await Promise.all([load('config'), load('guests')]);
      const list = G.reservations.filter(r => r.status !== 'geannuleerd').sort((x, y) => ((x.from || x.date) < (y.from || y.date) ? 1 : -1)).slice(0, 150)
        .map(r => { const T = BZ.totals(C, r); return { id: r.id, kind: r.kind, guestName: r.guestName, roomName: r.roomName, title: r.title, from: r.from, to: r.to, date: r.date, total: T.total, paid: T.paid, due: T.due, invoiceNo: r.invoiceNo || null, invoiceMailed: r.invoiceMailed || null, bill: r.bill || null, adjust: r.adjust || [], vats: [BZ.biz(C).vatLogies, BZ.biz(C).vatFood, BZ.biz(C).vatOther], inv: '/factuur?id=' + r.id + '&k=' + invKey(r.id), payments: (r.payments || []).filter(p => p.status === 'paid') }; });
      return send(res, 200, { list });
    }
    if (a === 'biz-get') {
      if (u.role !== 'owner') return send(res, 403, { error: 'Geen toegang' });
      const { data: C } = await load('config'); const B = BZ.biz(C); const k = mollieKey(C);
      return send(res, 200, { ...B, mollieKey: undefined, mollieMode: k ? (k.startsWith('live_') ? 'live' : 'test') : null, mollieEnv: !!process.env.MOLLIE_API_KEY });
    }
    if (a === 'mail-status') {
      if (u.role !== 'owner') return send(res, 403, { error: 'Geen toegang' });
      const { data: C } = await load('config'); mail.use(mcfg(C));
      return send(res, 200, mail.status());
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'POST verwacht' });
    const b = await body(req);

    if (a === 'tv-pair' || a === 'tv-unpair' || a === 'tv-room' || a === 'tv-default') {
      if (!can(u, 'guests')) return send(res, 403, { error: 'Geen toegang' });
      if (a !== 'tv-default' && !ROOMS.includes(b.room)) return send(res, 400, { error: 'Onbekende kamer' });
      let err = null, msg = '';
      await mutate('tv', T => { T.rooms = T.rooms || {}; T.def = T.def || {}; const R = b.room ? (T.rooms[b.room] = T.rooms[b.room] || {}) : null;
        if (a === 'tv-pair') { const code = String(b.code || '').replace(/\D/g, ''); const p = (T.pending || {})[code]; if (!p || p.t < Date.now() - 15 * 60e3) { err = 'Deze code klopt niet of is verlopen. Kijk op de tv voor de juiste code.'; return; } R.h = p.h; R.pairedAt = Date.now(); R.seen = Date.now(); delete T.pending[code]; msg = `Tv gekoppeld aan ${ROOM_NAMES[b.room]}`; }
        if (a === 'tv-unpair') { delete R.h; delete R.seen; delete R.pairedAt; msg = `Tv ontkoppeld van ${ROOM_NAMES[b.room]}`; }
        if (a === 'tv-room') { if (b.manual !== undefined) { const n = clean(b.manual, 60); if (n) R.manual = { name: n, by: u.name }; else delete R.manual; }
          if (b.override !== undefined) { const o = b.override || {}; const x = { title: clean(o.title, 80), sub: clean(o.sub, 120), bg: tvBg(o.bg) }; if (x.title || x.sub || x.bg) R.override = x; else delete R.override; }
          if (b.reset) { delete R.manual; delete R.override; } msg = `Tv-scherm ${ROOM_NAMES[b.room]} aangepast`; }
        if (a === 'tv-default') { const D = T.def; if (b.greeting !== undefined) D.greeting = clean(b.greeting, 80) || 'Welkom in Villa Amano'; if (b.greetingGuest !== undefined) { const g = clean(b.greetingGuest, 80); D.greetingGuest = g.includes('{naam}') ? g : 'Welkom, {naam}'; } if (b.sub !== undefined) D.sub = clean(b.sub, 120); if (b.bg !== undefined) D.bg = tvBg(b.bg) || 'villa-avond'; if (Array.isArray(b.lines)) D.lines = b.lines.map(x => clean(x, 70)).filter(Boolean).slice(0, 4); msg = 'Standaard tv-scherm aangepast'; }
        T.v = (T.v || 0) + 1; });
      if (err) { await failed([['tvp:' + u.id, 10]]); return send(res, 400, { error: err }); }
      if (a === 'tv-pair') { try { await tvSync(); } catch (e) {} }
      await addLog(u, msg);
      return send(res, 200, { ok: true });
    }
    if (a === 'hk-set') {
      if (!can(u, 'today')) return send(res, 403, { error: 'Geen toegang' });
      if (!isDate(b.date) || !ROOMS.includes(b.room)) return send(res, 400, { error: 'Ongeldig' });
      const state = b.state || (b.done ? 'klaar' : 'reset'); const note = clean(b.note, 200);
      if (!['klaar', 'nodig', 'reset', 'note'].includes(state)) return send(res, 400, { error: 'Ongeldig' });
      await mutate('housekeeping', d => { d.days = d.days || {}; d.days[b.date] = d.days[b.date] || {}; const D = d.days[b.date], cur = D[b.room] || {};
        if (state === 'reset') delete D[b.room];
        else if (state === 'note') D[b.room] = { ...cur, note, noteBy: u.name };
        else D[b.room] = { ...cur, state, by: u.name, t: Date.now() };
        Object.keys(d.days).filter(k => k < BZ.addDays(today(), -30)).forEach(k => delete d.days[k]); });
      if (state === 'klaar') await addLog(u, `Kamer klaar: ${ROOM_NAMES[b.room]}`);
      if (state === 'nodig') await addLog(u, `Kamer moet gepoetst worden: ${ROOM_NAMES[b.room]}`);
      if (state === 'note' && note) await addLog(u, `Melding ${ROOM_NAMES[b.room]}: ${note}`);
      return send(res, 200, { ok: true });
    }
    if (a === 'invoice-adjust') {
      if (!can(u, 'guests')) return send(res, 403, { error: 'Geen toegang' });
      const { data: C } = await load('config'); const B = BZ.biz(C); let out = null, what = '';
      await mutate('guests', d => { const r = d.reservations.find(x => x.id === b.id); if (!r || r.status === 'geannuleerd') return; if (r.invoiceMailed || r.peppolSent) { out = 'sent'; return; }
        if (b.add) { const amount = BZ.r2(b.add.amount), label = clean(b.add.label, 120); if (!label || !amount) { out = 'bad'; return; } const vat = [B.vatLogies, B.vatFood, B.vatOther].includes(+b.add.vat) ? +b.add.vat : B.vatOther; r.adjust = r.adjust || []; r.adjust.push({ id: 'A' + Date.now().toString(36), label, amount, vat, by: u.name, t: Date.now() }); what = `regel toegevoegd: ${label} € ${amount}`; }
        if (b.remove) { const x = (r.adjust || []).find(y => y.id === b.remove); if (x) { r.adjust = r.adjust.filter(y => y !== x); what = `regel verwijderd: ${x.label}`; } }
        if (b.bill) { r.bill = { company: clean(b.bill.company, 120), vat: clean(b.bill.vat, 30), address: clean(b.bill.address, 200) }; what = what || 'klantgegevens aangepast'; }
        out = r; });
      if (!out) return send(res, 404, { error: 'Reservatie niet gevonden' });
      if (out === 'sent') return send(res, 400, { error: 'Deze factuur is al verstuurd en kan niet meer aangepast worden. Een correctie gebeurt met een creditnota.' });
      if (out === 'bad') return send(res, 400, { error: 'Geef een omschrijving en een bedrag' });
      await addLog(u, `${out.invoiceNo ? 'Factuur ' + out.invoiceNo : 'Leverbon ' + out.id} · ${what}`);
      return send(res, 200, { ok: true });
    }
    if (a === 'invoice-make' || a === 'invoice-mail' || a === 'peppol-send') {
      if (!can(u, 'guests')) return send(res, 403, { error: 'Geen toegang' });
      const { data: G0 } = await load('guests'); const r0 = G0.reservations.find(x => x.id === b.id);
      if (!r0 || r0.status === 'geannuleerd') return send(res, 404, { error: 'Reservatie niet gevonden' });
      if (a === 'invoice-make') {
        if (b.company !== undefined || b.vat !== undefined || b.address !== undefined) await mutate('guests', d => { const r = d.reservations.find(x => x.id === b.id); if (r) r.bill = { company: clean(b.company, 120), vat: clean(b.vat, 30), address: clean(b.address, 200) }; });
        const no = await ensureInvoiceNo(b.id);
        await addLog(u, `Leverbon omgezet naar factuur ${no} · ${r0.guestName}`);
        return send(res, 200, { ok: true, invoiceNo: no });
      }
      if (!r0.invoiceNo) return send(res, 400, { error: 'Maak eerst een factuur van de leverbon' });
      const { data: C } = await load('config');
      if (a === 'invoice-mail') {
        const g = G0.guests.find(x => x.id === r0.guestId); if (!g || !g.email) return send(res, 400, { error: 'Geen e-mailadres bekend voor deze gast' });
        mail.use(mcfg(C)); const x = await mail.invoice(g, r0, BZ.totals(C, r0), '/factuur?id=' + r0.id + '&k=' + invKey(r0.id));
        if (!x || x.skipped || x.error || !x.id) return send(res, 502, { error: 'Versturen mislukt. Controleer de e-mailinstellingen.' });
        await mutate('guests', d => { const r = d.reservations.find(y => y.id === b.id); if (r) r.invoiceMailed = Date.now(); });
        await addLog(u, `Factuur ${r0.invoiceNo} gemaild naar ${g.email}`);
        return send(res, 200, { ok: true });
      }
      if (!(r0.bill && r0.bill.vat)) return send(res, 400, { error: 'Peppol kan alleen naar een bedrijf. Vul eerst het btw-nummer van de klant in.' });
      return send(res, 400, { error: 'Peppol is nog niet gekoppeld. Er is eerst een Peppol-aanbieder nodig.' });
    }
    if (a === 'pay-add') {
      if (!can(u, 'guests')) return send(res, 403, { error: 'Geen toegang' });
      const amount = BZ.r2(b.amount), method = ['cash', 'kaart', 'overschrijving'].includes(b.method) ? b.method : 'kaart';
      if (!(amount > 0)) return send(res, 400, { error: 'Geef een bedrag' });
      let nm = null;
      await mutate('guests', d => { const r = d.reservations.find(x => x.id === b.id); if (!r) return; nm = r.guestName; r.payments = r.payments || []; r.payments.push({ id: 'P' + Date.now().toString(36), amount, method, status: 'paid', t: Date.now(), by: u.name }); });
      if (nm === null) return send(res, 404, { error: 'Reservatie niet gevonden' });
      await addLog(u, `Betaling € ${amount} (${method}) · ${b.id} · ${nm}`);
      return send(res, 200, { ok: true });
    }
    if (a === 'biz-set') {
      if (u.role !== 'owner') return send(res, 403, { error: 'Geen toegang' });
      await mutate('config', C => {
        C.biz = C.biz || {};
        ['company', 'legal', 'vat', 'address', 'iban', 'email'].forEach(k => { if (typeof b[k] === 'string') C.biz[k] = clean(b[k], 160); });
        ['vatLogies', 'vatFood', 'vatOther', 'touristTax', 'deposit'].forEach(k => { if (b[k] !== undefined && b[k] !== '' && !isNaN(+b[k]) && +b[k] >= 0 && +b[k] <= 100) C.biz[k] = BZ.r2(+b[k]); });
        if (typeof b.mollieKey === 'string' && /^(test|live)_\w{20,}$/.test(b.mollieKey.trim())) { if (!tech) return; C.biz.mollieKey = enc(b.mollieKey.trim()); }
        if (b.mollieKey === null && tech) delete C.biz.mollieKey;
      });
      await addLog(u, 'Facturatie- en betaalinstellingen aangepast');
      return send(res, 200, { ok: true });
    }
    if (a === 'mail-set') {
      if (u.role !== 'owner') return send(res, 403, { error: 'Geen toegang' });
      await mutate('config', C => {
        C.mail = C.mail || {};
        if (typeof b.key === 'string' && /^re_[\w-]{10,}$/.test(b.key.trim())) { if (!tech) return; C.mail.key = enc(b.key.trim()); }
        if (b.key === null && tech) delete C.mail.key;
        if (typeof b.from === 'string' && b.from.includes('@')) C.mail.from = String(b.from).replace(/[\r\n"]/g, '').slice(0, 120).trim();
        if (typeof b.replyTo === 'string' && b.replyTo.includes('@')) C.mail.replyTo = clean(b.replyTo, 120);
        if (typeof b.notify === 'string') C.mail.notify = clean(b.notify, 300);
        if (typeof b.reviewUrl === 'string' && (/^https:\/\//.test(b.reviewUrl) || !b.reviewUrl)) C.mail.reviewUrl = clean(b.reviewUrl, 300);
      });
      const { data: C } = await load('config'); mail.use(mcfg(C));
      await addLog(u, 'E-mailinstellingen aangepast');
      return send(res, 200, mail.status());
    }
    if (a === 'mail-test') {
      if (u.role !== 'owner') return send(res, 403, { error: 'Geen toegang' });
      const to = clean(b.to, 120);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return send(res, 400, { error: 'Geef een geldig e-mailadres' });
      const { data: C } = await load('config'); mail.use(mcfg(C));
      const r = await mail.test(to);
      return send(res, r && r.id ? 200 : 502, r && r.id ? { ok: true, id: r.id } : { error: (r && r.message) || 'Versturen mislukt' });
    }

    if (a === 'order-status') {
      if (!can(u, 'orders')) return send(res, 403, { error: 'Geen toegang' });
      const st = ['nieuw', 'bereiding', 'geleverd', 'geannuleerd'].includes(b.status) ? b.status : null;
      if (!st) return send(res, 400, { error: 'Ongeldige status' });
      let oc = null;
      await mutate('orders', d => { const o = d.orders.find(x => x.id === b.id); if (o) { o.status = st; o.by = u.name; o.updated = Date.now(); oc = o; } });
      if (oc && oc.reservationId) await mutate('guests', d => { const r = d.reservations.find(x => x.id === oc.reservationId); if (!r) return; r.charges = (r.charges || []).filter(c => c.id !== oc.id); if (st !== 'geannuleerd' && oc.total > 0) r.charges.push({ id: oc.id, label: 'Ontbijt ' + oc.date, amount: oc.total, t: oc.created }); });
      await addLog(u, `Bestelling ${b.id} → ${st}`);
      return send(res, 200, { ok: true });
    }
    if (a === 'cal-add') {
      if (!can(u, 'calendar')) return send(res, 403, { error: 'Geen toegang' });
      if (!ROOMS.includes(b.room) || !isDate(b.from) || !isDate(b.to) || b.to <= b.from) return send(res, 400, { error: 'Kies een geldige periode' });
      const e = { id: id(), room: b.room, from: b.from, to: b.to, type: b.type === 'booking' ? 'booking' : 'block', guest: clean(b.guest, 80), note: clean(b.note, 200), by: u.name, created: Date.now() };
      const clash = await mutate('calendar', d => { const c = d.entries.find(x => x.room === e.room && x.from < e.to && x.to > e.from); if (c && !b.force) return c; d.entries.push(e); return null; });
      if (clash) return send(res, 409, { error: 'Overlapt met een bestaande boeking of blokkade', clash });
      await addLog(u, `${e.type === 'booking' ? 'Boeking' : 'Blokkade'} ${ROOM_NAMES[e.room]} ${e.from} → ${e.to}${e.guest ? ' · ' + e.guest : ''}`);
      return send(res, 200, { ok: true, entry: e });
    }
    if (a === 'cal-del') {
      if (!can(u, 'calendar')) return send(res, 403, { error: 'Geen toegang' });
      let gone = null;
      await mutate('calendar', d => { gone = d.entries.find(x => x.id === b.id); d.entries = d.entries.filter(x => x.id !== b.id); });
      if (gone) await addLog(u, `Verwijderd: ${ROOM_NAMES[gone.room]} ${gone.from} → ${gone.to}`);
      return send(res, 200, { ok: true });
    }
    if (a === 'ical-set') {
      if (!can(u, 'connect')) return send(res, 403, { error: 'Geen toegang' });
      if (!ROOMS.includes(b.room) || !['booking', 'airbnb'].includes(b.channel)) return send(res, 400, { error: 'Ongeldig' });
      const link = clean(b.url, 600);
      if (link && !/^https:\/\//i.test(link)) return send(res, 400, { error: 'Plak een geldige https-link' });
      if (link) { try { const r = await fetch(link, { headers: { 'user-agent': 'VillaAmano-Ops/1.0' } }); const t = await r.text(); if (!r.ok || !t.includes('BEGIN:VCALENDAR')) return send(res, 400, { error: 'Deze link geeft geen kalender terug. Controleer of je de iCal-export-link kopieerde.' }); } catch (e) { return send(res, 400, { error: 'Link niet bereikbaar' }); } }
      await mutate('config', C => { C.ical = C.ical || {}; C.ical[b.room] = C.ical[b.room] || {}; C.ical[b.room][b.channel] = link; });
      await addLog(u, `${b.channel === 'booking' ? 'Booking.com' : 'Airbnb'} ${link ? 'gekoppeld' : 'ontkoppeld'} · ${ROOM_NAMES[b.room]}`);
      return send(res, 200, { ok: true });
    }
    if (a === 'event-save') {
      if (!can(u, 'agenda')) return send(res, 403, { error: 'Geen toegang' });
      if (!isDate(b.date) || !clean(b.title)) return send(res, 400, { error: 'Datum en titel zijn verplicht' });
      const ev = { id: b.id || id(), date: b.date, cat: ['event', 'pottery', 'wellness', 'ontbijt'].includes(b.cat) ? b.cat : 'event', time: clean(b.time, 40), title: clean(b.title, 100), text: clean(b.text, 400), price: clean(b.price, 40) };
      await mutate('agenda', d => { const i = d.events.findIndex(x => x.id === ev.id); if (i > -1) d.events[i] = ev; else d.events.push(ev); d.events.sort((x, y) => (x.date < y.date ? -1 : 1)); });
      await addLog(u, `Agenda: ${ev.title} (${ev.date})`);
      return send(res, 200, { ok: true, event: ev });
    }
    if (a === 'event-del') {
      if (!can(u, 'agenda')) return send(res, 403, { error: 'Geen toegang' });
      await mutate('agenda', d => { d.events = d.events.filter(x => x.id !== b.id); });
      await addLog(u, 'Agenda-item verwijderd');
      return send(res, 200, { ok: true });
    }
    if (a === 'menus-save') {
      if (!can(u, 'menus')) return send(res, 403, { error: 'Geen toegang' });
      await mutate('menus', d => {
        (b.menus || []).forEach(m => { const t = d.menus.find(x => x.id === m.id); if (!t) return; t.active = !!m.active; if (u.role === 'owner' || u.role === 'keuken') { t.name = clean(m.name, 60) || t.name; t.tag = clean(m.tag, 40); t.items = (m.items || []).map(x => clean(x, 80)).filter(Boolean).slice(0, 8); } if (u.role === 'owner' && +m.price > 0) t.price = Math.round(+m.price * 100) / 100; });
        (b.extras || []).forEach(m => { const t = d.extras.find(x => x.id === m.id); if (!t) return; t.active = !!m.active; if (u.role === 'owner' && +m.price > 0) t.price = Math.round(+m.price * 100) / 100; });
      });
      await addLog(u, "Menu's bijgewerkt");
      return send(res, 200, { ok: true });
    }
    if (a === 'scan') {
      if (!can(u, 'scan')) return send(res, 403, { error: 'Geen toegang' });
      let q = qrParse(b.code);
      const raw = String(b.code || '').trim().toUpperCase();
      if (!q && /^R[A-Z0-9]{5,14}$/.test(raw)) q = { t: 'R', x: raw };
      if (!q && /^VA-[A-F0-9]{6}$/.test(raw)) { const { data: G } = await load('guests'); const g = G.guests.find(x => x.id.slice(0, 6).toUpperCase() === raw.slice(3)); if (g) q = { t: 'M', x: g.id }; }
      if (!q) { await addLog(u, 'Ongeldige QR gescand'); return send(res, 200, { ok: false, kind: 'onbekend', why: 'Geen geldige Villa Amano-code' }); }
      let out;
      if (q.t === 'M') {
        await mutate('guests', d => { const g = d.guests.find(x => x.id === q.x); if (!g) { out = { ok: false, kind: 'lid', why: 'Account bestaat niet meer' }; return; }
          const act = Object.entries(g.memberships || {}).filter(([, m]) => m.status === 'actief').map(([k]) => (PLANS[k] || {}).name || k);
          const prev = (g.scans || []).slice(0, 10); g.scans = [{ t: Date.now(), by: u.name, ok: act.length > 0 }, ...(g.scans || [])].slice(0, 50);
          const now = d.reservations.filter(r => r.guestId === g.id && r.status !== 'geannuleerd' && validity(r).ok).map(r => r.kind === 'room' ? r.roomName : r.title || (r.kind === 'lessen' ? 'Lessenreeks' : 'Vrij atelier'));
          out = { ok: act.length > 0, kind: 'lid', why: act.length ? 'Actief lid' : 'Geen actief abonnement', guest: g.name, email: g.email, phone: g.phone, memberNo: 'VA-' + g.id.slice(0, 6).toUpperCase(), plans: act, today: now, prev }; });
      } else {
        await mutate('guests', d => { const r = d.reservations.find(x => x.id === q.x); if (!r) { out = { ok: false, kind: 'reservatie', why: 'Reservatie niet gevonden' }; return; }
          const v = validity(r), prev = (r.scans || []).slice(0, 10);
          r.scans = [{ t: Date.now(), by: u.name, ok: v.ok }, ...(r.scans || [])].slice(0, 50);
          if (v.ok && r.kind === 'room' && !r.checkedIn) r.checkedIn = Date.now();
          out = { ok: v.ok, why: v.why, used: !!v.used, early: !!v.early, kind: r.kind, id: r.id, guest: r.guestName, guests: r.guests, roomName: r.roomName, roomNo: r.roomNo, title: r.title, from: r.from, to: r.to, date: r.date, time: r.time, status: r.status, total: r.total, extras: r.extras, prev }; });
      }
      await addLog(u, `QR ${out.ok ? '✓' : '✕'} ${out.guest || ''} · ${out.why}`);
      return send(res, 200, out);
    }
    if (a === 'demo-seed' || a === 'demo-clear') {
      if (!tech) return send(res, 403, { error: 'Alleen de beheerder (Solyn)' });
      const email = process.env.DEMO_SEED_EMAIL || 'voorbeeld@villa-amano.com';
      if (a === 'demo-clear') {
        await mutate('guests', d => { d.reservations = d.reservations.filter(r => !r.demo); });
        await mutate('calendar', d => { d.entries = d.entries.filter(e => !e.demo); });
        await addLog(u, 'Voorbeeldreservaties verwijderd'); return send(res, 200, { ok: true });
      }
      const { g, pw, rs, t } = await seedDemo(email, 'Voorbeeld Gast');
      await addLog(u, rs.length + ' voorbeeldreservaties aangemaakt voor Voorbeeld Gast');
      return send(res, 200, { ok: true, email, password: pw, items: rs.map(r => ({ id: r.id, kind: r.kind, phase: (r.to || r.date) < t ? 'Afgelopen' : (r.from || r.date) <= t ? 'Nu bezig' : 'Gepland', label: r.kind === 'room' ? r.roomName + ' · kamer ' + String(r.roomNo).padStart(2, '0') : r.kind === 'event' ? r.title : 'Vrij atelier Pottery', when: r.kind === 'room' ? r.from + ' → ' + r.to : r.date + (r.time ? ' · ' + r.time : ''), qr: qrCode('R', r.id), valid: validity(r) })) });
    }
    if (a === 'golive-reset') {
      if (!tech || b.confirm !== 'WIS TESTDATA') return send(res, 403, { error: 'Alleen de eigenaar, met bevestiging' });
      const n = {};
      await mutate('guests', d => { n.guests = d.guests.length; n.reservations = d.reservations.length; n.requests = d.requests.length; d.guests = []; d.reservations = []; d.requests = []; d.invoiceSeq = {}; });
      await mutate('orders', d => { n.orders = d.orders.length; d.orders = []; });
      await mutate('calendar', d => { const k = d.entries.filter(e => !e.ref && !e.demo && !e.guestId); n.calendarRemoved = d.entries.length - k.length; n.calendarKept = k.length; d.entries = k; });
      await mutate('housekeeping', d => { d.days = {}; });
      await mutate('config', C => { n.invoiceSeq = C.invoiceSeq || {}; C.invoiceSeq = {}; C.demoLogin = false; });
      await addLog(u, 'Testdata gewist, factuurteller op nul, demo-logins uit');
      return send(res, 200, { ok: true, removed: n });
    }
    if (a === 'admin-pin') {
      if (!tech) return send(res, 403, { error: 'Alleen de beheerder (Solyn)' });
      const pin = String(b.pin || ''); if (!/^\d{6,8}$/.test(pin)) return send(res, 400, { error: 'Kies een pincode van 6 tot 8 cijfers' });
      const r = await mutate('config', C => { const h = hashPin(pin); if (C.ownerPinHash === h || (C.staff || []).some(x => x.pinHash === h)) return 'dup'; C.adminPinHash = h; return 'ok'; });
      if (r === 'dup') return send(res, 400, { error: 'Deze pincode is al in gebruik' });
      await addLog(u, 'Beheerders-pincode ingesteld');
      return send(res, 200, { ok: true });
    }
    if (a === 'demo-login-set') {
      if (!tech) return send(res, 403, { error: 'Alleen de beheerder (Solyn)' });
      await mutate('config', C => { C.demoLogin = !!b.on; });
      await addLog(u, b.on ? 'Demo-logins aan' : 'Demo-logins uit');
      return send(res, 200, { ok: true });
    }
    if (a === 'google-set') {
      if (!tech) return send(res, 403, { error: 'Alleen de beheerder (Solyn)' });
      const v = clean(b.clientId, 200);
      if (v && !/^[\w-]+\.apps\.googleusercontent\.com$/.test(v)) return send(res, 400, { error: 'Dit lijkt geen Google Client ID (…apps.googleusercontent.com)' });
      await mutate('config', C => { C.googleClientId = v; });
      await addLog(u, v ? 'Google-login gekoppeld' : 'Google-login ontkoppeld');
      return send(res, 200, { ok: true });
    }
    if (a === 'prices-save') {
      if (!can(u, 'prices')) return send(res, 403, { error: 'Geen toegang' });
      await mutate('config', C => { ROOMS.forEach(r => { const v = +((b.prices || {})[r]); if (v > 0) C.prices[r] = Math.round(v); }); });
      await addLog(u, 'Kamerprijzen bijgewerkt');
      return send(res, 200, { ok: true });
    }
    if (a === 'staff-save') {
      if (!can(u, 'staff')) return send(res, 403, { error: 'Geen toegang' });
      const role = ['receptie', 'keuken', 'owner'].includes(b.role) ? b.role : 'receptie';
      const name = clean(b.name, 40);
      if (!name) return send(res, 400, { error: 'Naam is verplicht' });
      if (b.pin && !/^\d{4,8}$/.test(String(b.pin))) return send(res, 400, { error: 'Pincode: 4 tot 8 cijfers' });
      const r = await mutate('config', C => {
        if (b.pin && (C.staff.some(s => s.pinHash === hashPin(b.pin) && s.id !== b.id) || C.ownerPinHash === hashPin(b.pin) || C.adminPinHash === hashPin(b.pin))) return 'dup';
        let s = C.staff.find(x => x.id === b.id);
        if (!s) { if (!b.pin) return 'nopin'; s = { id: id(), created: Date.now() }; C.staff.push(s); }
        s.name = name; s.role = role; s.active = b.active !== false; if (b.pin) s.pinHash = hashPin(b.pin);
        return 'ok';
      });
      if (r === 'dup') return send(res, 400, { error: 'Deze pincode is al in gebruik' });
      if (r === 'nopin') return send(res, 400, { error: 'Geef een pincode' });
      await addLog(u, `Personeel: ${name} (${role})`);
      return send(res, 200, { ok: true });
    }
    if (a === 'member-set') {
      if (!can(u, 'guests')) return send(res, 403, { error: 'Geen toegang' });
      if (!PLANS[b.plan] || !['actief', 'gestopt', 'aangevraagd'].includes(b.status)) return send(res, 400, { error: 'Ongeldig' });
      let nm = '';
      await mutate('guests', d => { const g = d.guests.find(x => x.id === b.gid); if (!g) return; nm = g.name; g.memberships = g.memberships || {}; g.memberships[b.plan] = { ...(g.memberships[b.plan] || {}), status: b.status, updated: Date.now(), by: u.name }; });
      await addLog(u, `${PLANS[b.plan].name} → ${b.status} · ${nm}`);
      return send(res, 200, { ok: true });
    }
    if (a === 'req-done') {
      if (!can(u, 'guests')) return send(res, 403, { error: 'Geen toegang' });
      await mutate('guests', d => { const r = d.requests.find(x => x.id === b.id); if (r) { r.status = 'klaar'; r.by = u.name; r.done = Date.now(); } });
      await addLog(u, 'Gastverzoek afgehandeld');
      return send(res, 200, { ok: true });
    }
    if (a === 'staff-del') {
      if (!can(u, 'staff')) return send(res, 403, { error: 'Geen toegang' });
      await mutate('config', C => { C.staff = C.staff.filter(s => s.id !== b.id); });
      await addLog(u, 'Personeelslid verwijderd');
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: 'Onbekende actie' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: e.message || 'Serverfout' });
  }
};
module.exports.load = load;
