# Villa Amano · briefing voor paginabouwers

Je bouwt één of meer statische HTML-pagina's voor de website van Villa Amano, een boutique hotel in Bilzen-Hoeselt (België). Werk ALLEEN in de repo `/home/claude/hotel-bilzen`. Raak `index.html`, `api/`, `ops/`, `portaal/`, `ontbijt.html`, `vercel.json`, `sitemap.xml` NIET aan; die doet de coördinator.

## Verplicht
- Start van `_template.html` (kopieer het, vervang alle HOOFDLETTER-placeholders, verwijder de comments). Header, drawer, footer en `<link rel="stylesheet" href="/css/site.css">` + `<script src="/css/site.js" defer>` blijven exact staan.
- Pad = bestandsnaam zonder .html (Vercel cleanUrls). Bv. `/kamers/rose-quartz` → `kamers/rose-quartz.html`; `/pottery-house` → `pottery-house.html`. Alle interne links absoluut (`/kamers`, `/img/...`).
- Taal: Nederlands (Vlaams, je-vorm, warm maar nuchter). Geen Engels behalve merknamen (Pottery House, Rest · Create · Be, Amano Club).
- Elke pagina: unieke `<title>` (≤ 60 tekens, eindigt op "· Villa Amano"), meta description 140–160 tekens, canonical, og:tags, BreadcrumbList JSON-LD + het paginatype-schema (zie onder), exact één `<h1>`, logische h2/h3, alt-teksten op alle afbeeldingen, `loading="lazy"` op afbeeldingen onder de vouw.
- Inhoud: minimaal 500 woorden echte, nuttige tekst per pagina (kamers ≥ 450). Geen lorem ipsum, geen herhaalde alinea's. Concreet: prijzen, uren, wat je meebrengt, voor wie, hoe boeken.
- Elke pagina eindigt met de `.cta-band` en bevat minstens 4 interne links naar andere pagina's uit de lijst onderaan.
- FAQ-blokken: gebruik `<section class="s"><div class="wrap n faq">` met `<details><summary>Vraag</summary><div class="a">Antwoord</div></details>` + FAQPage JSON-LD met dezelfde vragen.
- Mobile-first: test mentaal op 390px breed. Gebruik alleen klassen uit `/css/site.css` plus een klein `<style>` blok (< 60 regels) voor paginaspecifieks. Geen externe libraries.
- Afbeeldingen: alleen bestanden uit `/img/` (lijst onderaan). Nooit externe URL's.
- Reserveren linkt naar `/#boeken` (kamers) of naar `/portaal/#kalender` (pottery/wellness/events). Ontbijt bestellen: `/ontbijt` (alleen voor gasten met account).
- Niets verzinnen over het gebouw dat niet in deze briefing staat (geen zwembad-claims, geen aantal m², geen namen van eigenaars). Schrijf dan liever over sfeer, ritueel en wat de gast doet.

## Feiten
- Adres: Wijsstraat 1, 3740 Bilzen-Hoeselt · info@villa-amano.be · uitsluitend op afspraak of reservatie.
- Check-in 15:00–21:00 · check-out tot 11:00 · late check-out tot 13:00 € 45 · gratis parkeren · EV-laden € 10/dag · gratis wifi · airco · rookvrij · geen huisdieren · toegangscode op de dag van aankomst (geen bemande receptie 24/7).
- Annuleren: gratis tot 48 uur vooraf via het klantportaal; daarna eerste nacht aangerekend.
- Concept: Japandi × Ibiza, aards, warm licht, natuurlijke materialen. Slogan "Rest · Create · Be". Elke kamer draagt de naam en sfeer van een edelsteen.
- Kamers (prijs per nacht, 2 pers. tenzij anders):
  - 01 Rose Quartz · € 225 · rozenkwarts · blush, warm hout, linnen; badkamer met ronde spiegel en ligbad · img rose-1, rose-bad, rose-kristal, rose-detail, rose-handdoek
  - 02 Clear Quartz · € 225 · bergkristal · licht, helder, sereen · img clear-1, clear-detail, clear-2
  - 03 Sunstone · € 225 · zonnesteen · gouden en aardse tonen; inloopdouche, warm verlichte nissen · img sun-1, sun-bad2, sun-kristal, sun-3, sun-handdoek, sun-douche, sun-bad
  - 04 Moonstone · € 235 · maansteen · enige kamer met privébalkon; veel daglicht · img moon-1, moon-balkon, moon-detail
  - 05 Amethyst · € 245 · amethist · max. 3 personen (extra bed), diepe paarse accenten, ruimste kamer · img ame-1, ame-2, ame-bad, ame-detail
  - In elke kamer: eigen badkamer, airco, gratis wifi, smart-tv, koffie/thee, minibar, haardroger, kluis, luxe verzorgingsproducten, badjassen en slippers.
  - Extra's: ontbijt € 25 p.p./ochtend · wellness € 35 p.p. (max. 3 u) · e-bike € 45/dag · late check-out € 45.
