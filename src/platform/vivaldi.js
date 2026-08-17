/**
 * Glance - Vivaldi Platform
 * Uses chrome.tabs and chrome.scripting directly from browser UI context
 */

var VDI = VDI || {};

VDI.Platform = VDI.Platform || {};

VDI.Platform.Vivaldi = (function() {
  'use strict';

  function execInTab(tabId, fn, args, cb, world) {
    if (!tabId) {
      if (cb) cb(null);
      return;
    }
    try {
      if (chrome && chrome.scripting && chrome.scripting.executeScript) {
        var spec = {
          target: { tabId: tabId, allFrames: false },
          func: fn
        };
        if (args && args.length) spec.args = args;
        if (world) spec.world = world;

        chrome.scripting.executeScript(spec, function(res) {
          if (chrome.runtime.lastError || !res) {
            if (cb) cb(null);
            return;
          }
          if (cb) cb(res[0] ? res[0].result : null);
        });
      } else if (chrome && chrome.tabs && chrome.tabs.executeScript) {
        // Legacy API fallback
        var argStr = args ? args.map(function(a) { return JSON.stringify(a); }).join(',') : '';
        chrome.tabs.executeScript(tabId, { code: '(' + fn.toString() + ')(' + argStr + ')' }, function(res) {
          if (chrome.runtime.lastError || !res) {
            if (cb) cb(null);
            return;
          }
          if (cb) cb(res[0] !== undefined ? res[0] : null);
        });
      } else {
        console.warn('[VDI] execInTab failed: chrome.scripting or chrome.tabs APIs are missing. Are you in a valid extension context?');
        if (cb) cb(null);
      }
    } catch (e) {
      console.warn('[VDI] execInTab exception:', e);
      if (cb) cb(null);
    }
  }

  function multiPoll(callback, intervals) {
    intervals.forEach(function(delay) {
      setTimeout(callback, delay);
    });
  }

  function sendAction(tabId, action, value, onUpdate) {
    var args = (value !== undefined) ? [action, value] : [action];
    execInTab(tabId, VDI.Core.executeMediaAction, args, null);

    // Rapid poll after action to reflect changes
    multiPoll(onUpdate, [150, 400, 900]);
  }

  function jumpToTab(tabId, windowId) {
    if (tabId === null) return;
    try {
      chrome.tabs.update(tabId, { active: true });
    } catch (e) {}
    try {
      if (windowId !== null) {
        chrome.windows.update(windowId, { focused: true });
      }
    } catch (e) {}
  }

    function requestPiP(mediaTabId) {
      if (!chrome || !chrome.tabs) return;
      
      // Get the currently active tab so we can jump back
      chrome.tabs.query({ active: true, currentWindow: true }, function(activeTabs) {
        var originalTabId = (activeTabs && activeTabs.length) ? activeTabs[0].id : null;
        
        // If we are already on the media tab, just run it
        if (originalTabId === mediaTabId) {
          execInTab(mediaTabId, VDI.Core.togglePiP, [originalTabId], null);
          return;
        }
        
        // Otherwise, teleport to the media tab
        chrome.tabs.update(mediaTabId, { active: true }, function() {
          // Pass the originalTabId to togglePiP so it can jump back
          execInTab(mediaTabId, VDI.Core.togglePiP, [originalTabId], null);
        });
      });
    }

  function pollMedia(callback) {
    try {
      if (!chrome || !chrome.tabs) return;

      chrome.tabs.query({ audible: true }, function(tabs) {
        try {
          if (chrome.runtime.lastError) return;
          var tab = (tabs && tabs.length) ? tabs[0] : null;

          callback(tab);
        } catch (e) {}
      });
    } catch (e) {}
  }

  function getMediaStateFromTab(tabId, callback) {
    execInTab(tabId, VDI.Core.getTabMediaState, [], callback);
  }

  try {
    chrome.runtime.onMessage.addListener(function(msg) {
      if (msg.type === 'VDI_TELEPORT_BACK' && msg.source) {
        try { chrome.tabs.update(msg.source, { active: true }); } catch (e) {}
      }
    });
  } catch (e) {}

  function romanizeLines(lines, cb) {
    VDI.Core.batchRomanize(lines, cb);
  }

  return {
    isVivaldi: true,
    execInTab: execInTab,
    sendAction: sendAction,
    jumpToTab: jumpToTab,
    requestPiP: requestPiP,
    pollMedia: pollMedia,
    getMediaStateFromTab: getMediaStateFromTab,
    fetchLyrics: function(title, artist, cb) { VDI.Core.fetchLyrics(title, artist, null, cb); },
    romanizeLines: romanizeLines
  };
})();
