/**
 * Dynamic Island - Chrome Extension Platform
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
      }
    });
  }

  /* Background Script Side (for background.js) */

  function createBackgroundWorker() {
    var S = { tabId: null, windowId: null, hasMedia: false, isPlaying: false, title: '', artist: '', artwork: '', duration: 0, position: 0, supportsPiP: false, isYouTubeVideo: false, isMusicApp: false, shuffleOn: false, smartShuffleOn: false, repeatMode: 'off' };
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
      chrome.tabs.query({ audible: true }, function(tabs) {
        var tab = (tabs && tabs.length) ? tabs[0] : null;

        if (!tab) {
          if (S.tabId !== null) {
            execInTab(S.tabId, VDI.Core.getTabMediaState, [], function(res) {
              if (!res) {
                S.hasMedia = false;
                broadcastState();
                return;
              }
              S.title = res.title || S.title;
              S.artist = res.artist || S.artist;
              S.artwork = res.artwork || S.artwork;
              S.isPlaying = res.isPlaying;
              S.duration = res.duration;
              S.position = res.position;
              S.supportsPiP = res.pipOk || false;
              S.isFullscreen = res.isFullscreen || false;
              S.isYouTubeVideo = res.isYouTubeVideo || false;
              S.isMusicApp = res.isMusicApp || false;
              S.shuffleOn = res.shuffleOn || false;
              S.smartShuffleOn = res.smartShuffleOn || false;
              S.repeatMode = res.repeatMode || 'off';
              if (!res.hasMedia) S.hasMedia = false;
              broadcastState();
            });
          } else if (S.hasMedia) {
            S.hasMedia = false;
            broadcastState();
          }
          return;
        }

        S.tabId = tab.id;
        S.windowId = tab.windowId;

        execInTab(tab.id, VDI.Core.getTabMediaState, [], function(res) {
          if (!res) {
            S.hasMedia = true;
            broadcastState();
            return;
          }

          S.hasMedia = res.hasMedia || true;
          S.isPlaying = res.isPlaying;
          S.title = res.title || tab.title || '';
          S.artist = res.artist || '';
          S.artwork = res.artwork || null;
          S.duration = res.duration || 0;
          S.position = res.position || 0;
          S.supportsPiP = res.pipOk || false;
          S.isYouTubeVideo = res.isYouTubeVideo || false;
          S.isMusicApp = res.isMusicApp || false;
          S.shuffleOn = res.shuffleOn || false;
          S.smartShuffleOn = res.smartShuffleOn || false;
          S.repeatMode = res.repeatMode || 'off';

          broadcastState();
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
          if (returnTabId === null) {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
              if (tabs && tabs.length > 0) {
                returnTabId = tabs[0].id;
                returnWinId = tabs[0].windowId;
                if (S.tabId !== null) {
                  chrome.tabs.update(S.tabId, { active: true });
                  if (S.windowId !== null) {
                    chrome.windows.update(S.windowId, { focused: true });
                  }
                }
              }
            });
          } else {
            chrome.tabs.update(returnTabId, { active: true });
            if (returnWinId !== null) {
              chrome.windows.update(returnWinId, { focused: true });
            }
            returnTabId = null;
            returnWinId = null;
          }
        } else if (msg.act === 'VDI_TELEPORT_BACK') {
          if (msg.val && msg.val.source) {
            if (msg.val.source.tabId) chrome.tabs.update(msg.val.source.tabId, { active: true });
            if (msg.val.source.winId) chrome.windows.update(msg.val.source.winId, { focused: true });
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
                    else if (act === 'repeat') { m.repeatMode = (m.repeatMode + 1) % 3; }
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
