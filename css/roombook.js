// Villa Amano · kamerkop met video + reservatiekaart (Booking/Airbnb-stijl)
(function(){
 const el=document.getElementById('roomTop');if(!el)return;
 const R={id:el.dataset.room,name:el.dataset.name,no:el.dataset.no,stone:el.dataset.stone,p:+el.dataset.price,max:+el.dataset.max,tint:el.dataset.tint,gal:el.dataset.gal.split(','),tag:el.dataset.tag||''};
 const X=[['ontbijt','Ontbijt','€ 25 p.p. per ochtend',(g,n)=>25*g*n],['well','Wellness-moment','€ 35 p.p. · 2 uur',(g,n)=>35*g],['bike','E-bike','€ 45 p.p. per dag',(g,n)=>45*g*n],['late','Late check-out','€ 45 · tot 13:00',(g,n)=>45]];
 const fmt=v=>'€ '+v.toLocaleString('nl-BE');const iso=d=>d.toISOString().slice(0,10);
 const t0=new Date();t0.setHours(12);const d1=new Date(t0);d1.setDate(d1.getDate()+14);const d2=new Date(d1);d2.setDate(d2.getDate()+2);
 const st={from:iso(d1),to:iso(d2),g:2,x:{}};let AV=null,T=null;try{T=localStorage.getItem('va_g_t')}catch(e){}
 const nice=s=>new Date(s+'T12:00').toLocaleDateString('nl-BE',{weekday:'short',day:'numeric',month:'short'});
 el.innerHTML=`<div class="rt-media">
   <div class="rt-vid"><video id="rtV" autoplay muted loop playsinline preload="metadata" poster="/vid/room-${R.id}-poster.jpg"><source src="/vid/room-${R.id}.mp4" type="video/mp4"></video>
    <span class="rt-badge">Kamer ${R.no} · ${R.stone}</span><button class="rt-snd" id="rtPlay" aria-label="Pauzeer video">❚❚</button></div>
   <div class="rt-thumbs" id="rtThumbs">${R.gal.map((g,i)=>`<button data-i="${i}" aria-label="Foto ${i+1}"><img src="/img/${g}.jpg" alt="" loading="lazy"></button>`).join('')}</div>
  </div>
  <aside class="rt-card" style="--t:${R.tint}">
   <nav class="crumbs"><a href="/">Home</a><span>/</span><a href="/kamers">Kamers</a><span>/</span>${R.name}</nav>
   <h1>${R.name}</h1><div class="rt-sub">${R.tag} · Bilzen-Hoeselt</div>
   <div class="rt-price"><b>${fmt(R.p)}</b><span>per nacht</span></div>
   <div class="rt-dates"><label><span>Aankomst</span><input type="date" id="rtIn" value="${st.from}" min="${iso(t0)}"></label><label><span>Vertrek</span><input type="date" id="rtOut" value="${st.to}" min="${st.from}"></label></div>
   <div class="rt-row"><div><span>Gasten</span><small>max. ${R.max}</small></div><div class="rt-step"><button type="button" data-s="-1" aria-label="Minder">−</button><b id="rtG">2</b><button type="button" data-s="1" aria-label="Meer">+</button></div></div>
   <details class="rt-x"><summary>Extra's toevoegen <i id="rtXn"></i></summary>${X.map(([k,l,s])=>`<label class="rt-xi"><input type="checkbox" data-x="${k}"><span><b>${l}</b><small>${s}</small></span></label>`).join('')}</details>
   <div class="rt-av" id="rtAv"></div>
   <div class="rt-tot" id="rtTot"></div>
   <button class="btn gold rt-go" id="rtGo">Reserveer <svg viewBox="0 0 24 24"><use href="#arrow"/></svg></button>
   <p class="rt-fine">Je betaalt nog niets. Gratis annuleren tot 48 u vooraf. Check-in 15–21 u · check-out 11 u.</p>
   <div class="rt-auth" id="rtAuth" hidden></div>
  </aside>
  <div class="rt-bar" id="rtBar"><div><b>${fmt(R.p)}</b><small>per nacht · <span id="rtBarN"></span></small></div><button class="btn gold" id="rtBarGo">Reserveer</button></div>`;
 const q=s=>el.querySelector(s);
 // media
 const v=q('#rtV'),pb=q('#rtPlay');pb.onclick=()=>{if(v.paused){v.play();pb.textContent='❚❚'}else{v.pause();pb.textContent='▶'}};
 q('#rtThumbs').onclick=e=>{const b=e.target.closest('button');if(!b)return;const vid=q('.rt-vid');let im=vid.querySelector('img.rt-still');if(!im){im=document.createElement('img');im.className='rt-still';im.alt=R.name;vid.appendChild(im);const x=document.createElement('button');x.className='rt-back';x.textContent='▶ Video';x.onclick=()=>{im.remove();x.remove();v.play()};vid.appendChild(x)}im.src='/img/'+R.gal[+b.dataset.i]+'.jpg';v.pause()};
 // availability
 fetch('/api/availability').then(r=>r.json()).then(j=>{AV=(j.rooms||{})[R.id]||[];calc()}).catch(()=>{AV=[];calc()});
 const busy=(f,t)=>AV&&AV.some(([a,b])=>a<t&&b>f);
 function calc(){const n=Math.round((new Date(st.to)-new Date(st.from))/864e5);const ok=n>0;
  q('#rtOut').min=st.from;q('#rtG').textContent=st.g;q('#rtXn').textContent=Object.values(st.x).filter(Boolean).length?'· '+Object.values(st.x).filter(Boolean).length:'';
  const base=ok?R.p*n:0;let ex=0;X.forEach(([k,,,f])=>{if(st.x[k])ex+=f(st.g,Math.max(1,n))});const tot=base+ex;
  q('#rtTot').innerHTML=ok?`<div><span>${fmt(R.p)} × ${n} nacht${n>1?'en':''}</span><span>${fmt(base)}</span></div>${ex?`<div><span>Extra's</span><span>${fmt(ex)}</span></div>`:''}<div class="rt-sum"><span>Totaal</span><span>${fmt(tot)}</span></div>`:'<div class="rt-err">Kies een vertrekdatum na je aankomst.</div>';
  const av=q('#rtAv');if(!ok)av.innerHTML='';else if(AV===null)av.innerHTML='<span class="rt-chk">Beschikbaarheid controleren…</span>';else if(busy(st.from,st.to))av.innerHTML='<span class="rt-no">Niet beschikbaar op deze data. Kies andere data of een <a href="/kamers">andere kamer</a>.</span>';else av.innerHTML=`<span class="rt-ok">● Beschikbaar · ${nice(st.from)} → ${nice(st.to)}</span>`;
  const can=ok&&AV!==null&&!busy(st.from,st.to);q('#rtGo').disabled=!can;q('#rtBarGo').disabled=!can;q('#rtBarN').textContent=ok?`${n} nacht${n>1?'en':''} · ${fmt(tot)}`:'kies je data';return {n,tot,can}}
 q('#rtIn').onchange=e=>{st.from=e.target.value;if(st.to<=st.from){const d=new Date(st.from+'T12:00');d.setDate(d.getDate()+1);st.to=iso(d);q('#rtOut').value=st.to}calc()};
 q('#rtOut').onchange=e=>{st.to=e.target.value;calc()};
 el.querySelectorAll('.rt-step button').forEach(b=>b.onclick=()=>{st.g=Math.min(R.max,Math.max(1,st.g+ +b.dataset.s));calc()});
 el.querySelectorAll('[data-x]').forEach(c=>c.onchange=()=>{st.x[c.dataset.x]=c.checked;calc()});
 // booking
 const api=(a,b,t)=>fetch('/api/ops?a='+a,{method:'POST',headers:{'content-type':'application/json',...(t?{authorization:'Bearer '+t}:{})},body:JSON.stringify(b)}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||'Er ging iets mis'),{status:r.status});return j});
 async function reserve(tok){const {can}=calc();if(!can)return;const go=q('#rtGo');go.disabled=true;go.textContent='Even geduld…';
  try{const r=await api('g-reserve',{kind:'room',room:R.id,from:st.from,to:st.to,guests:st.g,extras:{ontbijt:!!st.x.ontbijt,well:!!st.x.well,bike:!!st.x.bike,late:!!st.x.late}},tok);location.href='/portaal/?nieuw='+r.reservation.id}
  catch(e){go.disabled=false;go.innerHTML='Reserveer <svg viewBox="0 0 24 24"><use href="#arrow"/></svg>';if(e.status===401){try{localStorage.removeItem('va_g_t')}catch(x){}T=null;auth()}else alert(e.message)}}
 let mode='register';
 function auth(){const a=q('#rtAuth');a.hidden=false;a.innerHTML=`<div class="rt-au"><b>${mode==='register'?'Maak je account':'Log in'}</b><small>${mode==='register'?'Nodig om te reserveren. Duurt 10 seconden.':'Welkom terug.'}</small>
   ${mode==='register'?'<input name="name" placeholder="Voor- en achternaam" autocomplete="name">':''}<input name="email" type="email" placeholder="E-mail" autocomplete="email" inputmode="email">${mode==='register'?'<input name="phone" type="tel" placeholder="Telefoon" autocomplete="tel">':''}<input name="password" type="password" placeholder="Wachtwoord (min. 6 tekens)" autocomplete="${mode==='register'?'new-password':'current-password'}">
   <div class="rt-aerr" id="rtAerr"></div><button class="btn gold" id="rtAgo">${mode==='register'?'Account aanmaken & reserveren':'Inloggen & reserveren'}</button>
   <button class="rt-sw" id="rtSw">${mode==='register'?'Al een account? Log in':'Nog geen account? Maak er een'}</button></div>`;
  a.scrollIntoView({behavior:'smooth',block:'center'});
  q('#rtSw').onclick=()=>{mode=mode==='register'?'login':'register';auth()};
  q('#rtAgo').onclick=async()=>{const g=n=>{const i=a.querySelector(`[name=${n}]`);return i?i.value.trim():''};const b=q('#rtAgo');b.disabled=true;
   try{const r=await api(mode==='register'?'g-register':'g-login',{name:g('name'),email:g('email'),phone:g('phone'),password:g('password')});T=r.token;try{localStorage.setItem('va_g_t',T)}catch(x){}a.hidden=true;reserve(T)}
   catch(e){b.disabled=false;q('#rtAerr').textContent=e.message;if(e.status===409){mode='login';auth();q('#rtAerr').textContent='Dit e-mailadres heeft al een account. Log in.'}}}}
 const go=()=>{if(T)reserve(T);else auth()};q('#rtGo').onclick=go;q('#rtBarGo').onclick=()=>{if(matchMedia('(max-width:900px)').matches){q('.rt-card').scrollIntoView({behavior:'smooth',block:'start'});setTimeout(go,400)}else go()};
 // sticky bar visibility on mobile
 const bar=q('#rtBar');new IntersectionObserver(es=>{bar.classList.toggle('show',!es[0].isIntersecting)},{threshold:0}).observe(q('#rtGo'));
 calc();
})();
