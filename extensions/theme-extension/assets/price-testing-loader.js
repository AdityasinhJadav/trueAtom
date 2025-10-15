(function () {
  try {
    var s = document.createElement('script');
    // App Proxy path → forwards to your app's /app/proxy/* routes
    s.src = '/apps/proxy/script';
    s.defer = true;
    s.onload = function(){ try { console.debug('[TrueAtoms] Proxy script loaded'); } catch {} };
    s.onerror = function(e){ try { console.error('[TrueAtoms] Proxy script failed', e); } catch {} };
    try { console.debug('[TrueAtoms] Injecting proxy script', s.src); } catch {}
    document.head.appendChild(s);
  } catch (e) {}
})();


