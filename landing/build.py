import math, random, base64, re
W,H=1600,520
def ridge(base,amp,freqs,seed):
    random.seed(seed); ph=[random.uniform(0,6.28) for _ in freqs]; pts=[]
    for x in range(-80,W+81,16):
        y=base
        for (f,a),p in zip(freqs,ph): y-=amp*a*math.sin(x/W*math.pi*2*f+p)
        pts.append((x,round(y,1)))
    return 'M-80 %d '%(H+40)+' '.join('L%d %s'%(x,y) for x,y in pts)+' L%d %d Z'%(W+80,H+40), pts
L=[(235,44,[(1.3,1),(3.1,.35),(7,.12)],1,'#e4e8d8','r1'),(295,40,[(1.1,1),(2.7,.4),(6,.15)],2,'#c9d0b5','r1'),
   (355,36,[(.9,1),(2.3,.45),(5.5,.18)],3,'#a3b08d','r2'),(425,30,[(.7,1),(1.9,.4),(4.6,.16)],5,'#253217','')]
paths=[];front=None
for b,a,f,s,c,cls in L:
    d,pts=ridge(b,a,f,s); paths.append('<path class="%s" d="%s" fill="%s"/>'%(cls,d,c)); front=pts
trail='M'+' L'.join('%d %s'%(x,round(y+30,1)) for x,y in front[::-1])
walk=''.join('<circle r="%s" fill="#f6f4ec"><animateMotion dur="80s" repeatCount="indefinite" begin="-%ss"><mpath href="#trail-%%(L)s"/></animateMotion></circle>'%(6 if i%3 else 7, round(30+i*2.4,1)) for i in range(11))
svg=('<svg class="ridges%%(M)s" viewBox="0 140 1600 380" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">%s<path id="trail-%%(L)s" d="%s" fill="none" stroke="#a3b08d" stroke-width="2" stroke-dasharray="1 11" stroke-linecap="round" opacity=".55"/>%s</svg>'%(''.join(paths),trail,walk))
src=open('src.html',encoding='utf8').read()
extra_css='.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}\n.ridges.mirror{transform:scaleX(-1)}\n'
src=src.replace('</style>',extra_css+'</style>',1)
he=open('he.html',encoding='utf8').read().replace('__RIDGES__',svg%{'M':'','L':'he'})
en=open('en.html',encoding='utf8').read().replace('__RIDGES__',svg%{'M':' mirror','L':'en'})
page=src.replace('__HE__',he).replace('__EN__',en)
page=page.replace('bar.setAttribute("aria-hidden",st.hero||st.don||st.close)','var off=st.hero||st.don||st.close;bar.setAttribute("aria-hidden",off);bar.inert=off')
std=('<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
     +page[:page.index('</style>')]+'[hidden]{display:none!important}body{margin:0}\n</style>\n</head>\n<body>\n'+page[page.index('</style>')+8:]+'\n</body>\n</html>\n')
open('index.html','w',encoding='utf8').write(std.replace('__LOGO__','logo.webp'))
logo='data:image/webp;base64,'+base64.b64encode(open('logo.webp','rb').read()).decode()
open('artifact.html','w',encoding='utf8').write(page.replace('__LOGO__',logo))
print('ok',len(std),len(page))
