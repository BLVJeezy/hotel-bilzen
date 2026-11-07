// Villa Amano · Operations Center API
// Opslag: Vercel Blob (privé). Vereist BLOB_READ_WRITE_TOKEN (automatisch na "Connect store" in Vercel).
// Optioneel: OPS_SECRET (sessies), OPS_OWNER_PIN (vaste eigenaars-pincode).
const crypto = require('crypto');
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
    if (r.extras.ontbijt) t += 25 * g * n; if (r.extras.well) t += 35 * g; if (r.extras.bike) t += 45 * g * n; if (r.extras.late) t += 45;
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
  for (let i = 0; i < 4; i++) {
    const { data, etag } = await load(name);
    let cur = etag;
    if (hasStore() && etag) { try { const h = await blob.head(`ops/${name}.json`); cur = h && h.etag; } catch (e) { cur = null; } }
    const out = await fn(data);
    try { await save(name, data, i < 3 ? cur : null); return out; }
    catch (e) { if (e && e.name === 'BlobPreconditionFailedError') { await new Promise(r => setTimeout(r, 120 * (i + 1))); continue; } throw e; }
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
  const single = r.kind === 'pottery' || r.kind === 'event';
  const used = (r.scans || []).some(s => s.ok && new Date(s.t).toISOString().slice(0, 10) === t);
  if (single && (r.scans || []).some(s => s.ok)) return { ok: false, why: 'Al gebruikt', used: true };
  return { ok: true, why: r.kind === 'room' ? 'Geldig verblijf' : r.kind === 'lessen' ? 'Geldige lessenreeks' : 'Geldig voor vandaag', again: used };
}
const can = (u, perm) => u && (ROLES[u.role] || []).includes(perm);
async function addLog(u, text) {
  try { await mutate('log', d => { d.log.unshift({ t: Date.now(), who: u ? u.name : 'Website', text }); d.log = d.log.slice(0, 400); }); } catch (e) {}
}