- Ontbijt: 07:30–10:30, op de kamer of op het terras, € 25 p.p. Menu's: Amano Classic (croissant & zuurdesem, roerei of zachtgekookt ei, lokale kaas & ham, huisgemaakte confituur, verse jus, koffie/thee) · Green & Light (Griekse yoghurt & granola, seizoensfruit, avocado op zuurdesem, groene smoothie, kruidenthee of matcha) · Ibiza Sunrise € 28 (shakshuka met feta, hummus & pita, gegrilde tomaat, granaatappel-yoghurt, glas cava). Extra's: prosecco € 6,50 · vers sinaasappelsap € 4,50 · eggs Benedict € 7 · verjaardagsverrassing € 12. Hotelgasten bestellen via hun account; ontbijt dat in de boeking zit is per gast per dag inbegrepen.
- Pottery House (keramiekatelier, open tot 22:00): vrij atelier € 30 p.p. per blok van 3 u (draaischijf, klei, glazuur, begeleiding), startmomenten 10:00 · 13:00 · 16:00 · 19:00 · lessenreeks € 385 (8 weken) · lidmaatschap € 25 eenmalig (incl. Villa Amano-schort, nodig voor vrij atelier en lessen) · atelierkaart 10 beurten € 270 (1 jaar geldig) · onbeperkt atelier € 95/maand (maandelijks opzegbaar). Stukken worden gebakken en zijn na ± 3 weken op te halen of te verzenden. Ook voor niet-hotelgasten.
- Wellness: privé sauna, stoombad, rustruimte; 10:00–19:30; sessies van 2 uur, startmomenten 10:00 · 12:00 · 14:00 · 16:00 · 18:00; € 35 p.p.; 5-beurtenkaart € 160 (6 maanden) · maandabonnement € 110 (4 bezoeken/maand, voorrang bij tijdsloten). Badjas, slippers en handdoeken inbegrepen. Hotelgasten boeken via het portaal.
- Amano Club: gratis, 10% op elk verblijf, voorrang bij events, welkomstdrankje.
- Agenda (events, reservatie via portaal, elke inschrijving krijgt een QR-code): 14 nov Sound bath in de wellness 19:00–21:00 € 35 (max. 10) · 27 nov Raku-avond 19:00–22:00 € 65 · 6 dec Kerstmarkt van The Amano Shop 14:00–17:00 gratis · 12 dec Workshop kerstkommen draaien 10:00–13:00 € 55 · 24 dec Kerstavond-brunch 08:00–11:00 € 39 · 25 dec Kerstbrunch met live piano 08:00–11:30 € 45 · 31 dec Oudejaar: ceramics & bubbels 20:00–00:30 € 75 · 17 jan 2027 Rest · Create · Be retreatdag 10:00–16:00 € 145 (yoga, keramiek, wellness, lunch). Vast weekritme: wellness dagelijks, vrij atelier dagelijks, ontbijt dagelijks.
- Amano Retreats: meerdaagse programma's (2 of 3 nachten) met verblijf, wellness, keramiek, yoga en maaltijden; kleine groepen (max. 8); ook te boeken als privé-retreat voor een groep/bedrijf. Prijzen op aanvraag; richtprijs vanaf € 595 p.p. voor 2 nachten. Aanvragen via contact.
- Amano Therapy: individuele begeleiding en coaching in een rustige omgeving (sessies van 60 of 90 min, op afspraak, prijs op aanvraag; geen medische claims, geen diagnoses). Combineerbaar met een verblijf.
- The Amano Shop: keramiek uit het atelier (kommen, bekers, vazen), kaarsen, verzorging, linnen; te koop ter plaatse en op de kerstmarkt; online shop "binnenkort". Cadeaubon: vrij bedrag of pakket (Overnachting, Wellness-moment, Pottery-sessie, Ontbijt voor twee), digitaal of gedrukt, 1 jaar geldig, aan te vragen via contact/e-mail.
- Omgeving (afstanden ca.): Landcommanderij Alden Biesen 5 km · Tongeren 10 km (oudste stad van België, Gallo-Romeins Museum, zondagse antiekmarkt) · Hasselt 15 km (shoppen, Japanse Tuin) · Bokrijk & "Fietsen door het water" 20 km · Nationaal Park Hoge Kempen 20 km · Maastricht 20 km (boekhandel Dominicanen, Vrijthof) · Haspengouw fietsroutes en bloesems (april–mei) vanaf de deur · Genk / C-mine 20 km · Luik 35 km. Vanaf Brussel ± 1u, Antwerpen ± 1u10, Eindhoven ± 1u, Keulen ± 1u30. Treinstation Bilzen op ± 4 km (taxi/e-bike).
- Demo/juridisch: Villa Amano is een conceptsite; betalingen (Mollie) worden bij livegang gekoppeld. Voor juridische pagina's: verantwoordelijke "Villa Amano, Wijsstraat 1, 3740 Bilzen-Hoeselt, info@villa-amano.be", ondernemingsnummer "[BE 0xxx.xxx.xxx – in te vullen]". Cookies: alleen functionele cookies/localStorage (login, cookiekeuze) en optioneel anonieme statistieken.

