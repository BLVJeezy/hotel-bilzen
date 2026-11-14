// Villa Amano · e-mails via Resend. Env: RESEND_API_KEY, RESEND_FROM, RESEND_REPLY_TO, OPS_NOTIFY_EMAIL (optioneel, komma-gescheiden)
const SITE = process.env.SITE_URL || 'https://hotel-bilzen.vercel.app';
let CFG = {};
const FROM = () => process.env.RESEND_FROM || CFG.from || 'Villa Amano <onboarding@resend.dev>';
const REPLY = () => process.env.RESEND_REPLY_TO || CFG.replyTo || 'info@villa-amano.com';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nice = d => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
const eur = n => '€ ' + Number(n || 0).toLocaleString('nl-BE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

function layout(title, intro, rows, cta, foot) {
  const tr = (rows || []).map(([k, v]) => `<tr><td style="padding:9px 0;color:#a99b88;font-size:14px;border-bottom:1px solid #2a221c">${esc(k)}</td><td style="padding:9px 0;color:#efe6d6;font-size:14px;text-align:right;border-bottom:1px solid #2a221c">${esc(v)}</td></tr>`).join('');
  return `<!DOCTYPE html><html><body style="margin:0;background:#0f0c0a;padding:28px 12px;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#17120f;border:1px solid #3a2f25;border-radius:18px">
<tr><td style="padding:30px 32px 6px;text-align:center"><div style="font-family:Georgia,serif;letter-spacing:.32em;font-size:13px;color:#e6b866">VILLA AMANO</div></td></tr>
<tr><td style="padding:14px 32px 0"><h1 style="margin:0;font-family:Georgia,serif;font-weight:normal;font-size:28px;line-height:1.2;color:#f3ead9">${esc(title)}</h1>
<p style="margin:14px 0 0;color:#cfc3b0;font-size:15px;line-height:1.6">${intro}</p></td></tr>
${tr ? `<tr><td style="padding:18px 32px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${tr}</table></td></tr>` : ''}
${cta ? `<tr><td style="padding:26px 32px 0" align="center"><a href="${cta[1]}" style="display:inline-block;background:#e6b866;color:#24180e;text-decoration:none;font-size:15px;padding:14px 28px;border-radius:999px">${esc(cta[0])}</a></td></tr>` : ''}
<tr><td style="padding:26px 32px 30px;color:#8f8272;font-size:12.5px;line-height:1.6">${foot || ''}${foot ? '<br><br>' : ''}Villa Amano · Wijsstraat 1, 3740 Bilzen-Hoeselt<br>Vragen? Antwoord gewoon op deze e-mail.</td></tr>
</table></td></tr></table></body></html>`;
}
const text = (title, rows, cta) => [title, '', ...(rows || []).map(([k, v]) => `${k}: ${v}`), '', cta ? `${cta[0]}: ${cta[1]}` : '', '', 'Villa Amano · Wijsstraat 1, 3740 Bilzen-Hoeselt'].join('\n');

let SENDER = null;
async function send(to, subject, html, txt, tags) {
  if (SENDER) return SENDER(to, subject, html);
  const key = process.env.RESEND_API_KEY || CFG.key;
  if (!key || !to) return { skipped: true };
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: ctrl.signal,
      headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
      body: JSON.stringify({ from: FROM(), to: [].concat(to), reply_to: REPLY(), subject, html, text: txt, tags }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) console.error('resend', r.status, j && j.message);
    return j;
  } catch (e) { console.error('resend', e && e.message); return { error: true }; }
  finally { clearTimeout(t); }
}
const staff = () => (process.env.OPS_NOTIFY_EMAIL || CFG.notify || REPLY()).split(',').map(s => s.trim()).filter(Boolean);

function resRows(r) {
  if (r.kind === 'room') {
    const ex = Object.entries(r.extras || {}).filter(([, v]) => v).map(([k]) => ({ ontbijt: 'ontbijt', well: 'wellness', bike: 'e-bike', late: 'late check-out' }[k])).join(', ');
    return [['Kamer', r.roomName], ['Aankomst', nice(r.from) + ' · vanaf 15:00'], ['Vertrek', nice(r.to) + ' · tot 11:00'], ['Gasten', r.guests], ...(ex ? [["Extra's", ex]] : []), ['Totaal', eur(r.total)], ['Reservatienummer', r.id]];
  }
  const what = r.kind === 'event' ? r.title : r.kind === 'wellness' ? 'Wellness-moment' : r.kind === 'lessen' ? 'Lessenreeks Pottery House' : 'Vrij atelier · Pottery House';
  return [['Wat', what], ['Datum', nice(r.date) + (r.time ? ' · ' + r.time : '')], ['Personen', r.guests], ['Totaal', eur(r.total)], ['Reservatienummer', r.id]];
}

module.exports = {
  use(c) { CFG = c || {}; },
  status() { return { on: !!(process.env.RESEND_API_KEY || CFG.key), from: FROM(), replyTo: REPLY(), notify: staff(), reviewUrl: CFG.reviewUrl || '' }; },
  test(to) { const t = 'Test van Villa Amano'; return send(to, t, layout(t, 'E-mails vanuit de website werken. Gasten krijgen voortaan een bevestiging bij account, reservatie, annulatie en ontbijt.', null, ['Open de website', SITE]), text(t)); },
  welcome(g) {
    const t = `Welkom, ${g.name.split(' ')[0]}`;
    const cta = ['Open je portaal', SITE + '/portaal/'];
    return send(g.email, 'Welkom bij Villa Amano', layout(t, 'Je account is aangemaakt. In je portaal vind je je reservaties met QR-code, bestel je ontbijt en boek je pottery- en wellnessmomenten.', null, cta, 'Tip: zet het portaal op je beginscherm, dan werkt het als een app.'), text(t, null, cta), [{ name: 'type', value: 'welcome' }]);
  },
  reservation(g, r) {
    const rows = resRows(r), cta = ['Bekijk in je portaal (met QR)', SITE + '/portaal/?nieuw=' + r.id];
    const t = r.kind === 'room' ? 'Je verblijf is bevestigd' : 'Je reservatie is bevestigd';
    const p = [send(g.email, `${t} · ${r.id}`, layout(t, `Dag ${esc(g.name.split(' ')[0])}, we kijken ernaar uit je te ontvangen. Je QR-code staat in je portaal; laat die bij aankomst scannen.`, rows, cta, 'Gratis annuleren kan tot 48 uur vooraf via je portaal.'), text(t, rows, cta), [{ name: 'type', value: 'reservation' }])];
    if (staff().length) p.push(send(staff(), `Nieuwe reservatie ${r.id} · ${g.name}`, layout('Nieuwe reservatie', `${esc(g.name)} · ${esc(g.email)}${g.phone ? ' · ' + esc(g.phone) : ''}`, rows, ['Open ops', SITE + '/ops/']), text('Nieuwe reservatie', rows), [{ name: 'type', value: 'staff' }]));
    return Promise.all(p);
  },
  cancelled(g, r) {
    const rows = resRows(r), t = 'Je reservatie is geannuleerd';
    const p = [send(g.email, `${t} · ${r.id}`, layout(t, 'Jammer dat het er deze keer niet van komt. Je hoeft niets te betalen.', rows, ['Nieuwe datum kiezen', SITE + '/kamers']), text(t, rows), [{ name: 'type', value: 'cancel' }])];
    if (staff().length) p.push(send(staff(), `Annulatie ${r.id} · ${g.name}`, layout('Reservatie geannuleerd', esc(g.name), rows), text('Annulatie', rows), [{ name: 'type', value: 'staff' }]));
    return Promise.all(p);
  },
  order(g, o) {
    const items = o.items.map(i => `${i.qty}× ${i.name}`).concat(o.extras.map(e => e.name)).join(', ');
    const rows = [['Datum', nice(o.date) + ' · ' + o.time], ['Waar', o.where === 'terras' ? 'Terras' : 'Op de kamer'], ['Kamer', o.roomName], ['Bestelling', items], ['Inbegrepen', o.included + ' menu(s)'], ['Op je kamerrekening', eur(o.total)], ['Bestelnummer', o.id]];
    const t = 'Je ontbijt is besteld';
    const p = [send(g.email, `${t} · ${nice(o.date)}`, layout(t, 'Het staat klaar op het gekozen tijdstip.', rows, ['Bekijk in je portaal', SITE + '/portaal/']), text(t, rows), [{ name: 'type', value: 'order' }])];
    if (staff().length) p.push(send(staff(), `Ontbijt ${o.id} · kamer ${o.room} · ${o.time}`, layout('Nieuwe ontbijtbestelling', esc(g.name), rows, ['Open ops', SITE + '/ops/']), text('Ontbijt', rows), [{ name: 'type', value: 'staff' }]));
    return Promise.all(p);
  },

  reset(g, link) {
    const t = 'Nieuw wachtwoord kiezen', cta = ['Kies een nieuw wachtwoord', link];
    return send(g.email, 'Nieuw wachtwoord · Villa Amano', layout(t, `Dag ${esc(g.name.split(' ')[0])}, tik op de knop om een nieuw wachtwoord te kiezen. De link werkt één uur en maar één keer.`, null, cta, 'Heb je dit niet gevraagd? Dan hoef je niets te doen.'), text(t, null, cta), [{ name: 'type', value: 'reset' }]);
  },
  preArrival(g, r) {
    const first = esc(g.name.split(' ')[0]), ex = r.extras || {};
    const up = [!ex.ontbijt && ['Ontbijt', '€ 25 p.p. · op je kamer of op het terras'], !ex.well && ['Wellness-moment', '€ 35 p.p. · privé sauna & stoombad'], ['Pottery House', 'Vrij atelier tot 22:00 · € 30 p.p.'], !ex.late && ['Late check-out', 'Blijf tot 13:00 · € 45']].filter(Boolean);
    const upHtml = up.map(([a, b]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #2a221c"><b style="color:#efe6d6;font-weight:normal">${a}</b><br><span style="color:#a99b88;font-size:13px">${b}</span></td></tr>`).join('');
    const t = `Nog ${r._days || 3} dagen, ${g.name.split(' ')[0]}`;
    const intro = `we maken ${esc(r.roomName)} voor je klaar. Check in online, dan sta je bij aankomst meteen in je kamer.<br><br><b style="color:#e6b866;font-weight:normal">Maak je verblijf compleet</b><table role="presentation" width="100%" style="margin-top:6px">${upHtml}</table>`;
    const rows = [['Aankomst', nice(r.from) + ' · 15:00 – 21:00'], ['Vertrek', nice(r.to) + (ex.late ? ' · tot 13:00' : ' · tot 11:00')], ['Adres', 'Wijsstraat 1, 3740 Bilzen-Hoeselt'], ['Parking', 'Gratis, aan de villa']];
    const cta = ['Online inchecken', SITE + '/portaal/?checkin=' + r.id];
    return send(g.email, `Je verblijf in Villa Amano komt eraan · ${nice(r.from)}`, layout(t, `Dag ${first}, ` + intro, rows, cta, 'Iets nodig of later aankomen? Antwoord gewoon op deze e-mail.'), text(t, rows, cta), [{ name: 'type', value: 'pre-arrival' }]);
  },
  checkoutDay(g, r, T) {
    const t = 'Tijd om uit te checken';
    const rows = [['Kamer', r.roomName], ['Check-out', (r.extras && r.extras.late ? 'tot 13:00' : 'tot 11:00')], ['Totaal verblijf', eur(T.total)], ['Nog te betalen', eur(T.due)]];
    const cta = ['Online uitchecken', SITE + '/portaal/?checkout=' + r.id];
    return send(g.email, 'Online uitchecken · Villa Amano', layout(t, `Goedemorgen ${esc(g.name.split(' ')[0])}. Je kan in je portaal in één minuut uitchecken${T.due ? ' en het saldo betalen' : ''}. Laat de sleutel gewoon op de kamer.`, rows, cta), text(t, rows, cta), [{ name: 'type', value: 'checkout-day' }]);
  },
  postStay(g, r) {
    const t = 'Bedankt voor je verblijf';
    const cta = ['Laat een review achter', process.env.REVIEW_URL || CFG.reviewUrl || SITE + '/reviews'];
    return send(g.email, `Bedankt, ${g.name.split(' ')[0]} · Villa Amano`, layout(t, `Het was fijn je te ontvangen in ${esc(r.roomName)}. Heb je twee minuten? Een korte review helpt ons enorm.<br><br>Als dank: <b style="color:#e6b866;font-weight:normal">10% korting</b> op je volgende verblijf met code <b style="color:#efe6d6">WELKOMTERUG</b>.`, null, cta, 'Je factuur vind je altijd in je portaal.'), text(t, null, cta), [{ name: 'type', value: 'post-stay' }]);
  },
  checkedOut(g, r, T, inv) {
    const t = 'Je bent uitgecheckt';
    const rows = [['Kamer', r.roomName], ['Verblijf', nice(r.from) + ' – ' + nice(r.to)], ['Totaal', eur(T.total)], ['Betaald', eur(T.paid)], ['Saldo', eur(T.due)]];
    const cta = ['Download je factuur', SITE + inv];
    const p = [send(g.email, 'Uitgecheckt · factuur Villa Amano', layout(t, 'Goede reis! Hieronder je overzicht en je factuur.', rows, cta), text(t, rows, cta), [{ name: 'type', value: 'checked-out' }])];
    if (staff().length) p.push(send(staff(), `Uitgecheckt: ${r.roomName} · ${g.name}`, layout('Gast uitgecheckt', `${esc(g.name)} heeft online uitgecheckt. ${T.due ? '<b style="color:#e6b866">Nog open: ' + eur(T.due) + '</b>' : 'Volledig betaald.'}`, rows, ['Open ops', SITE + '/ops/']), text('Uitgecheckt', rows), [{ name: 'type', value: 'staff' }]));
    return Promise.all(p);
  },
  checkinDone(g, r) {
    if (!staff().length) return;
    const c = r.checkin || {}, rows = [['Kamer', r.roomName], ['Aankomst', nice(r.from) + (c.arrival ? ' · rond ' + c.arrival : '')], ['Gasten', r.guests], ...(c.plate ? [['Nummerplaat', c.plate]] : []), ...(c.wishes ? [['Wensen', c.wishes]] : [])];
    return send(staff(), `Online ingecheckt: ${g.name} · ${nice(r.from)}`, layout('Gast is online ingecheckt', esc(g.name), rows, ['Open ops', SITE + '/ops/']), text('Online ingecheckt', rows), [{ name: 'type', value: 'staff' }]);
  },
  preview(name) {
    const g = { name: 'Sofie Peeters', email: 'sofie@voorbeeld.be', phone: '+32 470 12 34 56' };
    const d = n => { const x = new Date(Date.now() + n * 864e5); return x.toISOString().slice(0, 10); };
    const r = { id: 'RVOORBEELD', kind: 'room', room: 'moon', roomName: 'Moonstone', from: d(3), to: d(5), guests: 2, total: 520, extras: { ontbijt: true, well: false, bike: false, late: false }, _days: 3, checkin: { arrival: '17:00', wishes: 'Extra kussen graag' } };
    const T = { total: 520, paid: 156, due: 364 };
    const cap = [];
    const fake = (to, subject, html) => { cap.push({ to, subject, html }); return { id: 'preview' }; };
    const F = { welcome: () => this.welcome(g), reservation: () => this.reservation(g, r), preArrival: () => this.preArrival(g, r), checkoutDay: () => this.checkoutDay(g, r, T), checkedOut: () => this.checkedOut(g, r, T, '/factuur?id=RVOORBEELD'), postStay: () => this.postStay(g, r), cancelled: () => this.cancelled(g, r), checkinDone: () => this.checkinDone(g, r) };
    SENDER = fake; try { F[name] && F[name](); } finally { SENDER = null; }
    return cap;
  },
  TEMPLATES: [['reservation', 'Bevestiging reservatie (+ melding eigenaar)'], ['welcome', 'Welkom bij nieuw account'], ['preArrival', '3 dagen voor aankomst · online inchecken & extra\'s'], ['checkinDone', 'Melding eigenaar: gast online ingecheckt'], ['checkoutDay', 'Vertrekdag · online uitchecken'], ['checkedOut', 'Uitgecheckt · factuur (+ melding eigenaar)'], ['postStay', 'Dag na vertrek · bedankt & review'], ['cancelled', 'Annulatie (+ melding eigenaar)']],
  _layout: layout, _send: send,
};
