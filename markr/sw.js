/* Markr offline support for the installed (home-screen) app.
   The page tries the network first, so updates arrive on the next launch. If the network is slow
   (more than 3 seconds) or gives an error, the last good copy opens from the cache instead.
   Icons and other files open from the cache and refresh in the background. */
const V='markr-v2';
const SHELL=['./','index.html','manifest.webmanifest','brand/apple-touch-icon.png','brand/icon-192.png','brand/icon-512.png','brand/favicon.svg','brand/favicon-32.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
function page(r){
  const net=fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put('index.html',cp))}return res});
  return caches.match('index.html').then(old=>{
    if(!old)return net;
    const slow=new Promise(ok=>setTimeout(()=>ok(old),3000));
    return Promise.race([net.then(res=>res.ok?res:old,()=>old),slow]);
  });
}
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url),same=u.origin===location.origin;
  if(r.mode==='navigate'||(same&&/\/(index\.html)?$/.test(u.pathname))){e.respondWith(page(r));return}
  if(same||/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(u.hostname)){
    e.respondWith(caches.open(V).then(c=>c.match(r).then(m=>{
      const net=fetch(r).then(res=>{if(res.ok||res.type==='opaque')c.put(r,res.clone());return res}).catch(()=>m);
      if(m)try{e.waitUntil(net.catch(()=>{}))}catch(_){}return m||net})))}
});
