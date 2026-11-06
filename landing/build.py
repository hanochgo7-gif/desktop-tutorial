import math, random, base64, os
W,H=1600,520
def ridge(base,amp,freqs,seed):
    random.seed(seed); ph=[random.uniform(0,6.28) for _ in freqs]; pts=[]
    for x in range(-80,W+81,16):
        y=base
        for (f,a),p in zip(freqs,ph): y-=amp*a*math.sin(x/W*math.pi*2*f+p)
        pts.append((x,round(y,1)))
    return 'M-80 %d '%(H+40)+' '.join('L%d %s'%(x,y) for x,y in pts)+' L%d %d Z'%(W+80,H+40)
front=ridge(470,26,[(.7,1),(1.9,.4),(4.6,.16)],5)
FRONT='<svg class="front" viewBox="0 420 1600 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="%s" fill="#2c3a1c"/></svg>'%front
VISTA={'he':('','איור','איור בצבעי מים: שיירת הולכים זעירה על רכס בנגב'),'en':(' mirror','Illustration','Watercolor illustration: a small line of hikers on a Negev ridge')}
def vista(L):
    m,il,alt=VISTA[L]
    return '<div class="vista%s"><img class="paint" src="__A_hero__" alt="%s" width="2000" height="857" fetchpriority="high"><span class="illus">%s</span>%s</div>'%(m,alt,il,FRONT)
src=open('src.html',encoding='utf8').read()
extra_css='.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}\n'
if '.sr{' not in src: src=src.replace('</style>',extra_css+'</style>',1)
he=open('he.html',encoding='utf8').read().replace('__RIDGES__',vista('he'))
en=open('en.html',encoding='utf8').read().replace('__RIDGES__',vista('en'))
page=src.replace('__HE__',he).replace('__EN__',en)
page=page.replace('bar.setAttribute("aria-hidden",st.hero||st.don||st.close)','var off=st.hero||st.don||st.close;bar.setAttribute("aria-hidden",off);bar.inert=off')
assets={'hero':'assets/hero.webp','fire':'assets/fire.webp','topo':'assets/topo.webp','i-journey':'assets/i-journey.svg','i-family':'assets/i-family.svg','i-compass':'assets/i-compass.svg','i-home':'assets/i-home.svg','favicon':'assets/favicon.png','team':'assets/team.webp','journey':'assets/journey.webp','ridge':'assets/ridge.webp','gather':'assets/gather.webp'}
def fill(p,mode):
    for k,v in assets.items():
        if mode=='file': rep=v
        else:
            mime='image/webp' if v.endswith('.webp') else ('image/png' if v.endswith('.png') else 'image/svg+xml')
            rep='data:%s;base64,%s'%(mime,base64.b64encode(open(v,'rb').read()).decode())
        p=p.replace('__A_%s__'%k,rep)
    logo='logo.webp' if mode=='file' else 'data:image/webp;base64,'+base64.b64encode(open('logo.webp','rb').read()).decode()
    return p.replace('__LOGO__',logo)
i=page.index('</style>')
std=('<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
     +page[:i]+'[hidden]{display:none!important}body{margin:0}\n</style>\n</head>\n<body>\n'+page[i+8:]+'\n</body>\n</html>\n')
# --- security hardening for the standalone page (index.html only; the Claude artifact host injects its own scripts) ---
import hashlib
FRAMEGUARD='(function(){if(window.top!==window.self){document.documentElement.style.display="none";try{window.top.location.replace(window.location.href)}catch(e){}}})();'
std=std.replace('<meta name="viewport"','<meta name="referrer" content="strict-origin-when-cross-origin">\n__CSP__\n<script>'+FRAMEGUARD+'</script>\n<meta name="viewport"',1)
def csp_for(html):
    hs=sorted(set("'sha256-%s'"%base64.b64encode(hashlib.sha256(m.encode('utf8')).digest()).decode() for m in re.findall(r'<script>(.*?)</script>',html,flags=re.S)))
    pol=["default-src 'none'","script-src "+' '.join(hs),"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com","font-src https://fonts.gstatic.com","img-src 'self' data:","connect-src 'none'","media-src 'none'","object-src 'none'","frame-src 'none'","worker-src 'none'","manifest-src 'none'","base-uri 'none'","form-action 'none'","upgrade-insecure-requests"]
    return '<meta http-equiv="Content-Security-Policy" content="%s">'%'; '.join(pol)
import re
out=fill(std,'file')
out=out.replace('__CSP__',csp_for(out),1)
assert len(re.findall(r'<script',out))==2 and 'src=' not in ''.join(re.findall(r'<script[^>]*>',out))
open('index.html','w',encoding='utf8').write(out)
import re
def d64(path,mime): return 'data:%s;base64,%s'%(mime,base64.b64encode(open(path,'rb').read()).decode())
art=page
art=re.sub(r'<img class="paint" src="__A_hero__" alt="([^"]*)"[^>]*>',r'<div class="paint bg-hero" role="img" aria-label="\1"></div>',art)
art=re.sub(r'<img class="paint" src="__A_team__" alt="([^"]*)"[^>]*>',r'<div class="paint bg-team" role="img" aria-label="\\1"></div>',art)
art=re.sub(r'<img class="paint" src="__A_fire__" alt="([^"]*)"[^>]*>',r'<div class="paint bg-fire" role="img" aria-label="\1"></div>',art)
def logo_rep(m):
    alt=m.group(1)
    return '<span class="logo-img" role="img" aria-label="%s"></span>'%alt if alt else '<span class="logo-img" aria-hidden="true"></span>'
art=re.sub(r'<img src="__LOGO__" alt="([^"]*)"[^>]*>',logo_rep,art)
bgcss=('.bg-hero{background:url(%s) 18%% 78%%/cover no-repeat}.bg-fire{background:url(%s) center 82%%/cover no-repeat}'
       '.bg-team{background:url(%s) center/cover no-repeat}.logo-img{display:inline-block;flex:none;aspect-ratio:640/489;background:url(%s) center/contain no-repeat}'
       '.brand .logo-img{width:50px}.medal .logo-img{display:block;width:min(340px,80vw);filter:drop-shadow(0 20px 34px rgba(37,50,23,.2))}\n')%(d64('assets/hero.webp','image/webp'),d64('assets/fire.webp','image/webp'),d64('assets/team.webp','image/webp'),d64('logo.webp','image/webp'))
art=art.replace('</style>',bgcss+'</style>',1)
open('artifact.html','w',encoding='utf8').write(fill(art,'data'))
print('ok',os.path.getsize('index.html'),os.path.getsize('artifact.html'))
