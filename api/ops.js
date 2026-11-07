// Villa Amano · Operations Center API
// Opslag: Vercel Blob (privé). Vereist BLOB_READ_WRITE_TOKEN (automatisch na "Connect store" in Vercel).
// Optioneel: OPS_SECRET (sessies), OPS_OWNER_PIN (vaste eigenaars-pincode).
const crypto = require('crypto');
let blob = null;
try { blob = require('@vercel/blob'); } catch (e) { /* lokaal zonder dependency */ }

const ROOMS = ['rose', 'clear', 'sun', 'moon', 'amethyst'];
const ROOM_NAMES = { rose: 'Rose Quartz', clear: 'Clear Quartz', sun: 'Sunstone', moon: 'Moonstone', amethyst: 'Amethyst' };
const ROLES = {
  owner: ['today', 'orders', 'calendar', 'agenda', 'menus', 'prices', 'staff', 'log', 'connect'],
  receptie: ['today', 'orders', 'calendar', 'agenda', 'connect'],
  keuken: ['today', 'orders', 'menus'],
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
  log: () => ({ log: [] }),
};

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
        items, extras, diet: (b.diet || []).map(d => clean(d, 40)).slice(0, 6), note: clean(b.note, 300), total,
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

    // ===== beveiligd =====
    const u = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
    if (!u) return send(res, 401, { error: 'Log opnieuw in' });
    if (a === 'me') return send(res, 200, { user: u, perms: ROLES[u.role] });

    if (a === 'bootstrap') {
      const [C, K, A, M, O] = await Promise.all(['config', 'calendar', 'agenda', 'menus', 'orders'].map(n => load(n).then(r => r.data)));
      const out = { user: u, perms: ROLES[u.role], orders: can(u, 'orders') ? O.orders.slice(0, 200) : [], menus: M };
      if (can(u, 'calendar')) out.calendar = K.entries;
      if (can(u, 'agenda')) out.events = A.events;
      if (can(u, 'connect')) out.ical = C.ical, out.icalKey = C.icalKey;
      if (can(u, 'prices')) out.prices = C.prices;
      if (can(u, 'staff')) out.staff = C.staff.map(s => ({ id: s.id, name: s.name, role: s.role, active: s.active !== false }));
      if (can(u, 'log')) out.log = (await load('log')).data.log.slice(0, 120);
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
