// Villa Amano · gedeeld gedrag voor subpagina's
(function(){
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.1});
 document.querySelectorAll('.rv').forEach((el,i)=>{el.style.transitionDelay=(i%4)*90+'ms';io.observe(el)});
 const d=document.getElementById('drawer');window.drawer=o=>{if(!d)return;d.classList.toggle('open',o);document.body.style.overflow=o?'hidden':''};
 const p=location.pathname.replace(/\/$/,'')||'/';document.querySelectorAll('.mainnav a,.dr-nav a').forEach(a=>{const h=a.getAttribute('href').replace(/\/$/,'')||'/';if(h!=='/'&&p.startsWith(h))a.classList.add('on')});
 // cookie banner
 let c=null;try{c=localStorage.getItem('va_ck')}catch(e){}
 if(!c){const b=document.createElement('div');b.className='ck show';b.innerHTML='<p>We gebruiken alleen noodzakelijke cookies en, als je dat goedvindt, anonieme statistieken. <a href="/cookies" style="color:var(--gold2)">Meer info</a></p><div class="b"><button id="ckNo">Alleen nodig</button><button class="ok" id="ckOk">Akkoord</button></div>';document.body.appendChild(b);
  const set=v=>{try{localStorage.setItem('va_ck',v)}catch(e){}b.remove()};b.querySelector('#ckOk').onclick=()=>set('all');b.querySelector('#ckNo').onclick=()=>set('min')}
})();
