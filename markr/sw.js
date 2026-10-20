/* Markr offline support for the installed (home-screen) app.
   The app opens at once from the copy saved on the device, whatever the network is doing; a fresh copy is
   fetched in the background and, when it differs, saved for the next launch and the open app is told
   (it reloads itself the next time it goes to the background with nothing unsaved).
   The first visit, with nothing saved yet, comes from the network. An error page is never saved.
   Icons and other files open from the cache and refresh in the background. */
const V='markr-v2';
const SHELL=['./','index.html','manifest.webmanifest','brand/apple-touch-icon.png','brand/icon-192.png','brand/icon-512.png','brand/favicon.svg','brand/favicon-32.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!=='markr-meta').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
/* when a new version was saved: the open app compares this time with the time it started */
const tell=()=>caches.open('markr-meta').then(c=>c.put('updated',new Response(String(Date.now())))).then(()=>self.clients.matchAll({includeUncontrolled:true,type:'window'})).then(cs=>cs.forEach(c=>c.postMessage({type:'markr-updated'})));
function page(e,done){
  return caches.open(V).then(c=>c.match('index.html').then(old=>{
    const was=old&&old.clone();
    const net=fetch(e.request.url,{cache:'no-cache',credentials:'same-origin'}).then(async res=>{
      if(res.ok){const fresh=res.clone();
        if(!old)await c.put('index.html',fresh);
        else{const [a,b]=await Promise.all([was.text(),fresh.clone().text()]);if(a!==b){await c.put('index.html',fresh);await tell()}}}
      return res});
    net.then(done,done);
    if(old)return old;
    return net.then(res=>res.ok?res:caches.match('index.html').then(m=>m||res),()=>caches.match('index.html'));
  })).catch(()=>{done();return fetch(e.request)});
}
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url),same=u.origin===location.origin;
  if(r.mode==='navigate'||(same&&/\/(index\.html)?$/.test(u.pathname))){let done;e.waitUntil(new Promise(f=>{done=f}));e.respondWith(page(e,done));return}
  if(same||/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(u.hostname)){
    e.respondWith(caches.open(V).then(c=>c.match(r).then(m=>{
      const net=fetch(r).then(res=>{if(res.ok||res.type==='opaque')c.put(r,res.clone());return res}).catch(()=>m);
      if(m)try{e.waitUntil(net.catch(()=>{}))}catch(_){}return m||net})))}
});
