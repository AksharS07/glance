(function() {
  'use strict';

  var urlParams  = new URLSearchParams(window.location.search);
  var site       = urlParams.get('site') || '';
  var CIRC       = 2 * Math.PI * 57.8; // must match SVG r=57.8

  var elPhase    = document.getElementById('ring-phase');
  var elTime     = document.getElementById('ring-time');
  var elSession  = document.getElementById('ring-session');
  var elSite     = document.getElementById('info-site');
  var elTask     = document.getElementById('task-line');
  var elTaskText = document.getElementById('task-text');
  var elRing     = document.getElementById('ring-progress');
  var btnClose   = document.getElementById('btn-close');
  var btnBypass  = document.getElementById('btn-bypass');

  // Show blocked site
  if (site) elSite.textContent = site + ' is blocked';

  // ── Apply accent + glow directly as CSS values (handles hsl(), rgba(), #hex) ──
  function applyTheme(accent, glow) {
    var root = document.documentElement;
    if (accent) root.style.setProperty('--accent', accent);
    if (glow) {
      root.style.setProperty('--glow',      glow);
      // Softer version: just replace last number in rgba or similar
      // Keep it simple — soft glow is just the glow at 40% opacity via CSS mix
      root.style.setProperty('--glow-soft', glow.replace(/[\d.]+\)$/, '0.09)'));
    }
  }

  // Load cached theme immediately — no flash
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get({ vdi_accent_color: null, vdi_glow_color: null }, function(res) {
      if (chrome.runtime.lastError) return;
      applyTheme(res.vdi_accent_color, res.vdi_glow_color);
    });
  }

  // ── Ring ──
  function setRing(ratio) {
    var offset = CIRC * (1 - Math.max(0, Math.min(1, ratio)));
    elRing.style.strokeDashoffset = offset;
  }

  // ── Format ms → "m:ss" ──
  function fmt(ms) {
    if (ms <= 0) return '0:00';
    var s = Math.ceil(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  var PHASE_LABEL = {
    work:       'Focus',
    shortBreak: 'Short Break',
    longBreak:  'Long Break',
    waiting:    'Up next…',
    idle:       'No Session'
  };

  var endTime = 0;
  var totalMs = 1;
  var tickId  = null;

  function tick() {
    var rem = endTime - Date.now();
    if (rem < 0) rem = 0;
    elTime.textContent = fmt(rem);
    setRing(totalMs > 0 ? rem / totalMs : 0);
  }

  function applyFocus(focus) {
    if (!focus) return;
    var ph = focus.phase || 'idle';
    endTime = focus.endTime || 0;
    totalMs = focus.totalMs || 1;

    elPhase.textContent   = PHASE_LABEL[ph] || ph;
    elSession.textContent = focus.sessionsCompleted
      ? 'Session ' + focus.sessionsCompleted : '';

    if (tickId) { clearInterval(tickId); tickId = null; }

    if (ph === 'idle') {
      elTime.textContent = '--:--';
      setRing(0);
    } else if (ph === 'waiting') {
      elTime.textContent = '…';
      setRing(0);
    } else {
      tick();
      tickId = setInterval(tick, 500);
    }
  }

  // ── Active task from storage ──
  function loadTask() {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    chrome.storage.local.get({ glance_tasks: [] }, function(res) {
      if (chrome.runtime.lastError) return;
      var tasks = res.glance_tasks || [];
      var active = tasks.find(function(t) { return t.active && !t.completed; });
      if (!active) {
        var open = tasks.filter(function(t) { return !t.completed; });
        if (open.length) active = open[0];
      }
      if (active && active.text) {
        elTaskText.textContent = active.text;
        elTask.style.display = 'flex';
      }
    });
  }

  // ── Initial load ──
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ type: 'VDI_FOCUS_REQUEST' }, function(focus) {
      if (chrome.runtime.lastError) {
        // Background not responding — show bypass anyway (can't enforce block)
        if (site) btnBypass.style.display = 'block';
        return;
      }
      console.log('[Glance blocked] focus state:', JSON.stringify(focus));
      applyFocus(focus);

      // Show bypass unless strict mode is explicitly on
      var isStrict = focus && focus.strictMode === true;
      if (site && !isStrict) {
        btnBypass.style.display = 'block';
        // Label based on whether session is actually running
        var running = focus && focus.running && focus.endTime > Date.now();
        btnBypass.textContent = running ? 'Bypass once' : 'Unblock & Visit';
      }
    });
  }
  loadTask();

  // ── Live phase updates ──
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function(msg) {
      if (msg.type === 'VDI_FOCUS_UPDATE') applyFocus(msg.focus);
    });
  }

  // ── Close Tab: ask background for the last non-blocked tab, switch to it, then close ──
  btnClose.addEventListener('click', function() {
    if (typeof chrome === 'undefined' || !chrome.tabs) { window.close(); return; }

    chrome.runtime.sendMessage({ type: 'VDI_GET_PREV_TAB' }, function(res) {
      var prevTabId = res && res.tabId;
      chrome.tabs.getCurrent(function(currentTab) {
        if (!currentTab) { window.close(); return; }

        if (prevTabId) {
          // Switch to previous tab first, then close the blocked tab
          chrome.tabs.update(prevTabId, { active: true }, function() {
            chrome.tabs.remove(currentTab.id);
          });
        } else {
          // No tracked previous tab — just close
          chrome.tabs.remove(currentTab.id);
        }
      });
    });
  });

  // ── Bypass ──
  btnBypass.addEventListener('click', function() {
    if (!site) return;
    // If no real session, the block is stale — just navigate directly
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'VDI_FOCUS_REQUEST' }, function(res) {
        var activeSession = res && res.phase && res.phase !== 'idle'
                            && res.running && res.endTime > Date.now();
        if (activeSession) {
          // Active session — ask background to whitelist temporarily
          chrome.runtime.sendMessage({ type: 'VDI_FOCUS_BYPASS', site: site }, function() {
            window.location.href = 'https://' + site;
          });
        } else {
          // Stale block — navigate directly
          window.location.href = 'https://' + site;
        }
      });
    }
  });

})();
