// Villa Amano · ontbijtkeuze bij het boeken: menu's tonen, nu kiezen (mee betalen) of later (nog niets aangerekend)
(function(){
 if(window.VABf)return;
 let M=null,waiters=[];
 const FALL=[{id:'classic',name:'Amano Classic',tag:'Meest gekozen',price:25,items:['Croissant & zuurdesembrood','Roerei of zachtgekookt ei','Verse jus & koffie of thee']},{id:'green',name:'Green & Light',tag:'Vegetarisch',price:25,items:['Griekse yoghurt & granola','Avocado op zuurdesem','Groene smoothie']},{id:'med',name:'Ibiza Sunrise',tag:'Mediterraan',price:28,items:['Shakshuka met feta','Hummus, olijven & pita','Glas cava inbegrepen']}];
 fetch('/api/ops?a=menus').then(r=>r.json()).then(j=>{M=(j.menus||[]).filter(m=>m.active);if(!M.length)M=FALL}).catch(()=>{M=FALL}).then(()=>{waiters.forEach(f=>f());waiters=[]});
 const st=document.createElement('style');st.textContent=`
.vbf{margin:-2px 0 10px;padding:14px;border:1px solid #e6b86655;border-radius:16px;background:#e6b8660d;font-family:'Jost',system-ui,sans-serif;color:#efe6d6}
.vbf-t{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;border-radius:999px;background:#0000004d;margin-bottom:12px}
.vbf-t button{height:40px;border:0;border-radius:999px;background:none;color:#a99b88;font:400 14px 'Jost',sans-serif;cursor:pointer;text-transform:none;letter-spacing:0}
.vbf-t button.on{background:linear-gradient(120deg,#f6dfa4,#e6b866 55%,#c98d3e);color:#24180e;font-weight:500}
.vbf-m{display:grid;gap:8px}
.vbf-c{display:grid;grid-template-columns:76px 1fr auto;gap:12px;align-items:center;padding:8px;border-radius:14px;border:1px solid #ffffff1c;background:#ffffff08;color:inherit;text-align:left;cursor:pointer;width:100%;font-family:inherit;text-transform:none;letter-spacing:0}
.vbf-c img{width:76px;height:64px;object-fit:cover;border-radius:10px;display:block}
.vbf-c b{display:block;font:400 15px 'Jost',sans-serif}.vbf-c small{display:block;color:#a99b88;font-size:12px;line-height:1.35}
.vbf-c em{font-style:normal;color:#e6b866;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase}
.vbf-c .pr{font:400 16px 'Cormorant Garamond',Georgia,serif;color:#f6dfa4;white-space:nowrap;padding-right:4px}
.vbf-c.on{border-color:#e6b866;background:#e6b8661f;box-shadow:0 0 0 1px #e6b866}
.vbf-c.ro{cursor:default;opacity:.85}
.vbf-n{font-size:12.5px;color:#a99b88;margin:10px 2px 0;line-height:1.45}.vbf-n b{color:#f6dfa4;font-weight:400}`;
 document.head.appendChild(st);
 const menu=s=>(M||FALL).find(m=>m.id===s.bfMenu)||(M||FALL)[0];
 window.VABf={
  cost(s){return s.x&&s.x.ontbijt&&s.bf!=='later'?menu(s).price:0},
  payload(s){const now=!!(s.x&&s.x.ontbijt)&&s.bf!=='later';return {ontbijt:now,bfMenu:now?menu(s).id:null}},
  // host: element waarin het paneel komt; s: state met x.ontbijt, bf, bfMenu; change: herbereken totaal
  mount(host,s,change){
   const draw=()=>{if(!(s.x&&s.x.ontbijt)){host.innerHTML='';return}
    if(!s.bf)s.bf='now';const L=M||FALL;if(!s.bfMenu||!L.some(m=>m.id===s.bfMenu))s.bfMenu=L[0].id;const now=s.bf==='now';
    host.innerHTML=`<div class="vbf"><div class="vbf-t"><button type="button" data-bf="now" class="${now?'on':''}">Nu kiezen</button><button type="button" data-bf="later" class="${now?'':'on'}">Later kiezen</button></div>
    <div class="vbf-m">${L.map(m=>`<button type="button" class="vbf-c ${now&&m.id===s.bfMenu?'on':''} ${now?'':'ro'}" data-m="${m.id}"><img src="/img/ontbijt-${m.id}.jpg" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span><em>${m.tag||''}</em><b>${m.name}</b><small>${(m.items||[]).slice(0,3).join(' · ')}</small></span><span class="pr">€ ${m.price}</span></button>`).join('')}</div>
    <p class="vbf-n">${now?`<b>${menu(s).name}</b> voor elke gast, elke ochtend. Je betaalt het samen met je verblijf. Het uur kies je later in je portaal.`:'Dit zijn onze menu’s. Je kiest en betaalt je ontbijt later in je portaal. <b>Nu wordt er niets voor aangerekend.</b>'}</p></div>`;
    host.querySelectorAll('[data-bf]').forEach(b=>b.onclick=()=>{s.bf=b.dataset.bf;draw();change()});
    host.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{if(s.bf!=='now')return;s.bfMenu=b.dataset.m;draw();change()})};
   draw();if(!M)waiters.push(()=>{if(host.isConnected){draw();change()}});return draw}};
})();
