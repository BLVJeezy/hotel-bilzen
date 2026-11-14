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

async function send(to, subject, html, txt, tags) {
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
const staff = () => (process.env.OPS_NOTIFY_EMAIL || CFG.notify || '').split(',').map(s => s.trim()).filter(Boolean);

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
  status() { return { on: !!(process.env.RESEND_API_KEY || CFG.key), from: FROM(), replyTo: REPLY(), notify: staff() }; },
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
  _layout: layout, _send: send,
};
