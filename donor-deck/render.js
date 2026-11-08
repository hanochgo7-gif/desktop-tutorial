const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:900}});
await p.goto('file://'+__dirname+'/build/deck.html',{waitUntil:'load'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
await p.pdf({path:__dirname+'/build/deck.pdf',width:'1600px',height:'900px',printBackground:true,preferCSSPageSize:true});
const n=await p.evaluate(()=>document.querySelectorAll('.s').length);
for(let i=0;i<n;i++){const el=(await p.$$('.s'))[i];await el.screenshot({path:__dirname+'/build/s'+(i+1)+'.png'});}
const ov=await p.evaluate(()=>[...document.querySelectorAll('.s')].map((s,i)=>{const r=s.getBoundingClientRect();const bad=[...s.querySelectorAll('.c,figure,ul,p,h2')].filter(e=>{const q=e.getBoundingClientRect();return q.bottom>r.bottom-80&&!e.closest('.foot')&&!e.classList.contains('src')});return bad.length?i+1:0}).filter(Boolean));
console.log('overflow slides:',ov);await b.close()})();
