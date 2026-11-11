// Villa Amano · snelle boek-pop-up (kamer voorgeselecteerd). Gebruik: VABook.open('rose')
(function(){
 if(window.VABook)return;
 const RM={rose:{n:'Rose Quartz',p:225,max:2,tag:'Max. 2 personen',img:'rose-1',t:'#e8a0b0'},clear:{n:'Clear Quartz',p:225,max:2,tag:'Max. 2 personen',img:'clear-1',t:'#cfe3ee'},sun:{n:'Sunstone',p:225,max:2,tag:'Max. 2 personen',img:'sun-1',t:'#e6b866'},moon:{n:'Moonstone',p:235,max:2,tag:'Max. 2 · privébalkon',img:'moon-1',t:'#9fb8e6'},amethyst:{n:'Amethyst',p:245,max:3,tag:'Max. 3 · zetelbed op aanvraag',img:'ame-1',t:'#b48ce6'}};
 const X=[['ontbijt','Ontbijt','€ 25 p.p. per ochtend',(g,n)=>25*g*n],['well','Wellness-moment','€ 35 p.p. · privé sauna & stoombad',(g,n)=>35*g],['bike','E-bike','€ 45 p.p. per dag',(g,n)=>45*g*n],['late','Late check-out','€ 45 · blijf tot 13:00',(g,n)=>45]];
 const SLOTS=['10:00','13:00','16:00','19:00'];
 const fmt=v=>'€ '+v.toLocaleString('nl-BE');const iso=d=>d.toISOString().slice(0,10);
 const nice=s=>new Date(s+'T12:00').toLocaleDateString('nl-BE',{weekday:'short',day:'numeric',month:'short'});
 const addD=(s,n)=>{const d=new Date(s+'T12:00');d.setDate(d.getDate()+n);return iso(d)};
 const css=`
#vab{position:fixed;inset:0;z-index:1000;display:none}#vab.open{display:block}
#vab label,#vab label *,#vab button,#vab select,#vab small,#vab b{text-transform:none!important;letter-spacing:normal!important}
#vab .vlb{text-transform:uppercase!important;letter-spacing:.16em!important}
#vab .vbd{position:absolute;inset:0;background:#0a0807cc;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .3s}
#vab.show .vbd{opacity:1}
#vab .vdl{position:absolute;left:50%;top:50%;width:min(580px,calc(100vw - 32px));max-height:min(92vh,880px);transform:translate(-50%,-46%) scale(.97);opacity:0;transition:.32s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;border-radius:26px;border:1px solid color-mix(in srgb,var(--vt,#e6b866) 40%,#ffffff1a);background:linear-gradient(160deg,color-mix(in srgb,var(--vt,#e6b866) 9%,#1a1512),#14100d);box-shadow:0 40px 120px #000b;color:#efe6d6;font-family:'Jost',system-ui,sans-serif;overflow:hidden}
#vab.show .vdl{transform:translate(-50%,-50%);opacity:1}
#vab .vhd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 18px 8px 22px}
#vab .vhd h3{font:300 28px/1.1 'Cormorant Garamond',Georgia,serif;margin:0}
#vab .vhd small{display:block;color:#a99b88;font-size:12px;margin-top:3px;letter-spacing:.04em}
#vab .vx{flex:none;width:44px;height:44px;border-radius:50%;border:1px solid #ffffff2e;background:#ffffff10;color:#fff;font-size:22px;line-height:1;cursor:pointer;display:grid;place-items:center}
#vab .vx:hover{background:#ffffff22}
#vab .vbdy{overflow:auto;padding:6px 22px 14px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
#vab .vlb{font:500 11px 'Jost',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--vt,#e6b866);margin:16px 0 8px;display:block}
#vab .vrooms{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;margin:0 -22px;padding:0 22px 4px}#vab .vrooms::-webkit-scrollbar{display:none}
#vab .vrc{flex:none;width:92px;border:1px solid #ffffff1f;border-radius:14px;background:#ffffff08;color:#efe6d6;padding:5px;cursor:pointer;text-align:left;font-family:inherit;transition:.2s}
#vab .vrc img{width:100%;height:56px;object-fit:cover;border-radius:10px;display:block}
#vab .vrc b{display:block;font:400 12.5px 'Jost',sans-serif;margin:5px 3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#vab .vrc span{display:block;font-size:11px;color:#a99b88;margin:0 3px 2px}
#vab .vrc.on{border-color:var(--vt);background:color-mix(in srgb,var(--vt) 16%,#ffffff08);box-shadow:0 0 0 1px var(--vt)}
#vab .vg2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}#vab .vst b{white-space:nowrap;font-size:13.5px;min-width:0;flex:1}
#vab .vf{display:block}#vab .vf span{display:block;text-transform:none;letter-spacing:normal;font-size:11.5px;color:#a99b88;margin:0 0 5px}
#vab input[type=date],#vab input[type=text],#vab input[type=email],#vab input[type=tel],#vab input[type=password],#vab select{width:100%;height:48px;border-radius:12px;border:1px solid #ffffff22;background:#120f0d;color:#efe6d6;padding:0 14px;font:300 15px 'Jost',sans-serif;outline:none;color-scheme:dark}
#vab input:focus,#vab select:focus{border-color:#e6b866}
#vab .vst{display:flex;align-items:center;justify-content:space-between;height:48px;border:1px solid #ffffff22;border-radius:12px;background:#120f0d;padding:0 6px}
#vab .vst b{font:400 16px 'Jost',sans-serif;min-width:70px;text-align:center}
#vab .vst button{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid #ffffff2a;background:#ffffff10;color:#fff;font-size:20px;cursor:pointer}
#vab .vst button:disabled{opacity:.3}
#vab .vopt{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid #ffffff1a;border-radius:14px;margin-bottom:8px;cursor:pointer;background:#ffffff06;transition:.2s}
#vab .vopt:has(input:checked){border-color:var(--vt);background:color-mix(in srgb,var(--vt) 12%,#ffffff06)}
#vab .vopt input{accent-color:#e6b866;width:20px;height:20px;flex:none}
#vab .vopt b{font:400 14.5px 'Jost',sans-serif;display:block}#vab .vopt small{color:#a99b88;font-size:12px}
#vab .vsub{margin:-2px 0 8px 32px;display:none}#vab .vsub.on{display:grid}
#vab .vav{font-size:13px;margin-top:12px;min-height:18px}#vab .vav .vok{color:#9fd8a8}#vab .vav .vno{color:#f3c0c0}#vab .vav .vck{color:#a99b88}
#vab .vft{border-top:1px solid #ffffff14;padding:14px 22px calc(16px + env(safe-area-inset-bottom));background:#110d0be6;display:flex;align-items:center;gap:14px}
#vab .vtt{flex:1;min-width:0}#vab .vtt b{display:block;font:400 24px 'Cormorant Garamond',Georgia,serif;color:#f6dfa4;line-height:1}#vab .vtt small{color:#a99b88;font-size:12px}
#vab .vgo{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:10px;height:54px;padding:0 26px;border:0;border-radius:999px;cursor:pointer;font:500 15px 'Jost',sans-serif;color:#24180e;background:linear-gradient(120deg,#f6dfa4,#e6b866 55%,#c98d3e);box-shadow:0 10px 30px #e6b86640}
#vab .vgo:disabled{filter:grayscale(.7) brightness(.55);cursor:not-allowed;box-shadow:none}
#vab .vfine{font-size:11.5px;color:#8f8272;margin:10px 0 0;text-align:center}
#vab .vcl{display:block;margin:10px auto 0;background:none;border:0;color:#a99b88;font:300 13px 'Jost',sans-serif;text-decoration:underline;cursor:pointer;padding:8px}
#vab .vau{display:grid;gap:10px}#vab .vau b{font:300 24px 'Cormorant Garamond',Georgia,serif}#vab .vau small{color:#a99b88;margin-top:-6px}
#vab .ver{color:#f3c0c0;font-size:13px}#vab .ver:empty{display:none}
#vab .vsw{background:none;border:0;color:#f6dfa4;font:300 13px 'Jost',sans-serif;text-decoration:underline;cursor:pointer;padding:6px}
#vab .vtl{display:flex;justify-content:space-between;font-size:13.5px;color:#cfc3b0;margin:3px 0}
.cf-book{position:absolute;z-index:4;right:18px;bottom:16px;display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 18px;border:0;border-radius:999px;cursor:pointer;font:500 14px 'Jost',sans-serif;color:#24180e;background:linear-gradient(120deg,#f6dfa4,#e6b866 55%,#c98d3e);box-shadow:0 8px 24px #e6b86645;opacity:0;pointer-events:none;transition:.4s}
.cf-card.on .cf-book{opacity:1;pointer-events:auto}.cf-book:hover{filter:brightness(1.07)}.cf-book svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.6}
.bk-q{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 18px;border:0;border-radius:999px;cursor:pointer;font:500 13.5px 'Jost',sans-serif;color:#24180e;background:linear-gradient(120deg,#f6dfa4,#e6b866 55%,#c98d3e)}
@media(max-width:640px){
 #vab .dl{left:0;right:0;top:auto;bottom:0;width:100%;max-height:94vh;max-height:94dvh;border-radius:26px 26px 0 0;transform:translateY(40px);border-bottom:0}
 #vab.show .dl{transform:none}
 #vab .hd{position:relative;padding-top:24px}#vab .hd:before{content:'';position:absolute;top:9px;left:50%;width:42px;height:4px;margin-left:-21px;border-radius:4px;background:#ffffff33}
 #vab .hd h3{font-size:26px}#vab .go{padding:0 22px}
}
@media(prefers-reduced-motion:reduce){#vab .dl,#vab .bd{transition:none}}
.vab-lock{overflow:hidden}`;
 (function(){const st=document.createElement('style');st.textContent=css;document.head.appendChild(st)})();
 let root,S,AV=null,T=null,mode='register',lastFocus;
 const $=s=>root.querySelector(s);
 function ensure(){if(root)return;
  root=document.createElement('div');root.id='vab';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Reserveer je verblijf');
  root.innerHTML='<div class="vbd" data-c></div><div class="vdl" id="vabDl"></div>';document.body.appendChild(root);
  root.addEventListener('click',e=>{if(e.target.closest('[data-c]'))close()});
  addEventListener('keydown',e=>{if(root.classList.contains('open')&&e.key==='Escape')close()});
  fetch('/api/availability').then(r=>r.json()).then(j=>{AV=j.rooms||{};if(S)calc()}).catch(()=>{AV={};if(S)calc()})}
 const busy=(id,f,t)=>AV&&((AV[id]||[]).some(([a,b])=>a<t&&b>f));
 function open(id){ensure();if(!RM[id])id='rose';try{T=localStorage.getItem('va_g_t')}catch(e){T=null}
  const t0=new Date(),d1=iso(new Date(t0.getTime()+14*864e5));
  S={room:id,from:d1,n:2,g:2,x:{},pot:false,potDate:null,potTime:'16:00',step:'form'};
  lastFocus=document.activeElement;render();root.classList.add('open');document.documentElement.classList.add('vab-lock');document.body.classList.add('vab-lock');
  requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('show')));setTimeout(()=>{const b=$('.vx');b&&b.focus()},350)}
 function close(){if(!root)return;root.classList.remove('show');setTimeout(()=>{root.classList.remove('open');document.documentElement.classList.remove('vab-lock');document.body.classList.remove('vab-lock');lastFocus&&lastFocus.focus&&lastFocus.focus()},300)}
 function render(){const R=RM[S.room];const dl=$('#vabDl');dl.style.setProperty('--vt',R.t);root.style.setProperty('--vt',R.t);
  S.g=Math.min(S.g,R.max);
  const sd=S.potDate||S.from;
  dl.innerHTML=`<div class="vhd"><div><h3>${R.n}</h3><small>${R.tag} · ${fmt(R.p)} per nacht</small></div><button class="vx" data-c aria-label="Sluiten">×</button></div>
  <div class="vbdy" id="vbody">
   <span class="vlb">Kamer</span><div class="vrooms">${Object.entries(RM).map(([k,r])=>`<button type="button" class="vrc${k===S.room?' on':''}" data-room="${k}" style="--vt:${r.t}"><img src="/img/${r.img}.jpg" alt="" loading="lazy"><b>${r.n}</b><span>${fmt(r.p)}</span></button>`).join('')}</div>
   <span class="vlb">Verblijf</span>
   <div class="vg2"><label class="vf"><span>Aankomst</span><input type="date" id="vIn" value="${S.from}" min="${iso(new Date())}"></label>
    <div class="vf"><span>Aantal nachten</span><div class="vst"><button type="button" data-n="-1" aria-label="Minder nachten">−</button><b id="vN"></b><button type="button" data-n="1" aria-label="Meer nachten">+</button></div></div></div>
   <div class="vg2" style="margin-top:10px"><div class="vf"><span>Gasten (max. ${R.max})</span><div class="vst"><button type="button" data-g="-1" aria-label="Minder gasten">−</button><b id="vG"></b><button type="button" data-g="1" aria-label="Meer gasten">+</button></div></div>
    <div class="vf"><span>Vertrek</span><div class="vst" style="justify-content:center"><b id="vOut" style="font-size:14px"></b></div></div></div>
   <div class="vav" id="vAv"></div>
   <span class="vlb">Extra's bij je verblijf</span>
   ${X.map(([k,l,s])=>`<label class="vopt"><input type="checkbox" data-x="${k}" ${S.x[k]?'checked':''}><span><b>${l}</b><small>${s}</small></span></label>`).join('')}
   <span class="vlb">Workshop</span>
   <label class="vopt"><input type="checkbox" id="vPot" ${S.pot?'checked':''}><span><b>Pottery House: vrij atelier</b><small>€ 30 p.p. · draai je eigen stuk, open tot 22:00</small></span></label>
   <div class="vsub vg2 ${S.pot?'on':''}" id="vPotSub"><label class="vf"><span>Dag</span><select id="vPD"></select></label><label class="vf"><span>Tijdstip</span><select id="vPT">${SLOTS.map(t=>`<option ${t===S.potTime?'selected':''}>${t}</option>`).join('')}</select></label></div>
   <p class="vfine">Je betaalt nu niets. Gratis annuleren tot 48 u vooraf. Check-in 15–21 u · check-out 11 u.</p>
   <div id="vAuth"></div>
   <button class="vcl" data-c>Sluiten</button>
  </div>
  <div class="vft"><div class="vtt"><b id="vTot"></b><small id="vTs"></small></div><button class="vgo" id="vGo">Reserveer <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12h15M13 6l6 6-6 6"/></svg></button></div>`;
  dl.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>{S.room=b.dataset.room;const sc=$('#vbody').scrollTop;render();$('#vbody').scrollTop=sc});
  const rr=dl.querySelector('.vrc.on');rr&&rr.scrollIntoView({inline:'center',block:'nearest'});
  $('#vIn').onchange=e=>{S.from=e.target.value||S.from;S.potDate=null;calc()};
  dl.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{S.n=Math.max(1,Math.min(14,S.n+ +b.dataset.n));calc()});
  dl.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{S.g=Math.max(1,Math.min(R.max,S.g+ +b.dataset.g));calc()});
  dl.querySelectorAll('[data-x]').forEach(c=>c.onchange=()=>{S.x[c.dataset.x]=c.checked;calc()});
  $('#vPot').onchange=e=>{S.pot=e.target.checked;$('#vPotSub').classList.toggle('on',S.pot);calc()};
  $('#vPD').onchange=e=>{S.potDate=e.target.value;calc()};$('#vPT').onchange=e=>{S.potTime=e.target.value};
  $('#vGo').onclick=go;calc()}
 function calc(){const R=RM[S.room],out=addD(S.from,S.n),n=S.n;S.to=out;
  $('#vN').textContent=n+(n>1?' nachten':' nacht');$('#vG').textContent=S.g+(S.g>1?' gasten':' gast');$('#vOut').textContent=nice(out);
  const pd=$('#vPD');const days=Array.from({length:n},(_,i)=>addD(S.from,i));if(!S.potDate||!days.includes(S.potDate))S.potDate=days[Math.min(1,n-1)];pd.innerHTML=days.map(d=>`<option value="${d}" ${d===S.potDate?'selected':''}>${nice(d)}</option>`).join('');
  const base=R.p*n;let ex=0;X.forEach(([k,,,f])=>{if(S.x[k])ex+=f(S.g,n)});const pot=S.pot?30*S.g:0,tot=base+ex+pot;
  const av=$('#vAv'),bz=busy(S.room,S.from,out);
  av.innerHTML=AV===null?'<span class="vck">Beschikbaarheid controleren…</span>':bz?'<span class="vno">Niet beschikbaar op deze data. Kies andere data of een andere kamer hierboven.</span>':`<span class="vok">● Beschikbaar · ${nice(S.from)} → ${nice(out)}</span>`;
  $('#vTot').textContent=fmt(tot);$('#vTs').textContent=`${n} nacht${n>1?'en':''} · ${S.g} gast${S.g>1?'en':''}${ex+pot?' · incl. extra\'s':''}`;
  $('#vGo').disabled=AV===null||bz;dl_st();return !(AV===null||bz)}
 function dl_st(){const d=$('#vabDl');d.querySelector('[data-n="-1"]').disabled=S.n<=1;d.querySelector('[data-g="-1"]').disabled=S.g<=1;d.querySelector('[data-g="1"]').disabled=S.g>=RM[S.room].max}
 const api=(a,b,t)=>fetch('/api/ops?a='+a,{method:'POST',headers:{'content-type':'application/json',...(t?{authorization:'Bearer '+t}:{})},body:JSON.stringify(b)}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||'Er ging iets mis'),{status:r.status});return j});
 async function reserve(tok){if(!calc())return;const go=$('#vGo');go.disabled=true;go.textContent='Even geduld…';
  try{const r=await api('g-reserve',{kind:'room',room:S.room,from:S.from,to:S.to,guests:S.g,extras:{ontbijt:!!S.x.ontbijt,well:!!S.x.well,bike:!!S.x.bike,late:!!S.x.late}},tok);
   if(S.pot){try{await api('g-reserve',{kind:'pottery',date:S.potDate,time:S.potTime,guests:S.g},tok)}catch(e){}}
   location.href='/portaal/?nieuw='+r.reservation.id}
  catch(e){go.disabled=false;go.textContent='Reserveer';if(e.status===401){try{localStorage.removeItem('va_g_t')}catch(x){}T=null;auth()}else{const a=$('#vAuth');a.innerHTML=`<div class="ver">${e.message}</div>`}}}
 function go(){if(!calc())return;if(T)reserve(T);else auth()}
 function auth(){const a=$('#vAuth');a.innerHTML=`<div class="vau" style="margin-top:14px"><b>${mode==='register'?'Maak je account':'Log in'}</b><small>${mode==='register'?'Nodig om te reserveren. Duurt 10 seconden.':'Welkom terug.'}</small>
   ${mode==='register'?'<input type="text" name="name" placeholder="Voor- en achternaam" autocomplete="name">':''}<input type="email" name="email" placeholder="E-mail" autocomplete="email" inputmode="email">${mode==='register'?'<input type="tel" name="phone" placeholder="Telefoon" autocomplete="tel">':''}<input type="password" name="password" placeholder="Wachtwoord (min. 6 tekens)" autocomplete="${mode==='register'?'new-password':'current-password'}">
   <div class="ver" id="vAe"></div><button class="vgo" id="vAg" style="width:100%">${mode==='register'?'Account aanmaken & reserveren':'Inloggen & reserveren'}</button><button class="vsw" id="vSw">${mode==='register'?'Al een account? Log in':'Nog geen account? Maak er een'}</button></div>`;
  a.scrollIntoView({behavior:'smooth',block:'center'});
  $('#vSw').onclick=()=>{mode=mode==='register'?'login':'register';auth()};
  $('#vAg').onclick=async()=>{const g=n=>{const i=a.querySelector(`[name=${n}]`);return i?i.value.trim():''};const b=$('#vAg');b.disabled=true;
   try{const r=await api(mode==='register'?'g-register':'g-login',{name:g('name'),email:g('email'),phone:g('phone'),password:g('password')});T=r.token;try{localStorage.setItem('va_g_t',T)}catch(x){}a.innerHTML='';reserve(T)}
   catch(e){b.disabled=false;$('#vAe').textContent=e.message;if(e.status===409){mode='login';auth();$('#vAe').textContent='Dit e-mailadres heeft al een account. Log in.'}}}}
 window.VABook={open,close};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-book]');if(b){e.preventDefault();open(b.dataset.book)}});
})();
