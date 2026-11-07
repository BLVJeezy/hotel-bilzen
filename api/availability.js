// GET /api/availability → { rooms: { rose: [[start,end), ...], ... } }
// Bronnen: kalender uit het operations center + gekoppelde Booking.com/Airbnb-links (per kamer)
// + optionele env-variabelen ICAL_ROSE … ICAL_AMETHYST.
const { load } = require('./ops');
const ROOMS = { rose: 'ICAL_ROSE', clear: 'ICAL_CLEAR', sun: 'ICAL_SUN', moon: 'ICAL_MOON', amethyst: 'ICAL_AMETHYST' };

function toISO(v) { const m = /^(\d{4})(\d{2})(\d{2})/.exec(v || ''); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; }
function parseICS(text) {
  const out = [];
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
    const get = k => { const m = new RegExp('^' + k + '[^:\\n]*:(.+)$', 'm').exec(block); return m ? m[1].trim() : null; };
    if ((get('STATUS') || '').toUpperCase() === 'CANCELLED') continue;
    const s = toISO(get('DTSTART')), e = toISO(get('DTEND')) || s;
    if (s) out.push([s, e > s ? e : s]);
  }
  return out;
}
async function feed(url) {
  try { const r = await fetch(url, { headers: { 'user-agent': 'VillaAmano-Availability/1.0' } }); return r.ok ? parseICS(await r.text()) : []; } catch (e) { return []; }
}

module.exports = async (req, res) => {
  let cal = { entries: [] }, cfg = { ical: {} }, haveStore = !!process.env.BLOB_READ_WRITE_TOKEN;
  if (haveStore) { try { cal = (await load('calendar')).data; cfg = (await load('config')).data; } catch (e) { haveStore = false; } }
  const rooms = {}; let sources = 0;
  await Promise.all(Object.entries(ROOMS).map(async ([id, env]) => {
    const list = cal.entries.filter(e => e.room === id).map(e => [e.from, e.to]);
    const urls = [process.env[env], (cfg.ical[id] || {}).booking, (cfg.ical[id] || {}).airbnb].filter(Boolean);
    for (const u of urls) { list.push(...await feed(u)); sources++; }
    rooms[id] = list.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }));
  if (!haveStore && !sources) { res.statusCode = 404; res.setHeader('content-type', 'application/json'); return res.end('{"error":"nog geen operations center"}'); }
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 's-maxage=60, stale-while-revalidate=300');
  res.end(JSON.stringify({ source: 'ops', updated: new Date().toISOString(), rooms }));
};
