// Villa Amano · facturen, betalingen, schoonmaak, rapporten (pure functies, geen opslag)
const ROOMS = ['rose', 'clear', 'sun', 'moon', 'amethyst'];
const ROOM_NAMES = { rose: 'Rose Quartz', clear: 'Clear Quartz', sun: 'Sunstone', moon: 'Moonstone', amethyst: 'Amethyst' };
const r2 = n => Math.round((+n || 0) * 100) / 100;
const nightsOf = (f, t) => Math.max(0, Math.round((new Date(t + 'T12:00Z') - new Date(f + 'T12:00Z')) / 864e5));
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

const BIZ_DEFAULTS = {
  company: 'Villa Amano', legal: '', vat: '', address: 'Wijsstraat 1, 3740 Bilzen-Hoeselt', iban: '', email: 'info@villa-amano.com',
  vatLogies: 6, vatFood: 12, vatOther: 21, touristTax: 0, deposit: 30, mollie: false,
};
const biz = C => ({ ...BIZ_DEFAULTS, ...(C.biz || {}), mollie: !!(process.env.MOLLIE_API_KEY || (C.biz || {}).mollieKey) });

// factuurregels (bedragen incl. btw)
function lines(C, r) {
  const B = biz(C), L = [];
  const add = (label, qty, unit, vat) => { if (qty > 0 && unit !== 0) L.push({ label, qty, unit: r2(unit), total: r2(qty * unit), vat }); };
  if (r.kind === 'room') {
    const n = nightsOf(r.from, r.to), g = r.guests || 1, price = (C.prices || {})[r.room] || 225, ex = r.extras || {};
    add(`Overnachting ${r.roomName} · ${r.from} → ${r.to}`, n, price, B.vatLogies);
    if (ex.ontbijt) add('Ontbijt' + (r.bfName ? ' · ' + r.bfName : ''), g * n, r.bfPrice || 25, B.vatFood);
    if (ex.well) add('Wellness-moment', g, 35, B.vatOther);
    if (ex.bike) add('E-bike', g * n, 45, B.vatOther);
    if (ex.late) add('Late check-out', 1, 45, B.vatLogies);
    (r.charges || []).forEach(c => add(c.label, 1, c.amount, B.vatFood));
    if (B.touristTax > 0) L.push({ label: 'Verblijfsbelasting', qty: g * n, unit: r2(B.touristTax), total: r2(g * n * B.touristTax), vat: null });
  } else {
    const what = r.kind === 'event' ? r.title : r.kind === 'wellness' ? 'Wellness-moment' : r.kind === 'lessen' ? 'Lessenreeks Pottery House' : 'Vrij atelier Pottery House';
    add(`${what} · ${r.date}${r.time ? ' ' + r.time : ''}`, 1, r.total || 0, B.vatOther);
  }
  return L;
}
function totals(C, r) {
  const L = lines(C, r);
  const total = r2(L.reduce((s, l) => s + l.total, 0));
  const vat = {};
  L.forEach(l => { if (l.vat == null) return; const v = r2(l.total - l.total / (1 + l.vat / 100)); vat[l.vat] = r2((vat[l.vat] || 0) + v); });
  const paid = r2((r.payments || []).filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0));
  return { lines: L, total, vat, vatTotal: r2(Object.values(vat).reduce((a, b) => a + b, 0)), paid, due: r2(Math.max(0, total - paid)), deposit: r2(total * (biz(C).deposit || 0) / 100) };
}

// schoonmaak per dag
function housekeeping(K, G, HK, date) {
  const bookings = [...K.entries.filter(e => e.type === 'booking'), ...[]];
  return ROOMS.map((room, i) => {
    const on = bookings.filter(e => e.room === room);
    const dep = on.find(e => e.to === date), arr = on.find(e => e.from === date), stay = on.find(e => e.from < date && e.to > date);
    const res = id => id && G.reservations.find(r => r.id === id);
    const st = dep && arr ? 'wissel' : dep ? 'vertrek' : arr ? 'aankomst' : stay ? 'bezet' : 'vrij';
    const who = (arr || stay || dep);
    const rr = who && res(who.ref);
    const mark = ((HK.days || {})[date] || {})[room] || null;
    return { room, name: ROOM_NAMES[room], no: i + 1, status: st, guest: who ? who.guest || '' : '', guests: rr ? rr.guests : null, extras: rr ? rr.extras : null, lateCheckout: !!(rr && rr.extras && rr.extras.late && dep), done: mark, checkedOut: (dep && res(dep.ref) || {}).checkedOut || null, arrival: (arr && res(arr.ref) && res(arr.ref).checkin && res(arr.ref).checkin.arrival) || '', onlineCheckin: !!(arr && res(arr.ref) && res(arr.ref).checkin) };
  });
}

