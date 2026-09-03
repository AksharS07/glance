/**
 * Glance - Chrome Extension Platform
 * Content script that communicates with background service worker
 */

var VDI = VDI || {};

VDI.Platform = VDI.Platform || {};

VDI.Platform.ChromeExt = (function() {
  'use strict';

  /* Content Script Side */

  function sendAction(action, value) {
    chrome.runtime.sendMessage({
      type: 'VDI_ACTION',
      act: action,
      val: value
    });
  }

  function jumpToTab() {
    chrome.runtime.sendMessage({ type: 'VDI_ACTION', act: 'jump' });
  }

  function requestPiP() {
    chrome.runtime.sendMessage({ type: 'VDI_ACTION', act: 'pip' });
  }

  function requestState(callback) {
    try {
      chrome.runtime.sendMessage({ type: 'VDI_REQUEST_STATE' }, function(state) {
        if (callback) callback(state);
      });
    } catch (e) {
      if (callback) callback(null);
    }
  }

  function requestFocusState(callback) {
    try {
      chrome.runtime.sendMessage({ type: 'VDI_FOCUS_REQUEST' }, function(focus) {
        if (callback) callback(focus);
      });
    } catch (e) {
      if (callback) callback(null);
    }
  }

  function onStateUpdate(callback) {
    chrome.runtime.onMessage.addListener(function(msg) {
      if (msg.type === 'VDI_UPDATE') {
        callback(msg.state);
      } else if (msg.type === 'VDI_TELEPORT_ARRIVED') {
        document.dispatchEvent(new CustomEvent('vdi-teleport-arrived'));
      }
    });
  }

  function onFocusUpdate(callback) {
    chrome.runtime.onMessage.addListener(function(msg) {
      if (msg.type === 'VDI_FOCUS_UPDATE') {
        callback(msg.focus);
      }
    });
  }

  /* Background Script Side (for background.js) */

  function createBackgroundWorker() {
    var S = { tabId: null, windowId: null, hasMedia: false, isPlaying: false, title: '', artist: '', artwork: '', duration: 0, position: 0, supportsPiP: false, isYouTubeVideo: false, isMusicApp: false, shuffleOn: false, smartShuffleOn: false, repeatMode: 'off' };
    var F = {
      phase: 'idle', // 'work' | 'shortBreak' | 'longBreak' | 'idle' | 'waiting'
      endTime: 0,
      totalMs: 0,
      running: false,
      workMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
      sessionsCompleted: 0,
      strictMode: true,
      bypassedSites: [],
      waitingTimeoutId: null
    };
    var pollInterval = 1000;
    var returnTabId = null;
    var returnWinId = null;

    function execInTab(tabId, fn, args, cb, world) {
      if (!tabId) {
        if (cb) cb(null);
        return;
      }
      var opts = {
        target: { tabId: tabId, allFrames: false },
        func: fn,
        args: args || []
      };
      if (world) opts.world = world;

      chrome.scripting.executeScript(opts, function(res) {
        if (chrome.runtime.lastError || !res) {
          console.warn('[VDI] execInTab failed:', chrome.runtime.lastError);
          if (cb) cb(null);
          return;
        }
        if (cb) cb(res[0] ? res[0].result : null);
      });
    }

    function broadcastState() {
      chrome.tabs.query({}, function(tabs) {
        for (var i = 0; i < tabs.length; i++) {
          chrome.tabs.sendMessage(tabs[i].id, { type: 'VDI_UPDATE', state: S }, function() {
            if (chrome.runtime.lastError) {} // suppress "no listener" errors
          });
        }
      });
    }

    function broadcastFocusState() {
      chrome.tabs.query({}, function(tabs) {
        for (var i = 0; i < tabs.length; i++) {
          chrome.tabs.sendMessage(tabs[i].id, { type: 'VDI_FOCUS_UPDATE', focus: F }, function() {
            if (chrome.runtime.lastError) {}
          });
        }
      });
    }

    // Site Blocker — Dynamic Rule Management
    function updateBlockRules(blocklist, enable) {
      if (typeof chrome.declarativeNetRequest === 'undefined') return;
      chrome.declarativeNetRequest.getDynamicRules(function(existing) {
        var removeIds = [];
        for (var i = 0; i < existing.length; i++) {
          if (existing[i].id >= 1000) removeIds.push(existing[i].id);
        }

        var rules = [];
        if (enable && blocklist && blocklist.length > 0) {
          var activeBlocks = blocklist.filter(function(s) { return F.bypassedSites.indexOf(s) === -1; });
          for (var j = 0; j < activeBlocks.length; j++) {
            rules.push({
              id: 1000 + j,
              priority: 1,
              action: {
                type: 'redirect',
                redirect: {
                  extensionPath: '/blocked.html?site=' + encodeURIComponent(activeBlocks[j])
                }
              },
              condition: {
                urlFilter: '||' + activeBlocks[j],
                resourceTypes: ['main_frame']
              }
            });
          }
        }

        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: removeIds,
          addRules: rules
        });
      });
    }

    function poll() {
      var SUPPORTED_HOSTS = ['youtube.com', 'music.youtube.com', 'spotify.com', 'open.spotify.com', 'music.apple.com'];
      chrome.tabs.query({ audible: true }, function(tabs) {
        // Filter to only supported media platforms
        var mediaTabs = [];
        if (tabs && tabs.length) {
          for (var t = 0; t < tabs.length; t++) {
            if (tabs[t].url) {
              try {
                var h = new URL(tabs[t].url).hostname;
                for (var s = 0; s < SUPPORTED_HOSTS.length; s++) {
                  if (h === SUPPORTED_HOSTS[s] || h.endsWith('.' + SUPPORTED_HOSTS[s])) {
                    mediaTabs.push(tabs[t]);
                    break;
                  }
                }
              } catch(e) {}
            }
          }
        }
        var tab = mediaTabs.length ? mediaTabs[0] : null;

        var targetTabId = tab ? tab.id : S.tabId;
        if (!targetTabId) {
          if (S.hasMedia) {
            S.hasMedia = false;
            broadcastState();
          }
          return;
        }

        var isAM = false;
        if (tab) {
          isAM = tab.url && tab.url.includes('music.apple.com');
          S.tabId = tab.id;
          S.windowId = tab.windowId;
        } else {
          isAM = S.platform === 'apple';
        }

        var cb = function(res) {
          if (!res) {
            if (S.hasMedia) {
              S.hasMedia = false;
              broadcastState();
            }
            return;
          }

          S.hasMedia = res.hasMedia !== undefined ? res.hasMedia : true;
          S.isPlaying = res.isPlaying;
          S.title = res.title || (tab ? tab.title : S.title) || '';
          S.artist = res.artist || S.artist || '';
          S.artwork = res.artwork || S.artwork || null;
          S.duration = res.duration || 0;
          S.position = res.position || 0;
          S.supportsPiP = res.pipOk || false;
          S.isFullscreen = res.isFullscreen || false;
          S.isYouTubeVideo = res.isYouTubeVideo || false;
          S.isMusicApp = res.isMusicApp || false;
          S.shuffleOn = res.shuffleOn || false;
          S.smartShuffleOn = res.smartShuffleOn || false;
          S.repeatMode = res.repeatMode || 'off';
          S.platform = res.platform || 'other';

          broadcastState();
        };

        if (isAM) {
          execInTab(targetTabId, function() {
            try {
              if (window.MusicKit && window.MusicKit.getInstance) {
                var mk = window.MusicKit.getInstance();
                if (mk) {
                  var ni = mk.nowPlayingItem;
                  var uiCur = mk.currentPlaybackTime || 0;
                  var uiDur = (ni && ni.playbackDuration) ? ni.playbackDuration / 1000 : 0;
                  var isPlaying = !!mk.isPlaying;
                  var shuffleOn = (mk.shuffleMode !== 0 && mk.shuffleMode !== undefined);
                  var rm = mk.repeatMode;
                  var repeatMode = (rm === 2) ? 'all' : ((rm === 1) ? 'one' : 'off');
                  
                  try {
                    var repDomBtn = document.querySelector('.button--repeat, amp-playback-controls-repeat');
                    if (repDomBtn) {
                      var rc = repDomBtn.className || '';
                      var rl = (repDomBtn.getAttribute('aria-label') || repDomBtn.getAttribute('title') || '').toLowerCase();
                      if (rl.includes('one') || rc.includes('mode--2')) repeatMode = 'one';
                      else if (rl.includes('all') || rc.includes('mode--1')) repeatMode = 'all';
                      else if (rc.includes('mode--0')) repeatMode = 'off';
                    }
                  } catch(e) {}
                  
                  var finalTitle = '', finalArtist = '', art = null;
                  if (ni) {
                    finalTitle = ni.title || (ni.attributes && ni.attributes.name) || '';
                    finalArtist = ni.artistName || (ni.attributes && ni.attributes.artistName) || '';
                    if (ni.artwork && window.MusicKit.formatArtworkURL) {
                      try { art = window.MusicKit.formatArtworkURL(ni.artwork, 600, 600); } catch(e) {}
                    }
                  }
                  return {
                    title: finalTitle,
                    artist: finalArtist,
                    artwork: art,
                    isPlaying: isPlaying,
                    duration: uiDur,
                    position: uiCur,
                    hasMedia: !!(finalTitle || uiDur > 0),
                    volume: 1,
                    pipOk: false,
                    isFullscreen: !!document.fullscreenElement,
                    isYouTubeVideo: false,
                    isMusicApp: true,
                    platform: 'apple',
                    shuffleOn: shuffleOn,
                    repeatMode: repeatMode,
                    timestamp: Date.now()
                  };
                }
              }
            } catch(e) {}
            return null;
          }, [], cb, 'MAIN');
        } else {
          execInTab(targetTabId, VDI.Core.getTabMediaState, [], cb);
        }
      });
    }

    function multiPoll(callback, intervals) {
      intervals.forEach(function(delay) {
        setTimeout(callback, delay);
      });
    }

    function handleMessage(msg, sender, sendResponse) {
      if (msg.type === 'VDI_ACTION') {
        if (msg.act === 'pip') {
          function triggerPiP(srcTabId, srcWinId) {
            if (S.tabId !== null && srcTabId !== S.tabId) {
              chrome.tabs.update(S.tabId, { active: true }, function() {
                if (S.windowId !== null) {
                  chrome.windows.update(S.windowId, { focused: true }, function() {
                    execInTab(S.tabId, VDI.Core.togglePiP, [{tabId: srcTabId, winId: srcWinId}], null);
                  });
                } else {
                  execInTab(S.tabId, VDI.Core.togglePiP, [{tabId: srcTabId, winId: srcWinId}], null);
                }
              });
            } else {
              execInTab(S.tabId, VDI.Core.togglePiP, [null], null);
            }
          }

          if (sender && sender.tab) {
            triggerPiP(sender.tab.id, sender.tab.windowId);
          } else {
            try {
              chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                var tid = (tabs && tabs.length) ? tabs[0].id : null;
                var wid = (tabs && tabs.length) ? tabs[0].windowId : null;
                triggerPiP(tid, wid);
              });
            } catch (e) {
              triggerPiP(null, null);
            }
          }
          
        } else if (msg.act === 'jump') {
          if (S.tabId !== null) {
            chrome.tabs.update(S.tabId, { active: true });
            if (S.windowId !== null) {
              chrome.windows.update(S.windowId, { focused: true });
            }
          }
        } else if (msg.act === 'teleport') {
          // Teleport: toggle between current tab and the media tab
          if (sender && sender.tab && sender.tab.id === S.tabId) {
            // Already on the media tab — teleport back to the last non-media tab
            if (returnTabId !== null) {
              chrome.tabs.update(returnTabId, { active: true });
              if (returnWinId !== null) chrome.windows.update(returnWinId, { focused: true });
              chrome.tabs.sendMessage(returnTabId, { type: 'VDI_TELEPORT_ARRIVED' });
              returnTabId = null;
              returnWinId = null;
            }
          } else {
            // On a different tab — save origin and jump to media tab
            if (sender && sender.tab) {
              returnTabId = sender.tab.id;
              returnWinId = sender.tab.windowId;
            }
            if (S.tabId !== null) {
              chrome.tabs.update(S.tabId, { active: true });
              if (S.windowId !== null) chrome.windows.update(S.windowId, { focused: true });
              chrome.tabs.sendMessage(S.tabId, { type: 'VDI_TELEPORT_ARRIVED' });
            }
          }
        // VDI_TELEPORT_BACK was previously handled here but the message uses
        // type: 'VDI_TELEPORT_BACK' (not act), so it never matched. Moved to
        // top-level handler below.
        } else if (msg.act === 'openOptions') {
          chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
        } else if (msg.act === 'openShortcuts') {
          var isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
          if (isFirefox && typeof browser !== 'undefined' && browser.commands && browser.commands.openShortcutSettings) {
            browser.commands.openShortcutSettings();
          } else {
            var isEdge = navigator.userAgent.includes("Edg/");
            var isBrave = navigator.brave !== undefined;
            var url = "chrome://extensions/shortcuts";
            if (isEdge) url = "edge://extensions/shortcuts";
            if (isBrave) url = "brave://extensions/shortcuts";
            chrome.tabs.create({ url: url });
          }
        } else {
          var args = msg.val !== undefined ? [msg.act, msg.val] : [msg.act];
          chrome.tabs.get(S.tabId, function(tab) {
            var isAM = tab && tab.url && tab.url.includes('music.apple.com');
            if (isAM) {
              // Apple Music: inject self-contained MusicKit call in MAIN world (VDI not available there)
              execInTab(S.tabId, function(act, val) {
                try {
                  if (window.MusicKit && window.MusicKit.getInstance) {
                    var m = window.MusicKit.getInstance();
                    if (act === 'toggle') { m.isPlaying ? m.pause() : m.play(); }
                    else if (act === 'prev') { m.skipToPreviousItem(); }
                    else if (act === 'next') { m.skipToNextItem(); }
                    else if (act === 'shuffle') { m.shuffleMode = m.shuffleMode === 0 ? 1 : 0; }
                    else if (act === 'repeat') { m.repeatMode = m.repeatMode === 0 ? 2 : (m.repeatMode === 2 ? 1 : 0); }
                    else if (act === 'seek' && typeof val === 'number') { m.seekToTime(val); }
                  }
                } catch(e) {}
              }, args, null, 'MAIN');
            } else {
              execInTab(S.tabId, function(act, val) {
                if (typeof VDI !== 'undefined' && VDI.Core) VDI.Core.executeMediaAction(act, val);
              }, args, null, 'ISOLATED');
            }
          });

          // Rapid poll after actions
          multiPoll(poll, [200, 600, 1200]);
        }
      } else if (msg.type === 'VDI_REQUEST_STATE') {
        sendResponse(S);
      } else if (msg.type === 'VDI_GET_NOW_PLAYING') {
        sendResponse(S);
      } else if (msg.type === 'VDI_FETCH_LYRICS') {
        VDI.Core.fetchLyrics(msg.title, msg.artist, msg.duration, function(result) {
          sendResponse(result);
        });
        return true; // Keep message channel open for async response
      } else if (msg.type === 'VDI_EXTRACT_COLOR') {
        VDI.Core.extractVibrant(msg.url, msg.amoled, function(res) {
          sendResponse(res);
        });
        return true;
      } else if (msg.type === 'VDI_TELEPORT_BACK') {
        // PiP teleport-back: core.js sends { type: 'VDI_TELEPORT_BACK', source: {tabId, winId} }
        if (msg.source) {
          if (msg.source.tabId) chrome.tabs.update(msg.source.tabId, { active: true });
          if (msg.source.winId) chrome.windows.update(msg.source.winId, { focused: true });
        }
      } else if (msg.type === 'VDI_BATCH_ROMANIZE') {
        VDI.Core.batchRomanize(msg.lines, function(result) {
          sendResponse(result);
        });
        return true;
      } else if (msg.type === 'VDI_FOCUS_REQUEST') {
        sendResponse(F);
      } else if (msg.type === 'VDI_FOCUS_START') {
        F.workMin = msg.workMin || F.workMin;
        F.shortBreakMin = msg.shortBreakMin || F.shortBreakMin;
        F.longBreakMin = msg.longBreakMin || F.longBreakMin;
        F.strictMode = msg.strictMode !== undefined ? msg.strictMode : F.strictMode;
        
        if (msg.phase) F.phase = msg.phase;
        else if (F.phase === 'idle' || F.phase === 'waiting') F.phase = 'work';
        
        F.running = true;
        
        if (F.phase === 'work') {
          F.bypassedSites = [];
          F.bypassLimits = {};
          chrome.storage.local.get({ glance_focus_blocklist: [] }, function(res) {
            updateBlockRules(res.glance_focus_blocklist, true);
          });
        }
        
        var durationMin = F.phase === 'work' ? F.workMin : (F.phase === 'longBreak' ? F.longBreakMin : F.shortBreakMin);
        F.totalMs = durationMin * 60 * 1000;
        // Check if we passed a specific duration (e.g., from +5m/-5m)
        if (msg.durationMs) F.totalMs = msg.durationMs;
        
        F.endTime = Date.now() + F.totalMs;
        F.running = true;
        if (F.phase === 'work') F.bypassedSites = [];
        
        if (F.waitingTimeoutId) {
          clearTimeout(F.waitingTimeoutId);
          F.waitingTimeoutId = null;
        }

        // Apply rules if working
        if (F.phase === 'work') {
          chrome.storage.local.get({ glance_focus_blocklist: [] }, function(res) {
            updateBlockRules(res.glance_focus_blocklist, true);
          });
        } else {
          updateBlockRules([], false);
        }

        broadcastFocusState();
        
        // Setup timeout to trigger completion
        F.waitingTimeoutId = setTimeout(function() {
          handleFocusComplete();
        }, F.totalMs);

      } else if (msg.type === 'VDI_FOCUS_STOP') {
        if (F.waitingTimeoutId) clearTimeout(F.waitingTimeoutId);
        F.phase = 'idle';
        F.running = false;
        F.endTime = 0;
        F.totalMs = 0;
        F.bypassLimits = {};
        F.bypassedSites = [];
        updateBlockRules([], false);
        broadcastFocusState();
      } else if (msg.type === 'VDI_FOCUS_PAUSE') {
        if (F.running) {
          if (F.waitingTimeoutId) {
             clearTimeout(F.waitingTimeoutId);
             F.waitingTimeoutId = null;
          }
          F.running = false;
          F.remainingPauseMs = Math.max(0, F.endTime - Date.now());
          broadcastFocusState();
        }
      } else if (msg.type === 'VDI_FOCUS_RESUME') {
        if (!F.running && F.phase !== 'idle' && F.phase !== 'waiting') {
          F.running = true;
          F.endTime = Date.now() + (F.remainingPauseMs || 0);
          F.waitingTimeoutId = setTimeout(function() {
            handleFocusComplete();
          }, F.remainingPauseMs || 0);
          broadcastFocusState();
        }
      } else if (msg.type === 'VDI_FOCUS_BYPASS') {
        if (msg.site) {
          if (F.bypassedSites.indexOf(msg.site) === -1) {
            F.bypassedSites.push(msg.site);
            chrome.storage.local.get({ glance_focus_blocklist: [] }, function(res) {
              updateBlockRules(res.glance_focus_blocklist, true);
            });
          }
          
          if (!F.bypassLimits) F.bypassLimits = {};
          F.bypassLimits[msg.site] = (F.bypassLimits[msg.site] || 0) + 1;

          chrome.alarms.create('vdi_bypass_' + msg.site, { delayInMinutes: 5 });
        }
        if (sendResponse) sendResponse();
      } else if (msg.type === 'VDI_FOCUS_SKIP') {
        if (F.waitingTimeoutId) clearTimeout(F.waitingTimeoutId);
        handleFocusComplete();
      } else if (msg.type === 'VDI_FOCUS_WAIT') {
        // Enters the 5 second waiting phase
        F.phase = 'waiting';
        F.nextPhase = msg.nextPhase || 'work';
        F.running = false;
        F.totalMs = 5000; // 5 sec wait
        F.endTime = Date.now() + 5000;
        updateBlockRules([], false);
        broadcastFocusState();
        
        if (F.waitingTimeoutId) clearTimeout(F.waitingTimeoutId);
        F.waitingTimeoutId = setTimeout(function() {
          // Auto advance to properly calculated next phase
          handleMessage({ type: 'VDI_FOCUS_START', phase: F.nextPhase }, sender, function(){});
        }, 5000);
      }
    }

    function handleFocusComplete() {
      if (F.phase === 'work') {
        F.sessionsCompleted++;
        // Notification
        if (chrome.notifications) {
          chrome.notifications.create('vdi_focus', {
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'Session Complete!',
            message: 'Great job! Time for a break.'
          });
        }
        // Save stats
        chrome.storage.local.get({ glance_focus_stats: { currentStreak: 0, lastActiveDate: '', sessionsCompleted: 0 } }, function(res) {
          var stats = res.glance_focus_stats;
          stats.sessionsCompleted++;
          var today = new Date().toDateString();
          if (stats.lastActiveDate !== today) {
            var yesterday = new Date(Date.now() - 86400000).toDateString();
            if (stats.lastActiveDate === yesterday) stats.currentStreak++;
            else stats.currentStreak = 1;
            stats.lastActiveDate = today;
          }
          chrome.storage.local.set({ glance_focus_stats: stats });
        });
      }
      
      var nextP = 'work';
      if (F.phase === 'work') {
        nextP = (F.sessionsCompleted % 4 === 0 && F.sessionsCompleted > 0) ? 'longBreak' : 'shortBreak';
      }
      
      handleMessage({ type: 'VDI_FOCUS_WAIT', nextPhase: nextP }, null, function(){});
    }

    function start() {
      setInterval(poll, pollInterval);
      poll();

      chrome.runtime.onMessage.addListener(handleMessage);
      // Expose for console testing & internal use (alarms, storage triggers)
      self._vdiHandleMessage = handleMessage;
      chrome.tabs.onActivated.addListener(function() { poll(); });
      chrome.windows.onFocusChanged.addListener(function() { poll(); });

      
      chrome.alarms.onAlarm.addListener(function(alarm) {
        if (alarm.name.startsWith('vdi_bypass_')) {
          var site = alarm.name.substring(11); // remove 'vdi_bypass_'
          var idx = F.bypassedSites.indexOf(site);
          if (idx !== -1) {
            F.bypassedSites.splice(idx, 1);
            chrome.storage.local.get({ glance_focus_blocklist: [] }, function(res) {
              updateBlockRules(res.glance_focus_blocklist, true);
            });
          }
        }
      });

      chrome.commands.onCommand.addListener(function(command) {
        chrome.storage.local.get({ enableShortcuts: true }, function(res) {
          if (!res.enableShortcuts) return;
          if (command === 'toggle-playback') handleMessage({type: 'VDI_ACTION', act: 'toggle'});
          else if (command === 'next-track') handleMessage({type: 'VDI_ACTION', act: 'next'});
          else if (command === 'prev-track') handleMessage({type: 'VDI_ACTION', act: 'prev'});
        });
      });

      chrome.runtime.onInstalled.addListener(function(details) {
        if (details.reason === "install") {
          chrome.tabs.create({ url: "welcome.html" });
        } else if (details.reason === "update") {
          chrome.tabs.create({ url: "patch-notes.html" });
        }
      });
    }

    return {
      start: start,
      getState: function() { return S; }
    };
  }

  return {
    // Content script methods
    sendAction: sendAction,
    jumpToTab: jumpToTab,
    requestPiP: requestPiP,
    requestState: requestState,
    requestFocusState: requestFocusState,
    onStateUpdate: onStateUpdate,
    onFocusUpdate: onFocusUpdate,

    // Background script factory
    createBackgroundWorker: createBackgroundWorker
  };
})();
