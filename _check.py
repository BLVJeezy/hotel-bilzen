#!/usr/bin/env python3
"""Controleert alle subpagina's: placeholders, h1, title/meta, schema, links, afbeeldingen, woorden."""
import re,os,sys,json,glob
from html.parser import HTMLParser
ROOT='/home/claude/hotel-bilzen'
SKIP={'index.html','ontbijt.html','_template.html'}
pages=[p for p in glob.glob(ROOT+'/**/*.html',recursive=True) if not any(s in p for s in ['/ops/','/portaal/','/node_modules/','/vid/','/qr/'])]
pages=[p for p in pages if os.path.basename(p) not in SKIP or p.count('/')>len(ROOT.split('/'))]
pages=[p for p in pages if p!=ROOT+'/index.html' and p!=ROOT+'/ontbijt.html' and p!=ROOT+'/_template.html']
imgs={os.path.basename(f) for f in glob.glob(ROOT+'/img/*')}
known=set()
for p in pages:
  rel=p[len(ROOT):];rel=rel[:-5];rel=re.sub(r'/index$','',rel) or '/';known.add(rel)
known|={'/','/#boeken','/#kamers','/portaal/','/portaal/#kalender','/portaal/#home','/portaal/#boekingen','/ontbijt','/ops/','/admin'}
class T(HTMLParser):
  def __init__(s):super().__init__();s.text=[];s.skip=0;s.h1=0;s.imgs=[];s.links=[];s.title='';s.inT=False;s.meta='';s.ld=[];s.inLD=False;s.lazy=0;s.noalt=0
  def handle_starttag(s,t,a):
    a=dict(a)
    if t in('script','style'):s.skip+=1
    if t=='script' and a.get('type')=='application/ld+json':s.inLD=True
    if t=='h1':s.h1+=1
    if t=='title':s.inT=True
    if t=='meta' and a.get('name')=='description':s.meta=a.get('content','')
    if t=='img':
      s.imgs.append(a.get('src',''));
      if 'alt' not in a:s.noalt+=1
      if a.get('loading')=='lazy':s.lazy+=1
    if t=='a' and a.get('href'):s.links.append(a['href'])
    for k in('style',):
      if k in a:
        for m in re.findall(r"url\('?([^')]+)'?\)",a[k]):s.imgs.append(m)
  def handle_endtag(s,t):
    if t in('script','style'):s.skip-=1;s.inLD=False
    if t=='title':s.inT=False
  def handle_data(s,d):
    if s.inT:s.title+=d
    elif s.inLD:s.ld.append(d)
    elif not s.skip:s.text.append(d)
rows=[];bad=0
for p in sorted(pages):
  src=open(p,encoding='utf-8').read();t=T();t.feed(src)
  rel=p[len(ROOT):];issues=[]
  words=len(re.findall(r"\w+",' '.join(t.text)))
  ph=re.findall(r"\b(PAGINATITEL|META BESCHRIJVING|BOVENTITEL|INLEIDING|HERO\.jpg|/PAD\b)",src)
  if ph:issues.append('placeholders:'+','.join(sorted(set(ph))))
  if t.h1!=1:issues.append(f'h1={t.h1}')
  if not t.title.strip():issues.append('no title')
  elif len(t.title.strip())>65:issues.append(f'title {len(t.title.strip())}ch')
  if not(120<=len(t.meta)<=175):issues.append(f'meta {len(t.meta)}ch')
  if 'rel="canonical"' not in src:issues.append('no canonical')
  if '/css/site.css' not in src:issues.append('no site.css')
  if 'site.js' not in src:issues.append('no site.js')
  types=[]
  for l in t.ld:
    try:
      j=json.loads(l);js=j if isinstance(j,list) else [j]
      for x in js:
        if '@graph' in x:
          for y in x['@graph']:types.append(str(y.get('@type')))
        else:types.append(str(x.get('@type')))
    except Exception as e:issues.append('bad json-ld')
  if 'BreadcrumbList' not in types:issues.append('no breadcrumb schema')
  minw=350 if any(k in rel for k in['privacy','cookies','voorwaarden']) else 420
  if words<minw:issues.append(f'thin {words}w')
  for i in t.imgs:
    b=os.path.basename(i.split('?')[0])
    if i.startswith('http'):issues.append('ext img '+i[:40])
    elif b and b not in imgs and not b.endswith('.png'):issues.append('missing img '+b)
  if t.noalt:issues.append(f'{t.noalt} img no alt')
  dead=[]
  for h in t.links:
    if h.startswith(('http','mailto:','tel:','#','javascript')):continue
    h0=h.split('#')[0].split('?')[0].rstrip('/') or '/'
    if h0 not in known and h0+'/' not in known and not os.path.exists(ROOT+h0) and not os.path.exists(ROOT+h0+'.html') and not os.path.exists(ROOT+h0+'/index.html'):dead.append(h)
  if dead:issues.append('dead:'+','.join(sorted(set(dead))[:6]))
  internal=len({h for h in t.links if h.startswith('/') and not h.startswith('/img')})
  if internal<4:issues.append(f'only {internal} internal links')
  if issues:bad+=1
  rows.append((rel,words,','.join(sorted(set(types)-{'BreadcrumbList'})) or '-',issues))
for r in rows:print(f"{'OK ' if not r[3] else 'XX '}{r[0]:38} {r[1]:5}w  {r[2][:34]:34} {'; '.join(r[3])}")
print(f"\n{len(rows)} pagina's, {bad} met opmerkingen")
sys.exit(1 if bad else 0)
