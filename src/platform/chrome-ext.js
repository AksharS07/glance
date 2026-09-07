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

  function onStateUpdate(callback) {
    chrome.runtime.onMessage.addListener(function(msg) {
      if (msg.type === 'VDI_UPDATE') {
        callback(msg.state);
      } else if (msg.type === 'VDI_TELEPORT_ARRIVED') {
        document.dispatchEvent(new CustomEvent('vdi-teleport-arrived'));
      }
    });
  }

  /* Background Script Side (for background.js) */

  function createBackgroundWorker() {
    var S = { tabId: null, windowId: null, hasMedia: false, isPlaying: false, title: '', artist: '', artwork: '', duration: 0, position: 0, supportsPiP: false, isYouTubeVideo: false, isMusicApp: false, shuffleOn: false, smartShuffleOn: false, repeatMode: 'off', sources: [] };
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

    function poll() {
      var SUPPORTED_HOSTS = ['youtube.com', 'music.youtube.com', 'spotify.com', 'open.spotify.com', 'music.apple.com'];
      chrome.tabs.query({}, function(tabs) {
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
        
        if (mediaTabs.length === 0) {
          if (S.hasMedia) {
            S.hasMedia = false;
            S.sources = [];
            broadcastState();
          }
          return;
        }

        var resultsCount = 0;
        var validSources = [];

        var checkDone = function() {
          if (resultsCount === mediaTabs.length) {
            validSources.sort(function(a, b) { return a.tabId - b.tabId; });
            
            if (validSources.length === 0) {
              if (S.hasMedia) {
                S.hasMedia = false;
                S.sources = [];
                broadcastState();
              }
              return;
            }

            var selected = null;
            if (S.tabId) {
              for (var i = 0; i < validSources.length; i++) {
                if (validSources[i].tabId === S.tabId) {
                  selected = validSources[i];
                  break;
                }
              }
            }
            if (!selected) {
              selected = validSources[0];
            }

            S.hasMedia = true;
            S.isPlaying = selected.isPlaying;
            S.title = selected.title || '';
            S.artist = selected.artist || '';
            S.artwork = selected.artwork || null;
            S.duration = selected.duration || 0;
            S.position = selected.position || 0;
            S.supportsPiP = selected.pipOk || false;
            S.isFullscreen = selected.isFullscreen || false;
            S.isYouTubeVideo = selected.isYouTubeVideo || false;
            S.isMusicApp = selected.isMusicApp || false;
            S.shuffleOn = selected.shuffleOn || false;
            S.smartShuffleOn = selected.smartShuffleOn || false;
            S.repeatMode = selected.repeatMode || 'off';
            S.platform = selected.platform || 'other';
            S.tabId = selected.tabId;
            S.windowId = selected.windowId;
            S.sources = validSources.map(function(src) { return { tabId: src.tabId, title: src.title }; });

            broadcastState();
          }
        };

        mediaTabs.forEach(function(tab) {
          var isAM = tab.url && tab.url.includes('music.apple.com');
          var cb = function(res) {
            resultsCount++;
            if (res && res.hasMedia) {
              res.tabId = tab.id;
              res.windowId = tab.windowId;
              res.title = res.title || tab.title || '';
              validSources.push(res);
            }
            checkDone();
          };

          if (isAM) {
            execInTab(tab.id, function() {
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
            execInTab(tab.id, VDI.Core.getTabMediaState, [], cb);
          }
        });
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
        } else if (msg.act === 'next-source') {
          if (S.sources && S.sources.length > 1) {
            var currentIndex = -1;
            for (var i = 0; i < S.sources.length; i++) {
              if (S.sources[i].tabId === S.tabId) {
                currentIndex = i;
                break;
              }
            }
            if (currentIndex !== -1) {
              var nextIndex = (currentIndex + 1) % S.sources.length;
              S.tabId = S.sources[nextIndex].tabId;
              // Rapid poll to apply new selection immediately
              poll();
            }
          }
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
      }
    }

    function start() {
      setInterval(poll, pollInterval);
      poll();

      chrome.runtime.onMessage.addListener(handleMessage);
      chrome.tabs.onActivated.addListener(function() { poll(); });
      chrome.windows.onFocusChanged.addListener(function() { poll(); });

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
    onStateUpdate: onStateUpdate,

    // Background script factory
    createBackgroundWorker: createBackgroundWorker
  };
})();
