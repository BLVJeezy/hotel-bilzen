import glob,os,re,datetime
R='/home/claude/hotel-bilzen';B='https://hotel-bilzen.vercel.app'
skip=('/ops/','/portaal/','/_template','/ontbijt.html','/qr/','/vid/')
urls=[]
for p in sorted(glob.glob(R+'/**/*.html',recursive=True)):
  rel=p[len(R):]
  if any(s in rel for s in skip):continue
  u=re.sub(r'/index\.html$','/',rel);u=re.sub(r'\.html$','',u)
  if u=='/':pr,cf='1.0','weekly'
  elif u.startswith('/kamers') or u in('/pottery-house','/wellness','/agenda'):pr,cf='0.9','weekly'
  elif u.startswith('/agenda/'):pr,cf='0.7','weekly'
  elif u in('/privacy','/cookies','/algemene-voorwaarden'):pr,cf='0.2','yearly'
  else:pr,cf='0.6','monthly'
  urls.append((u,pr,cf))
today=datetime.date.today().isoformat()
hl=lambda u:('<xhtml:link rel="alternate" hreflang="nl" href="%s/"/><xhtml:link rel="alternate" hreflang="en" href="%s/en"/><xhtml:link rel="alternate" hreflang="fr" href="%s/fr"/>'%(B,B,B)) if u in('/','/en','/fr') else ''
x='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
for u,pr,cf in urls:x+=f'  <url><loc>{B}{u if u!="/" else "/"}</loc><lastmod>{today}</lastmod><changefreq>{cf}</changefreq><priority>{pr}</priority>{hl(u)}</url>\n'
x+='</urlset>\n';open(R+'/sitemap.xml','w').write(x);print(len(urls),'urls')
