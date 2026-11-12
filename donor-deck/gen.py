import os
D=os.path.dirname(os.path.abspath(__file__)); L='/home/user/desktop-tutorial/landing'; IG=os.path.join(os.path.dirname(D),'ig')
fonts=open(L+'/assets/fonts/fonts.css').read().replace('url(assets/fonts/','url(file://'+L+'/assets/fonts/')
P={'hug':D+'/opt/hug.jpg','meadow':D+'/opt/meadow.jpg','lone':D+'/opt/lone.jpg','rows':D+'/opt/rows.jpg','fire':D+'/opt/fire.jpg',
   'logo':L+'/logo.webp','topo':L+'/assets/topo.webp','midot':L+'/assets/midot-seal.png','yehiam':D+'/opt/yehiam.jpg','idith':D+'/opt/idith.jpg','qr':D+'/qr.svg'}
u=lambda k:'file://'+P[k]
JG='https://www.jgive.com/new/en/usd/collect/donation-targets/163449/amount'
CSS='''%s
@page{size:1600px 900px;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#1c2612}
body{font-family:Assistant,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
.s{position:relative;width:1600px;height:900px;overflow:hidden;page-break-after:always;break-after:page}
.dark{background:#1c2612}.deep{background:#253217}.ivory{background:#f6f4ec;color:#1d2218}
.bg{position:absolute;inset:0;background-size:cover;background-position:center}
.topo{position:absolute;inset:0;background:url(%s) center/cover;opacity:.14;mix-blend-mode:screen}
.shadeL{position:absolute;inset:0;background:linear-gradient(90deg,rgba(14,20,9,.94) 0%%,rgba(14,20,9,.82) 38%%,rgba(14,20,9,.25) 66%%,rgba(14,20,9,.1) 100%%)}
.shadeB{position:absolute;inset:0;background:linear-gradient(0deg,rgba(14,20,9,.95) 0%%,rgba(14,20,9,.7) 34%%,rgba(14,20,9,.1) 62%%,rgba(14,20,9,.2) 100%%)}
.c{position:absolute;left:96px;right:96px}
.kick{display:inline-block;font:800 20px Assistant;letter-spacing:.14em;text-transform:uppercase;color:#e9dca4;margin-bottom:22px}
.ivory .kick{color:#75682f}
h1{font-family:"Frank Ruhl Libre",serif;font-weight:900;font-size:96px;line-height:1.02;letter-spacing:-.01em}
h2{font-family:"Frank Ruhl Libre",serif;font-weight:900;font-size:68px;line-height:1.06}
h1 em,h2 em{font-style:normal;color:#e9dca4}.ivory h1 em,.ivory h2 em{color:#75682f}
p.b{font-size:30px;line-height:1.48;color:#e7ecdb;margin-top:24px;max-width:30em}
.ivory p.b{color:#3a4230}
p.b strong{color:#fff}.ivory p.b strong{color:#1d2218}
.tag{position:absolute;top:28px;right:32px;font:700 16px Assistant;color:#1d2218;background:rgba(255,253,246,.9);padding:5px 14px;border-radius:999px;z-index:3}
.foot{position:absolute;left:96px;right:96px;bottom:34px;display:flex;justify-content:space-between;align-items:center;font:700 18px Assistant;color:rgba(231,236,219,.7);z-index:3}
.ivory .foot{color:#6b715f}
.foot .brand{display:flex;align-items:center;gap:12px}.foot img{height:44px;border-radius:50%%;background:#f6f4ec;padding:2px}
.big{font-family:"Frank Ruhl Libre",serif;font-weight:900;line-height:.86;color:#e9dca4}
.src{font-size:17px;color:rgba(231,236,219,.65);margin-top:22px}.ivory .src{color:#6b715f}
.src a{color:inherit}
ul.pts{list-style:none;margin-top:26px;display:grid;gap:14px}
ul.pts li{font-size:27px;line-height:1.4;padding-left:34px;position:relative;color:#e7ecdb}
ul.pts li::before{content:"";position:absolute;left:0;top:.5em;width:14px;height:14px;border-radius:50%%;background:#e9dca4}
.ivory ul.pts li{color:#1d2218}.ivory ul.pts li::before{background:#75682f}
a{color:#e9dca4}
'''%(fonts,'file://'+P['topo'])
def foot(i,n,cls=''):
    return '<div class="foot"><div class="brand"><img src="%s" alt="">Sayeret Nahal Alumni Association</div><div>%02d / %02d</div></div>'%(u('logo'),i,n)