// ---------- helpers ----------
const id = () => crypto.randomBytes(5).toString('hex');
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
      const room = parseInt(b.room, 10);
      if (!(room >= 1 && room <= 5)) return send(res, 400, { error: 'Ongeldig kamernummer' });
      const { data: M } = await load('menus');
      const items = (b.items || []).map(x => {
        const m = M.menus.find(y => y.id === x.id && y.active);
        const q = Math.max(0, Math.min(6, parseInt(x.qty, 10) || 0));
        return m && q ? { id: m.id, name: m.name, qty: q, price: m.price } : null;
      }).filter(Boolean);
      if (!items.length) return send(res, 400, { error: 'Kies minstens één menu' });
      const extras = (b.extras || []).map(eid => M.extras.find(y => y.id === eid && y.active)).filter(Boolean).map(e => ({ id: e.id, name: e.name, price: e.price }));
      const total = items.reduce((s, x) => s + x.qty * x.price, 0) + extras.reduce((s, x) => s + x.price, 0);
      const order = {
        id: 'VA-' + Date.now().toString().slice(-6), created: Date.now(), status: 'nieuw',
        room, roomName: ROOM_NAMES[ROOMS[room - 1]], date: isDate(b.date) ? b.date : new Date(Date.now() + 3600e3).toISOString().slice(0, 10),
        time: /^\d{2}:\d{2}$/.test(b.time) ? b.time : '08:30', where: b.where === 'terras' ? 'terras' : 'kamer',
        guestId: gu && gu.role === 'guest' ? gu.gid : null, items, extras, diet: (b.diet || []).map(d => clean(d, 40)).slice(0, 6), note: clean(b.note, 300), total,
      };
      await mutate('orders', d => { d.orders.unshift(order); d.orders = d.orders.slice(0, 600); });
      await addLog(null, `Nieuwe ontbijtbestelling ${order.id} · kamer ${room}`);
      return send(res, 200, { ok: true, id: order.id });
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
      await new Promise(r => setTimeout(r, 350));
      const { data: C } = await load('config');
      let user = null;
      if ((process.env.OPS_OWNER_PIN && pin === process.env.OPS_OWNER_PIN) || (C.ownerPinHash && hashPin(pin) === C.ownerPinHash)) user = { id: 'owner', name: C.ownerName || 'Eigenaar', role: 'owner' };
      else { const s = C.staff.find(x => x.pinHash === hashPin(pin) && x.active !== false); if (s) user = { id: s.id, name: s.name, role: s.role }; }
      if (!user) return send(res, 401, { error: 'Onbekende pincode' });
      const token = sign({ ...user, exp: Date.now() + 30 * 864e5 });
      await addLog(user, 'Ingelogd');
      return send(res, 200, { token, user, perms: ROLES[user.role] });
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
      if (isNew) await addLog({ name: g.name }, 'Nieuw gastaccount (Google)');
      return send(res, 200, { token: sign({ gid: g.id, name: g.name, role: 'guest', exp: Date.now() + 180 * 864e5 }), name: g.name, isNew, needPhone: !g.phone });
    }
    if ((a === 'g-register' || a === 'g-login') && req.method === 'POST') {
      const b = await body(req);
      const email = clean(b.email, 120).toLowerCase(), pw = String(b.password || '');
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
      } else {
        const { data } = await load('guests');
        g = data.guests.find(x => x.email === email);
        if (g && !g.pw) return send(res, 401, { error: 'Dit account gebruikt Google. Tik op “Doorgaan met Google”.' });
        if (!g || hashPw(pw, g.salt) !== g.pw) return send(res, 401, { error: 'E-mail of wachtwoord klopt niet' });
      }
      return send(res, 200, { token: sign({ gid: g.id, name: g.name, role: 'guest', exp: Date.now() + 180 * 864e5 }), name: g.name });
    }

    // ===== beveiligd =====
    const u = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
    if (!u) return send(res, 401, { error: 'Log opnieuw in' });
    if (u.role === 'guest') {
      const gid = u.gid;
      if (a === 'g-me') {
        const [{ data: G }, { data: O }] = await Promise.all([load('guests'), load('orders')]);
        const g = G.guests.find(x => x.id === gid);
        if (!g) return send(res, 401, { error: 'Log opnieuw in' });
        return send(res, 200, {
          me: { name: g.name, email: g.email, phone: g.phone, memberships: g.memberships || {}, memberNo: 'VA-' + g.id.slice(0, 6).toUpperCase(), qr: qrCode('M', g.id) },
          reservations: G.reservations.filter(r => r.guestId === gid).map(r => ({ ...r, qr: qrCode('R', r.id), valid: validity(r), lastScan: (r.scans || [])[0] || null })).sort((x, y) => ((x.from || x.date) < (y.from || y.date) ? -1 : 1)),
          requests: G.requests.filter(r => r.guestId === gid).slice(0, 30),
          orders: O.orders.filter(o => o.guestId === gid).slice(0, 30), plans: PLANS, today: today(),
        });
      }
      if (req.method !== 'POST') return send(res, 405, { error: 'POST verwacht' });
      const b = await body(req);
      if (a === 'g-reserve') {
        const kind = ['room', 'pottery', 'lessen', 'event'].includes(b.kind) ? b.kind : null;
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
        } else if (kind === 'event') {
          const { data: A } = await load('agenda');
          const ev = A.events.find(e => e.id === b.eventId);
          if (!ev || ev.date < today()) return send(res, 400, { error: 'Dit event is niet meer beschikbaar' });
          if (G0.reservations.some(x => x.guestId === gid && x.eventId === ev.id && x.status !== 'geannuleerd')) return send(res, 409, { error: 'Je bent al ingeschreven voor dit event' });
          r.eventId = ev.id; r.title = ev.title; r.date = ev.date; r.time = ev.time;
        } else {
          if (!isDate(b.date) || b.date < today()) return send(res, 400, { error: 'Kies een geldige datum' });
          r.date = b.date; r.member = !!(g.memberships['pottery-lid'] && g.memberships['pottery-lid'].status === 'actief') || !!b.member;
        }
        if (kind === 'event') { const { data: A } = await load('agenda'); const ev = A.events.find(e => e.id === r.eventId); const n = parseFloat(String(ev.price).replace(/[^\d,.]/g, '').replace(',', '.')) || 0; r.total = n * r.guests; }
        else Object.assign(r, quote(C, r));
        if (kind === 'room') {
          const clash = await mutate('calendar', d => { const c = d.entries.find(x => x.room === r.room && x.from < r.to && x.to > r.from); if (c) return c; d.entries.push({ id: 'c' + r.id, ref: r.id, room: r.room, from: r.from, to: r.to, type: 'booking', guest: g.name, guestId: gid, note: 'Online · ' + r.guests + ' pers.' + (r.extras.ontbijt ? ' · ontbijt' : '') + (r.extras.late ? ' · late check-out' : ''), by: 'Website', created: Date.now() }); return null; });
          if (clash) return send(res, 409, { error: 'Deze kamer is net bezet voor (een deel van) deze periode. Kies andere data.' });
        }
        await mutate('guests', d => { d.reservations.push(r); });
        await addLog({ name: g.name }, `Reservatie ${r.id} · ${kind === 'room' ? r.roomName + ' ' + r.from + ' → ' + r.to : (kind === 'event' ? r.title + ' ' : kind === 'lessen' ? 'Lessenreeks ' : 'Vrij atelier ') + r.date}`);
        return send(res, 200, { ok: true, reservation: r });
      }
      if (a === 'g-cancel') {
        let out = null;
        await mutate('guests', d => { const r = d.reservations.find(x => x.id === b.id && x.guestId === gid); if (!r || r.status === 'geannuleerd') { out = 'nf'; return; } if (daysUntil(r.from || r.date) < 2) { out = 'late'; return; } r.status = 'geannuleerd'; r.cancelled = Date.now(); out = r; });
        if (out === 'nf') return send(res, 404, { error: 'Niet gevonden' });
        if (out === 'late') return send(res, 400, { error: 'Annuleren kan tot 48 uur vooraf. Neem contact met ons op.' });
        if (out.kind === 'room') await mutate('calendar', d => { d.entries = d.entries.filter(x => x.ref !== out.id); });
        await addLog({ name: out.guestName }, `Reservatie ${out.id} geannuleerd door gast`);
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
    if (a === 'me') return send(res, 200, { user: u, perms: ROLES[u.role] });

    if (a === 'bootstrap') {
      const [C, K, A, M, O] = await Promise.all(['config', 'calendar', 'agenda', 'menus', 'orders'].map(n => load(n).then(r => r.data)));
      const out = { user: u, perms: ROLES[u.role], orders: can(u, 'orders') ? O.orders.slice(0, 200) : [], menus: M };
      if (can(u, 'calendar')) out.calendar = K.entries;
      if (can(u, 'agenda')) out.events = A.events;
      if (can(u, 'connect')) out.ical = C.ical, out.icalKey = C.icalKey;
      if (can(u, 'connect')) out.googleClientId = C.googleClientId || '', out.googleEnv = !!process.env.GOOGLE_CLIENT_ID;
      if (can(u, 'prices')) out.prices = C.prices;
      if (can(u, 'staff')) out.staff = C.staff.map(s => ({ id: s.id, name: s.name, role: s.role, active: s.active !== false }));
      if (can(u, 'log')) out.log = (await load('log')).data.log.slice(0, 120);
      if (can(u, 'guests')) { const { data: G } = await load('guests'); out.guests = G.guests.map(g => ({ id: g.id, name: g.name, email: g.email, phone: g.phone, memberships: g.memberships || {}, n: G.reservations.filter(r => r.guestId === g.id && r.status !== 'geannuleerd').length })); out.reservations = G.reservations.slice(-200); out.requests = G.requests.slice(0, 100); out.plans = PLANS; }
      out.store = hasStore();
      return send(res, 200, out);
    }
    if (a === 'orders') {
      if (!can(u, 'orders')) return send(res, 403, { error: 'Geen toegang' });
      const { data } = await load('orders');
      return send(res, 200, { orders: data.orders.slice(0, 200) });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'POST verwacht' });
    const b = await body(req);

    if (a === 'order-status') {
      if (!can(u, 'orders')) return send(res, 403, { error: 'Geen toegang' });
      const st = ['nieuw', 'bereiding', 'geleverd', 'geannuleerd'].includes(b.status) ? b.status : null;
      if (!st) return send(res, 400, { error: 'Ongeldige status' });
      await mutate('orders', d => { const o = d.orders.find(x => x.id === b.id); if (o) { o.status = st; o.by = u.name; o.updated = Date.now(); } });
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
      if (u.role !== 'owner') return send(res, 403, { error: 'Alleen de eigenaar' });
      const email = 'jasonbalongo@gmail.com';
      if (a === 'demo-clear') {
        await mutate('guests', d => { d.reservations = d.reservations.filter(r => !r.demo); });
        await mutate('calendar', d => { d.entries = d.entries.filter(e => !e.demo); });
        await addLog(u, 'Voorbeeldreservaties verwijderd'); return send(res, 200, { ok: true });
      }
      const { data: C } = await load('config'), { data: K } = await load('calendar'), { data: A } = await load('agenda');
      const t = today(), t2 = addDays(t, 2);
      let room = ROOMS.find(rm => !K.entries.some(e => e.room === rm && e.from < t2 && e.to > t)), from = t, to = t2;
      if (!room) { for (let i = 3; i < 60 && !room; i++) { from = addDays(t, i); to = addDays(from, 2); room = ROOMS.find(rm => !K.entries.some(e => e.room === rm && e.from < to && e.to > from)); } }
      const ev = A.events.filter(e => e.date > t).sort((x, y) => x.date < y.date ? -1 : 1)[0];
      let pw = null, g;
      await mutate('guests', d => {
        d.reservations = d.reservations.filter(r => !r.demo);
        g = d.guests.find(x => x.email === email);
        if (!g) { pw = 'amano-' + crypto.randomBytes(3).toString('hex'); const salt = crypto.randomBytes(12).toString('hex'); g = { id: id(), email, name: 'Jason Balongo', phone: '', salt, pw: hashPw(pw, salt), created: Date.now(), memberships: {} }; d.guests.push(g); }
        const base = { guestId: g.id, guestName: g.name, created: Date.now(), status: 'bevestigd', demo: true };
        const mk = (k, x) => ({ id: 'R' + (Date.now() + k).toString(36).toUpperCase(), ...base, ...x });
        const r1 = mk(1, { kind: 'room', room, roomName: ROOM_NAMES[room], roomNo: ROOMS.indexOf(room) + 1, from, to, guests: 2, extras: { ontbijt: true, well: true, bike: false, late: false } }); Object.assign(r1, quote(C, r1));
        const r2 = mk(2, { kind: 'pottery', date: t, guests: 2, member: false }); Object.assign(r2, quote(C, r2));
        const rs = [r1, r2];
        if (ev) rs.push(mk(3, { kind: 'event', eventId: ev.id, title: ev.title, date: ev.date, time: ev.time, guests: 2, total: (parseFloat(String(ev.price).replace(/[^\d,.]/g, '').replace(',', '.')) || 0) * 2 }));
        d.reservations.push(...rs); g._rs = rs;
      });
      const rs = g._rs; delete g._rs;
      await mutate('calendar', d => { d.entries = d.entries.filter(e => !e.demo); d.entries.push({ id: 'c' + rs[0].id, ref: rs[0].id, room, from, to, type: 'booking', guest: 'Jason Balongo', guestId: g.id, note: 'Voorbeeld · 2 pers. · ontbijt', by: 'Demo', demo: true, created: Date.now() }); });
      await addLog(u, '3 voorbeeldreservaties aangemaakt voor Jason Balongo');
      return send(res, 200, { ok: true, email, password: pw, items: rs.map(r => ({ id: r.id, kind: r.kind, label: r.kind === 'room' ? r.roomName + ' · kamer ' + String(r.roomNo).padStart(2, '0') : r.kind === 'event' ? r.title : 'Vrij atelier Pottery', when: r.kind === 'room' ? r.from + ' → ' + r.to : r.date + (r.time ? ' · ' + r.time : ''), qr: qrCode('R', r.id), valid: validity(r) })) });
    }
    if (a === 'google-set') {
      if (!can(u, 'connect')) return send(res, 403, { error: 'Geen toegang' });
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
        if (b.pin && (C.staff.some(s => s.pinHash === hashPin(b.pin) && s.id !== b.id) || C.ownerPinHash === hashPin(b.pin))) return 'dup';
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