// maandrapport
function report(C, K, G, O, month) {
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`, end = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10), days = nightsOf(start, end);
  const B = biz(C), byId = Object.fromEntries(G.reservations.map(r => [r.id, r]));
  let sold = 0, roomRev = 0, persons = 0, est = 0; const perRoom = Object.fromEntries(ROOMS.map(r => [r, 0])); const src = { website: 0, manueel: 0 };
  K.entries.filter(e => e.type === 'booking' && e.from < end && e.to > start).forEach(e => {
    const f = e.from > start ? e.from : start, t = e.to < end ? e.to : end, n = nightsOf(f, t);
    sold += n; perRoom[e.room] += n;
    const r = byId[e.ref];
    if (r && r.status !== 'geannuleerd') { roomRev += n * ((C.prices || {})[r.room] || 225); persons += n * (r.guests || 1); src.website += n; }
    else { roomRev += n * ((C.prices || {})[e.room] || 225); persons += n * 2; est += n; src.manueel += n; }
  });
  const inMonth = d => d >= start && d < end;
  let extras = 0, activities = 0, breakfast = 0, paid = 0;
  G.reservations.filter(r => r.status !== 'geannuleerd').forEach(r => {
    if (r.kind === 'room') { const ex = r.extras || {}; const n = nightsOf(r.from, r.to), g = r.guests || 1; if (inMonth(r.from)) extras += (ex.ontbijt ? (r.bfPrice || 25) * g * n : 0) + (ex.well ? 35 * g : 0) + (ex.bike ? 45 * g * n : 0) + (ex.late ? 45 : 0); }
    else if (inMonth(r.date)) activities += r.total || 0;
    (r.payments || []).forEach(p => { if (p.status === 'paid' && inMonth(new Date(p.t).toISOString().slice(0, 10))) paid += p.amount; });
  });
  O.orders.filter(o => o.status !== 'geannuleerd' && inMonth(o.date)).forEach(o => (breakfast += o.total || 0));
  const avail = days * ROOMS.length;
  return {
    month, days, available: avail, sold, occupancy: avail ? r2(sold / avail * 100) : 0,
    revenue: { rooms: r2(roomRev), extras: r2(extras), breakfast: r2(breakfast), activities: r2(activities), total: r2(roomRev + extras + breakfast + activities) },
    adr: sold ? r2(roomRev / sold) : 0, revpar: avail ? r2(roomRev / avail) : 0, paid: r2(paid),
    perRoom: ROOMS.map(r => ({ room: r, name: ROOM_NAMES[r], nights: perRoom[r], occupancy: r2(perRoom[r] / days * 100) })),
    sources: src, estimatedNights: est,
    touristTax: { personNights: persons, rate: B.touristTax, amount: r2(persons * B.touristTax), estimated: est > 0 },
  };
}

function csv(rows) { return '﻿' + rows.map(r => r.map(v => { const s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n'); }
function exportMonth(C, G, month) {
  const rows = [['Factuurnr', 'Reservatie', 'Datum', 'Gast', 'Omschrijving', 'Aantal', 'Eenheidsprijs', 'Totaal incl. btw', 'Btw %', 'Btw', 'Excl. btw', 'Betaald (reservatie)', 'Saldo (reservatie)', 'Status']];
  const inMonth = d => d && d.slice(0, 7) === month;
  G.reservations.filter(r => inMonth(r.kind === 'room' ? r.from : r.date)).sort((a, b) => ((a.from || a.date) < (b.from || b.date) ? -1 : 1)).forEach(r => {
    const T = totals(C, r);
    T.lines.forEach((l, i) => {
      const v = l.vat == null ? 0 : r2(l.total - l.total / (1 + l.vat / 100));
      rows.push([r.invoiceNo || '', r.id, r.from || r.date, r.guestName, l.label, l.qty, String(l.unit).replace('.', ','), String(l.total).replace('.', ','), l.vat == null ? 'n.v.t.' : l.vat, String(v).replace('.', ','), String(r2(l.total - v)).replace('.', ','), i ? '' : String(T.paid).replace('.', ','), i ? '' : String(T.due).replace('.', ','), r.status]);
    });
  });
  return csv(rows);
}

module.exports = { biz, lines, totals, housekeeping, report, exportMonth, nightsOf, addDays, r2, BIZ_DEFAULTS };
