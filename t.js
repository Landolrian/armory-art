(function () {
  var END = 'https://art-views.rifflandgame.workers.dev/t';
  try {
    if (/[?&]me(=|&|$)/.test(location.search)) localStorage.setItem('aa-me', '1');
    if (localStorage.getItem('aa-me')) return;
  } catch (e) {}

  var rid = function () { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); };
  var vid;
  try { vid = localStorage.getItem('aa-v'); if (!vid) { vid = rid(); localStorage.setItem('aa-v', vid); } } catch (e) { vid = rid(); }
  var sid = rid(), q = [], totals = {}, open = 0, active = 0, scroll = 0, sentMeta = false, lastInput = Date.now(), where = '', dirty = true;
  var ev = function (type, label) { q.push([Date.now(), type, String(label == null ? '' : label).replace(/\s+/g, ' ').trim().slice(0, 280)]); dirty = true; };
  var fighter = function () { var n = document.getElementById('vName'); return n ? n.textContent.trim() : ''; };

  function sectionName(el) {
    if (el.tagName === 'HEADER') return 'Top of the page';
    if (el.tagName === 'FOOTER') return 'Bottom of the page';
    var h = el.querySelector('.head h2'), n = el.querySelector('.head .num');
    return (n ? n.textContent.trim() + ' ' : '') + (h ? h.textContent.trim() : 'Section');
  }
  function here() {
    var mid = innerHeight / 2, els = document.querySelectorAll('header, section, footer');
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) {
        var s = sectionName(els[i]);
        return els[i].id === 'viewer' && fighter() ? s + ' / ' + fighter() : s;
      }
    }
    return '';
  }

  ['mousemove', 'scroll', 'touchstart', 'keydown', 'wheel', 'pointerdown'].forEach(function (t) {
    addEventListener(t, function () { lastInput = Date.now(); }, { passive: true, capture: true });
  });

  setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    open++;
    var idle = Date.now() - lastInput > 120000;
    if (!idle) active++;
    var w = here();
    if (w) {
      var key = idle ? w + ' (not moving)' : w;
      totals[key] = (totals[key] || 0) + 1;
      if (w !== where) { where = w; ev('section', w); }
    }
    var max = document.documentElement.scrollHeight - innerHeight;
    var pct = max > 0 ? Math.round(scrollY / max * 100) : 100;
    if (pct > scroll) scroll = pct;
    dirty = true;
  }, 1000);

  function describe(t) {
    var el;
    if ((el = t.closest('.fighter'))) return ['fighter', 'Picked ' + el.querySelector('b').textContent.trim()];
    if ((el = t.closest('.watchBtns button'))) return ['watch', 'Played ' + el.textContent.replace(/[^A-Z ]/g, '').trim().toLowerCase() + ' in the game (' + fighter() + ')'];
    if ((el = t.closest('#slow'))) return ['click', 'Slow motion button (now ' + (el.classList.contains('on') ? 'OFF' : 'ON') + ')'];
    if ((el = t.closest('a'))) return ['link', 'Opened link: ' + (el.textContent.trim() || el.href)];
    if ((el = t.closest('.anim'))) return ['click', 'Clicked animation "' + el.querySelector('b').textContent.trim() + '" (' + fighter() + ')'];
    if ((el = t.closest('.vpanels figure'))) return ['click', 'Clicked manga panel "' + el.querySelector('b').textContent.trim() + '"'];
    if ((el = t.closest('.all > div'))) return ['click', 'Clicked drawing "' + el.textContent.trim() + '" (' + fighter() + ')'];
    if ((el = t.closest('figure'))) return ['click', 'Clicked picture: ' + ((el.querySelector('figcaption') || el).textContent.trim() || 'image')];
    if ((el = t.closest('.sw'))) return ['click', 'Clicked colour ' + el.textContent.trim()];
    if ((el = t.closest('.rule, .spec'))) return ['click', 'Clicked "' + el.querySelector('h3').textContent.trim() + '"'];
    if ((el = t.closest('img'))) return ['click', 'Clicked image ' + (el.alt || (el.src || '').split('/').pop())];
    if ((el = t.closest('tr'))) return ['click', 'Clicked table row: ' + el.textContent.trim()];
    if ((el = t.closest('h1, h2, h3, p'))) return ['click', 'Clicked text: "' + el.textContent.trim().slice(0, 80) + '"'];
    return ['click', 'Clicked empty space (' + (where || 'page') + ')'];
  }
  document.addEventListener('click', function (e) { var d = describe(e.target); ev(d[0], d[1]); }, true);
  document.addEventListener('contextmenu', function (e) {
    var img = e.target.closest('img');
    ev('save', img ? 'Long-pressed / right-clicked image ' + (img.alt || img.src.split('/').pop()) + ' (maybe saved it)' : 'Right-clicked the page');
  }, true);
  document.addEventListener('copy', function () { ev('copy', 'Copied: "' + String(getSelection()).slice(0, 120) + '"'); }, true);
  addEventListener('blur', function () {
    setTimeout(function () {
      if (document.activeElement && document.activeElement.tagName === 'IFRAME') ev('click', 'Clicked inside the game video (' + fighter() + ')');
    }, 0);
  });

  function payload() {
    var b = { sid: sid, vid: vid, open: open, active: active, scroll: scroll, totals: totals, events: q.splice(0, q.length) };
    if (!sentMeta) {
      b.meta = { ref: document.referrer, screen: screen.width + 'x' + screen.height, tz: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone, lang: navigator.language };
      sentMeta = true;
    }
    dirty = false;
    return JSON.stringify(b);
  }
  function send(beacon) {
    if (!dirty && !q.length) return;
    var body = payload();
    try {
      if (beacon && navigator.sendBeacon && navigator.sendBeacon(END, new Blob([body], { type: 'text/plain' }))) return;
      fetch(END, { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(function () {});
    } catch (e) {}
  }

  ev('open', 'Opened the page' + (document.referrer ? ' from ' + document.referrer : ''));
  setTimeout(function () { send(false); }, 1500);
  setInterval(function () { if (document.visibilityState === 'visible') send(false); }, 15000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { ev('away', 'Left the tab / switched apps'); send(true); }
    else ev('back', 'Came back to the page');
  });
  addEventListener('pagehide', function () { ev('close', 'Closed the page'); send(true); });
})();