## Paginalijst (zo linken)
/kamers · /kamers/rose-quartz · /kamers/clear-quartz · /kamers/sunstone · /kamers/moonstone · /kamers/amethyst · /pottery-house · /wellness · /ontbijt-info · /agenda · /agenda/sound-bath · /agenda/raku-avond · /agenda/kerstmarkt · /agenda/kerstkommen-workshop · /agenda/kerstavond-brunch · /agenda/kerstbrunch · /agenda/oudejaar · /agenda/retreatdag · /retreats · /therapy · /shop · /cadeaubon · /over-ons · /omgeving · /omgeving/alden-biesen · /omgeving/tongeren · /omgeving/hasselt · /omgeving/maastricht · /omgeving/haspengouw-fietsen · /faq · /praktisch · /contact · /reviews · /privacy · /cookies · /algemene-voorwaarden · /en · /fr

## Schema per paginatype
- Kamer: `HotelRoom` + `Offer` (price, priceCurrency EUR, availability InStock) + `occupancy`.
- Pottery/wellness/ontbijt: `Service` of `Product` met `Offer`.
- Event: `Event` met startDate (ISO), location (Place met PostalAddress), offers, eventStatus EventScheduled, organizer.
- FAQ: `FAQPage`. Contact/over ons: `Hotel` (LocalBusiness) met adres, geo 50.873, 5.518, openingHours, sameAs leeg laten.
- Reviews: alleen `Review`-schema op echte reviews; op de demo-pagina géén aggregateRating en een duidelijke vermelding dat dit voorbeeldreviews zijn.

## Afbeeldingen in /img
ame-1 ame-2 ame-bad ame-detail clear-1 clear-2 clear-detail lounge lounge2 moon-1 moon-balkon moon-detail ontbijt-classic ontbijt-green ontbijt-med pottery rose-1 rose-bad rose-detail rose-handdoek rose-kristal shop sun-1 sun-3 sun-bad sun-bad2 sun-douche sun-handdoek sun-kristal terras villa-avond villa-pool villa-poort wellness (allemaal .jpg) · logo_a.png · logo_full.png

## Oplevering
Schrijf je bestanden, controleer dat elk bestand valide HTML is (geen open tags, exact één h1, geen placeholders in HOOFDLETTERS), en rapporteer kort: welke bestanden, woordenaantal per pagina, welk schema, en open punten.
