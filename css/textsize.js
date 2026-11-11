// Villa Amano · grotere letters (toegankelijkheid). Niveaus: normaal → groot → extra groot. Bewaard per bezoeker.
(function(){
 if(window.__vats)return;window.__vats=1;
 var L=[1,1.15,1.3],N=['Normaal','Groot','Extra groot'],K='va_ts',lv=0;
 try{lv=Math.max(0,Math.min(2,+localStorage.getItem(K)||0))}catch(e){}
 var st=document.createElement('style');
 st.textContent='html.vats-1 body{zoom:1.15}html.vats-2 body{zoom:1.3}html.vats-1 #vats,html.vats-1 #mp,html.vats-1 #dock,html.vats-1 .rt-bar{zoom:.8696}html.vats-2 #vats,html.vats-2 #mp,html.vats-2 #dock,html.vats-2 .rt-bar{zoom:.7692}'+
 '#vats{position:fixed;z-index:70;right:16px;bottom:calc(100px + env(safe-area-inset-bottom));display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 16px;border-radius:999px;border:1px solid #e6b86677;background:#14100de6;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:#f6dfa4;font:500 14px "Jost",system-ui,sans-serif;cursor:pointer;box-shadow:0 10px 30px #0009;font-size:15px}'+
 '#vats b{font:500 22px/1 "Cormorant Garamond",Georgia,serif;letter-spacing:0}#vats b i{font-style:normal;font-size:15px}#vats span{font-weight:400}'+
 '#vats:focus-visible{outline:2px solid #f6dfa4;outline-offset:3px}'+
 '@media(min-width:900px){#vats{right:24px;bottom:24px}}';
 document.head.appendChild(st);
 function apply(){var h=document.documentElement;h.classList.remove('vats-1','vats-2');if(lv)h.classList.add('vats-'+lv);
  if(b){b.querySelector('span').textContent=lv?'Letters: '+N[lv]:'Grotere letters';b.setAttribute('aria-label','Tekstgrootte wijzigen. Nu: '+N[lv]);b.setAttribute('aria-pressed',lv?'true':'false')}}
 var b=document.createElement('button');b.id='vats';b.type='button';b.innerHTML='<b>A<i>A</i></b><span></span>';
 b.onclick=function(){lv=(lv+1)%3;try{localStorage.setItem(K,lv)}catch(e){}apply()};
 function mount(){document.body.appendChild(b);apply()}
 apply();document.body?mount():document.addEventListener('DOMContentLoaded',mount);
})();
