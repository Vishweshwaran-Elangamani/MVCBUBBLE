using System;
using BubbleApp.Common.ViewModels.Snippet;
using BubbleApp.Core.IService;
using BubbleApp.Data.IRepository;

namespace BubbleApp.Core.Service
{
    public class SnippetService : ISnippetService
    {
        private readonly IWorkspaceRepository _workspaces;

        public SnippetService(IWorkspaceRepository workspaces)
            => _workspaces = workspaces;

        public SnippetResponse Generate(string workspaceSlug, Uri widgetCdnUrl, Uri apiBaseUrl)
        {
            var ws = _workspaces
                .GetBySlugAsync(workspaceSlug)
                .GetAwaiter()
                .GetResult()
                ?? throw new InvalidOperationException($"Workspace '{workspaceSlug}' not found.");

            var workspaceKey = ws.WorkspaceKey;

            var snippet = $@"<script>
(function () {{
  var WIDGET_URL    = '{widgetCdnUrl}';
  var API_URL       = '{apiBaseUrl.ToString().TrimEnd('/')}';
  var WORKSPACE     = '{workspaceSlug}';
  var WORKSPACE_KEY = '{workspaceKey}';
  var LOGIN_HINTS   = ['login', 'signin', 'auth', 'logout'];
  var workspaceDisabled = false;

  var pollInterval = null;
  var POLL_FAST    = 300;
  var POLL_SLOW    = 3000;
  var stableCount  = 0;

  function safeParse(j)  {{ try {{ return JSON.parse(j); }} catch(e) {{ return null; }} }}
  function pick(o, p)    {{ if (!o||!p) return null; return p.split('.').reduce(function(a,k){{return a&&a[k];}},o); }}
  function getCookie(n)  {{ var m=(document.cookie||'').split(';').map(function(c){{return c.trim();}}).find(function(c){{return c.indexOf(n+'=')===0;}}); return m?decodeURIComponent(m.split('=').slice(1).join('=')):''; }}
  function meta(name)    {{ var el=document.querySelector('meta[name=""'+name+'""]'); return el?el.content:''; }}
  function qp(name)      {{ try{{return new URLSearchParams(location.search).get(name)||'';}}catch(e){{return '';}} }}

  function getUser() {{
    var id='', em='';
    var bu = window.BUBBLE_USER;
    if (bu && bu.id) return {{ id: bu.id.toString().trim(), email: bu.email||'' }};
    var globals = ['AppUser','currentUser','user','__user','auth','authUser','session'];
    for (var i=0;i<globals.length;i++) {{
      var g = window[globals[i]];
      if (!g) continue;
      id = ((g.id||g.userId||g.user_id||g.uid||'')).toString().trim();
      em = g.email||g.userEmail||'';
      if (id) return {{id:id,email:em}};
      if (g.user) {{
        id = ((g.user.id||g.user.userId||'')).toString().trim();
        em = g.user.email||'';
        if (id) return {{id:id,email:em}};
      }}
    }}
    var storeKeys = ['store','__store','reduxStore','REDUX_STORE'];
    for (var j=0;j<storeKeys.length;j++) {{
      var store = window[storeKeys[j]];
      if (!store||typeof store.getState!=='function') continue;
      try {{
        var st = store.getState();
        var paths = ['auth.user.id','user.id','currentUser.id','session.userId','account.id'];
        for (var k=0;k<paths.length;k++) {{
          id = (pick(st,paths[k])||'').toString().trim();
          if (id) {{ em=pick(st,paths[k].replace('.id','.email'))||''; return {{id:id,email:em}}; }}
        }}
      }} catch(e) {{}}
    }}
    var lsObjects = [
      {{u:'user',idK:'id',emK:'email'}},
      {{u:'user',idK:'userId',emK:'email'}},
      {{u:'authUser',idK:'id',emK:'email'}},
      {{u:'currentUser',idK:'id',emK:'email'}},
      {{u:'session',idK:'userId',emK:'email'}}
    ];
    for (var li=0;li<lsObjects.length;li++) {{
      var obj=safeParse(localStorage.getItem(lsObjects[li].u));
      if (obj) {{
        id=((obj[lsObjects[li].idK]||'')).toString().trim();
        em=obj[lsObjects[li].emK]||'';
        if (id) return {{id:id,email:em}};
      }}
    }}
    var flatKeys=['userId','user_id','uid','memberId','accountId','sub'];
    for (var fi=0;fi<flatKeys.length;fi++) {{
      id=(localStorage.getItem(flatKeys[fi])||'').toString().trim();
      if (id) {{ em=localStorage.getItem('email')||localStorage.getItem('userEmail')||''; return {{id:id,email:em}}; }}
    }}
    var jwtKeys=['token','accessToken','access_token','authToken','jwt','idToken','id_token'];
    for (var jki=0;jki<jwtKeys.length;jki++) {{
      var jwt=localStorage.getItem(jwtKeys[jki]);
      if (jwt) {{
        try {{
          var parts=jwt.split('.');
          if (parts.length===3) {{
            var payload=JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
            id=(payload.sub||payload.id||payload.userId||'').toString().trim();
            em=payload.email||'';
            if (id) return {{id:id,email:em}};
          }}
        }} catch(e) {{}}
      }}
    }}
    for (var si=0;si<flatKeys.length;si++) {{
      id=(sessionStorage.getItem(flatKeys[si])||'').toString().trim();
      if (id) {{ em=sessionStorage.getItem('email')||''; return {{id:id,email:em}}; }}
    }}
    for (var sjki=0;sjki<jwtKeys.length;sjki++) {{
      var sjwt=sessionStorage.getItem(jwtKeys[sjki]);
      if (sjwt) {{
        try {{
          var sp=sjwt.split('.');
          if (sp.length===3) {{
            var pl=JSON.parse(atob(sp[1].replace(/-/g,'+').replace(/_/g,'/')));
            id=(pl.sub||pl.id||pl.userId||'').toString().trim();
            em=pl.email||'';
            if (id) return {{id:id,email:em}};
          }}
        }} catch(e) {{}}
      }}
    }}
    var cookieKeys=['userId','user_id','uid','memberId'];
    for (var ci=0;ci<cookieKeys.length;ci++) {{
      id=getCookie(cookieKeys[ci]).toString().trim();
      if (id) {{ em=getCookie('email'); return {{id:id,email:em}}; }}
    }}
    id=meta('bubble:userId').toString().trim();
    if (id) return {{id:id,email:meta('bubble:email')}};
    id=qp('bubbleUserId').toString().trim();
    if (id) return {{id:id,email:qp('bubbleEmail')}};
    return {{id:'',email:''}};
  }}

  function onLoginPage() {{
    var p=location.pathname.toLowerCase();
    return LOGIN_HINTS.some(function(h){{return p.indexOf(h)>=0;}});
  }}

  function bubbleExists() {{ return !!document.getElementById('bubble-btn'); }}

  function teardown() {{
    if (window.__bubble_hide) {{
      window.__bubble_hide();
    }}
    var btn   = document.getElementById('bubble-btn');
    var panel = document.getElementById('bubble-panel');
    if (btn   && btn.parentNode)   btn.parentNode.removeChild(btn);
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    window.__BUBBLE_BOOTED__ = false;
    window.__bubble_show     = undefined;
    window.__bubble_hide     = undefined;
    window.BUBBLE_USER       = null;
    stableCount = 0;
    setPollSpeed(POLL_FAST);
  }}

  function injectWidget(user) {{
    if (workspaceDisabled) return;
    Array.prototype.slice.call(document.querySelectorAll('script[src]'))
      .filter(function(s){{return s.src.indexOf('widget.js')>=0;}})
      .forEach(function(s){{s.parentNode&&s.parentNode.removeChild(s);}});
    window.BUBBLE_USER = {{id:user.id, email:user.email, workspace:WORKSPACE, key:WORKSPACE_KEY}};
    var s    = document.createElement('script');
    s.src    = WIDGET_URL;
    s.async  = true;
    s.onerror = function(){{workspaceDisabled=true; teardown();}};
    document.body.appendChild(s);
    // ── Start watching for workspace deletion / appearance changes ──
    watchConfig();
  }}

  function showExisting(user) {{
    window.BUBBLE_USER = {{id:user.id, email:user.email, workspace:WORKSPACE, key:WORKSPACE_KEY}};
    if (window.__bubble_show) window.__bubble_show(window.BUBBLE_USER);
  }}

  function setPollSpeed(ms) {{
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(evaluate, ms);
  }}

  // ══════════════════════════════════════════════════════
  //  watchConfig — long-polls /api/widget/config/long
  //  On 404 (workspace deleted) → tears down bubble instantly
  //  On 200 (config changed)    → updates appearance live
  //  On 204 (timeout/no change) → loops immediately
  // ══════════════════════════════════════════════════════
  var configVersion  = 0;
  var configWatching = false;

  function watchConfig() {{
    if (configWatching) return;
    configWatching = true;

    function loop() {{
      if (workspaceDisabled) {{ configWatching = false; return; }}

      var url = API_URL + '/api/widget/config/long'
              + '?workspace=' + encodeURIComponent(WORKSPACE)
              + '&key='       + encodeURIComponent(WORKSPACE_KEY)
              + '&since='     + configVersion;

      fetch(url)
        .then(function(res) {{
          // ── Workspace was deleted ──────────────────────
          if (res.status === 404 || res.status === 401) {{
            workspaceDisabled = true;
            teardown();
            configWatching = false;
            return;
          }}
          // ── No change within 25s timeout → loop again ──
          if (res.status === 204) {{
            loop();
            return;
          }}
          // ── Appearance changed → update live ───────────
          if (res.ok) {{
            res.json().then(function(cfg) {{
              configVersion = cfg.version || configVersion;
              if (window.__bubble_update_config) {{
                window.__bubble_update_config(cfg);
              }}
              loop();
            }}).catch(function() {{ loop(); }});
            return;
          }}
          // ── Any other error → retry after 5s ───────────
          setTimeout(loop, 5000);
        }})
        .catch(function() {{
          // Network error / API down → retry after 5s
          setTimeout(loop, 5000);
        }});
    }}

    loop();
  }}

  var lastUserId = null;

  function evaluate() {{
    if (workspaceDisabled) return;
    var isLogin = onLoginPage();
    var user    = getUser();

    if (isLogin || !user.id) {{
      if (bubbleExists()) teardown();
      lastUserId  = null;
      stableCount = 0;
      setPollSpeed(POLL_FAST);
      return;
    }}

    var userChanged = lastUserId !== user.id;
    var exists      = bubbleExists();

    if (!exists || userChanged) {{
      if (userChanged && exists) teardown();
      injectWidget(user);
      lastUserId  = user.id;
      stableCount = 0;
      setPollSpeed(POLL_FAST);
      return;
    }}

    var btn = document.getElementById('bubble-btn');
    if (btn && btn.style.display === 'none') {{
      showExisting(user);
      stableCount = 0;
    }}

    lastUserId = user.id;
    stableCount++;
    if (stableCount >= 5) setPollSpeed(POLL_SLOW);
  }}

  window.addEventListener('storage', function() {{
    stableCount = 0;
    setPollSpeed(POLL_FAST);
    evaluate();
  }});

  var lastHref = location.href;
  setInterval(function() {{
    if (location.href !== lastHref) {{
      lastHref    = location.href;
      stableCount = 0;
      setPollSpeed(POLL_FAST);
      evaluate();
    }}
  }}, 200);

  setPollSpeed(POLL_FAST);
  evaluate();
}})();
</script>";

            return new SnippetResponse(workspaceSlug, snippet);
        }
    }
}
