// GET /api/availability → { rooms: { rose: [[start,end), ...], ... }, source }
// Zet per kamer een iCal-link als environment variable in Vercel (Booking.com, Airbnb, Google Agenda, boekingssysteem):
//   ICAL_ROSE, ICAL_CLEAR, ICAL_SUN, ICAL_MOON, ICAL_AMETHYST
// Zonder iCal-links valt de site terug op availability.json in de repo.
const ROOMS = { rose: 'ICAL_ROSE', clear: 'ICAL_CLEAR', sun: 'ICAL_SUN', moon: 'ICAL_MOON', amethyst: 'ICAL_AMETHYST' };

function toISO(v) {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v || '');
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function parseICS(text) {
  const out = [];
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
    const get = k => { const m = new RegExp('^' + k + '[^:\\n]*:(.+)$', 'm').exec(block); return m ? m[1].trim() : null; };
    if ((get('STATUS') || '').toUpperCase() === 'CANCELLED') continue;
    const s = toISO(get('DTSTART')), e = toISO(get('DTEND')) || s;
    if (s) out.push([s, e > s ? e : s]);
  }
  return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

module.exports = async (req, res) => {
  const rooms = {};
  let live = 0;
  await Promise.all(Object.entries(ROOMS).map(async ([id, env]) => {
    const url = process.env[env];
    if (!url) return;
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'VillaAmano-Availability/1.0' } });
      if (r.ok) { rooms[id] = parseICS(await r.text()); live++; }
    } catch (e) { /* val terug op JSON */ }
  }));
  if (!live) { res.statusCode = 404; res.setHeader('content-type', 'application/json'); return res.end('{"error":"geen iCal ingesteld"}'); }
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 's-maxage=300, stale-while-revalidate=600');
  res.end(JSON.stringify({ source: 'ical', updated: new Date().toISOString(), rooms }));
};