S=[]
# 1 cover
S.append(('dark','<div class="bg" style="background-image:url(%s);background-position:center 62%%"></div><div class="shadeL"></div><div class="c" style="top:150px;max-width:900px"><span class="kick">Sayeret Nahal Alumni Association · Israel</span><h1>One team.<br>One journey.<br><em>Together.</em></h1><p class="b">They served side by side. They came home side by side. Now they need help carrying it, side by side.</p></div>'%u('hug')))
# 2 what happened
S.append(('dark','<div class="bg" style="background-image:url(%s);background-position:center 62%%"></div><div class="shadeL"></div><span class="tag">Illustration</span><div class="c" style="top:130px;max-width:930px"><span class="kick">What happened</span><h2>They fought together.<br><em>They came home carrying it.</em></h2><ul class="pts"><li><strong style="color:#e9dca4">108</strong> of the unit\'s soldiers have fallen since it was founded, 49 of them since October 7, 2023, from its top command to its youngest fighters.</li><li><strong style="color:#e9dca4">Dozens</strong> were wounded. Some are still in rehabilitation.</li><li><strong style="color:#e9dca4">Whole teams</strong> evacuated their wounded friends, then came home.</li><li><strong style="color:#e9dca4">Tens of thousands</strong> of reserve-duty days, away from home, family and work.</li></ul></div>'%u('lone')))
# 3 why now
S.append(('deep','<div class="topo"></div><div class="c" style="top:170px;display:grid;grid-template-columns:600px 1fr;gap:80px;align-items:center"><div><p class="big" style="font-size:190px">+150%</p><p class="b" style="margin-top:18px"><strong>rise in demand for mental health care.</strong></p></div><div><span class="kick">Why now</span><h2>Often, it surfaces <em>months later.</em></h2><p class="b">Back in everyday life, combat experiences return. The fighting may pause; the need does not. The hardest part is still ahead.</p></div></div><p class="src c" style="bottom:100px">Source: association figures, 2026.</p>'))
# 4 the link
S.append(('dark','<div class="bg" style="background-image:url(%s);background-position:60%% 70%%"></div><div class="shadeL"></div><div class="c" style="top:96px;max-width:1300px"><span class="kick">Why us</span><h2>Someone who knows them <em>reaches out first.</em></h2><p class="b" style="max-width:900px">The state does a great deal, but help only works if a veteran walks in, and many never go looking. We know our alumni face to face. We notice, reach out first, and stay with them until they reach the right help.</p><p class="b" style="font-family:\'Frank Ruhl Libre\',serif;font-weight:700;font-size:34px;color:#fff;border-left:5px solid #e9dca4;padding-left:24px;margin-top:34px">Sometimes, to accept help, you need someone who knows you to reach out.</p>__NATIONAL__</div>'%u('meadow')))
# 5 the journey
S.append(('ivory','<div class="c" style="top:50%%;transform:translateY(-56%%);display:grid;grid-template-columns:1fr 600px;gap:64px;align-items:center"><div><span class="kick">The team journey</span><h2>15 to 20 fighters.<br><em>One team. One journey.</em></h2><p class="b">A team that served together goes on a journey with mental health professionals, shaped around its needs: room to process, grow stronger and keep going together.</p><p class="b"><strong>58 teams completed a journey in 2025 and 2026.</strong></p></div><figure style="margin:0"><img src="%s" style="width:600px;height:338px;object-fit:cover;border-radius:22px;display:block;box-shadow:0 24px 50px rgba(0,0,0,.18)" alt=""><figcaption style="margin-top:14px;font-size:20px;line-height:1.45;color:#3a4230"><strong style="color:#1d2218">Yehiam Bedihi</strong>, a team commander in the unit (reserves), on his team\'s processing journey. Video, 1:12.</figcaption></figure></div>'%u('yehiam')))
# 6 the ask
S.append(('dark','<div class="bg" style="background-image:url(%s);background-position:center 65%%"></div><div class="shadeL"></div><span class="tag">Illustration</span><div class="c" style="top:100px;max-width:1260px"><span class="kick">The ask</span><h2>25 teams are scheduled for 2027.<br><em>They are waiting for funding.</em></h2><div style="display:flex;gap:26px;margin-top:40px">__ASKCARDS__</div><p class="b" style="margin-top:30px">Fund one fighter, or send a whole team.</p></div>'%u('rows')))
# 7 trust
S.append(('ivory','<div class="c" style="top:50%%;transform:translateY(-56%%);display:grid;grid-template-columns:1fr 520px;gap:64px;align-items:start"><div><span class="kick">Trust</span><h2>Verified. Transparent.<br><em>Run by volunteers.</em></h2><div style="display:flex;gap:30px;align-items:center;margin-top:30px"><img src="%s" style="width:170px" alt=""><ul class="pts" style="margin:0"><li>Midot Seal of Effectiveness, valid to 03/2028</li><li>Certificate of Proper Management 2026</li><li>Full financial reports on GuideStar Israel</li><li>A volunteer board of six and a part-time CEO</li><li>More than 30 years serving the Sayeret community</li></ul></div><p class="src" style="font-size:19px;margin-top:26px">The association also supports bereaved families, the wounded, lone soldiers, reservists\' families, and 650+ veterans a year in career transition. Gifts through this deck fund the team journeys.</p></div><figure style="margin:0"><img src="%s" style="width:520px;height:292px;object-fit:cover;border-radius:22px;display:block" alt=""><figcaption style="margin-top:14px;font-size:20px;line-height:1.45;color:#3a4230"><strong style="color:#1d2218">Idith Feffer</strong>, whose son Yoav fell in Gaza, in a video message to donors. Video, 2:33.</figcaption></figure></div>'%(u('midot'),u('idith'))))
# 8 CTA
S.append(('dark','<div class="bg" style="background-image:url(%s);background-position:center 62%%"></div><div class="shadeL"></div><span class="tag">Illustration</span><div class="c" style="top:90px;display:grid;grid-template-columns:1fr 330px;gap:60px;align-items:start"><div><span class="kick">Stand beside them</span><h2>Send a team <em>on its journey.</em></h2><p class="b" style="font-size:28px"><strong>Give through Jgive: one-time or monthly, in USD or GBP.</strong><br><a href="%s">Give on Jgive (opens in English, USD)</a></p><p class="b" style="font-size:22px;color:#d6dcc6;margin-top:16px"><strong style="color:#e9dca4">Tax-deductible under 501(c)(3)</strong> for gifts in USD: Friends of Asor Fund USA, Jgive\'s US entity, emails the receipt. GBP gifts receive a UK receipt. Choose the currency before you pay. Please confirm with your tax advisor.</p><div style="margin-top:30px;padding:22px 26px;border:2px solid rgba(233,220,164,.55);border-radius:18px;background:rgba(14,20,9,.45)"><p style="font:800 26px Assistant;color:#fff">Thinking of funding a whole team or more?</p><p style="font-size:22px;line-height:1.45;color:#e7ecdb;margin-top:6px">Talk with our CEO, Lt. Col. (Res.) Hezki Malachi. He can arrange a video call or a meeting with the fighters.<br><a href="https://wa.me/972507347952">+972-50-734-7952</a> · <a href="mailto:hezki.m@gmail.com">hezki.m@gmail.com</a></p></div></div><div style="text-align:center"><a href="%s"><img src="%s" style="width:330px;height:330px;border-radius:18px;display:block" alt="QR code to give on Jgive"></a><p style="font:700 20px Assistant;color:#e9dca4;margin-top:14px">Scan to give</p></div></div><p class="src c" style="bottom:96px">Sayeret Nahal Alumni Association (Meginei HaYanshuf), registered Israeli non-profit 580218642.</p>'%(u('fire'),JG,JG,u('qr'))))
CARD='<div style="flex:1;padding:24px 26px;border:2px solid rgba(233,220,164,.5);border-radius:18px;background:rgba(14,20,9,.55)"><p class="big" style="font-size:%dpx">%s</p><p style="font-size:22px;line-height:1.4;color:#e7ecdb;margin-top:12px">%s</p></div>'
ASK=CARD%(104,'25','teams scheduled for 2027, waiting for funding')+CARD%(88,'$10,000','one team\'s full journey (₪30,000)')+CARD%(88,'$42–56','a month for a year funds one fighter ($500–$670)')
NATIONAL=('<div style="margin-top:30px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:1300px">'
 +''.join('<div style="padding:14px 16px;border-radius:14px;background:rgba(14,20,9,.72);border:1px solid rgba(233,220,164,.35)"><p style="font-family:\'Frank Ruhl Libre\',serif;font-weight:900;font-size:34px;color:#e9dca4;line-height:1">%s</p><p style="font-size:16px;line-height:1.4;color:#e7ecdb;margin-top:6px">%s <a href="%s" style="color:#bcc5a8">%s</a></p></div>'%x for x in [
  ('42,500 of 91,200','people treated by the Defense Ministry\'s rehabilitation system have mental health conditions or post-traumatic stress.','https://www.ynetnews.com/article/h1vhlszsml','Ynet, 6 Oct 2026'),
  ('Up to 6 months','wait for a psychiatric evaluation at the ministry\'s rehabilitation department, as of June 2026.','https://www.ynetnews.com/article/h1ixqfmzfg','Ynet, 8 Jun 2026'),
  ('1 : 850','one caseworker for about 850 injured people, the ministry told the Knesset Health Committee.','https://www.timesofisrael.com/liveblog_entry/defense-ministry-says-it-faces-massive-shortage-of-therapists-to-treat-soldiers-with-ptsd/','Times of Israel, 9 Feb 2026')])
 +'</div><p style="font-size:15px;color:rgba(231,236,219,.7);margin-top:8px">National Defense Ministry figures for all of Israel, not for our unit alone.</p>')
html='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Sayeret Nahal: One team. One journey.</title><style>%s</style></head><body>'%CSS
n=len(S)
for i,(cls,body) in enumerate(S,1):
    body=body.replace('__ASKCARDS__',ASK).replace('__NATIONAL__',NATIONAL)
    html+='<section class="s %s">%s%s</section>'%(cls,body,foot(i,n))
html+='</body></html>'
open(D+'/build/deck.html','w').write(html);print(n)
