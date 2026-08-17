/**
 * Vivaldi Glance – Content Script Bridge
 *
 * This script is auto-injected into tabs by the Glance mod (via chrome.scripting).
 * It reads the page's Media Session API and responds to messages from the browser UI.
 *
 * Place this file alongside dynamic-island.js in:
 *   ..\Application\<VERSION>\resources\vivaldi\
 */

(function () {
  'use strict';

  // ── Listen for messages from the Glance in the browser UI ──
  window.addEventListener('message', handleWindowMessage);

  // chrome.runtime message bridge (when called from chrome.tabs.sendMessage)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!msg || !msg.type) return;

      if (msg.type === 'VDI_GET_MEDIA_STATE') {
        sendResponse(getMediaState());
        return true;
      }

      if (msg.type === 'VDI_MEDIA_ACTION') {
        handleAction(msg.action, msg.value);
      }
    });
  }

  function handleWindowMessage(e) {
    if (!e.data || e.data.source !== 'vivaldi-dynamic-island') return;
    if (e.data.type === 'VDI_MEDIA_ACTION') {
      handleAction(e.data.action, e.data.value);
    }
  }

  // ── Read current Media Session / media element state ──────────
  function getMediaState() {
    const ms = navigator.mediaSession;
    const el = findActiveMediaElement();

    const artwork = ms?.metadata?.artwork;
    const artworkSrc = artwork && artwork.length > 0 ? artwork[artwork.length - 1].src : null;
    const isPlaying = ms?.playbackState === 'playing' || (el ? !el.paused : false);

    return {
      title:     ms?.metadata?.title   || document.title || '',
      artist:    ms?.metadata?.artist  || '',
      album:     ms?.metadata?.album   || '',
      artwork:   artworkSrc,
      isPlaying,
      duration:  el?.duration  || 0,
      position:  el?.currentTime || 0,
      hasMedia:  Boolean(el || ms?.metadata?.title),
    };
  }

  // ── Find the primary playing media element on the page ─────────
  function findActiveMediaElement() {
    const candidates = Array.from(document.querySelectorAll('video, audio')).filter(el => !el.disabled && el.readyState > 0);

    return (
      candidates.find(el => !el.paused && !el.ended) ||
      candidates.find(el => el.currentTime > 0) ||
      candidates.find(el => el.offsetParent !== null) ||
      candidates[0] ||
      null
    );
  }

  function callMediaAction(action) {
    const ms = navigator.mediaSession;
    if (ms?.actionHandlers?.get(action)) {
      ms.callActionHandler?.(action, null);
      return true;
    }
    return false;
  }

  // ── Execute media actions ──────────────────────────────────────
  function handleAction(action, value) {
    const el = findActiveMediaElement();

    try {
      switch (action) {
        case 'play':
          if (!callMediaAction('play')) el?.play();
          break;

        case 'pause':
          if (!callMediaAction('pause')) el?.pause();
          break;

        case 'toggle':
          if (el) {
            if (el.paused) {
              if (!callMediaAction('play')) el.play();
            } else {
              if (!callMediaAction('pause')) el.pause();
            }
          }
          break;

        case 'prev':
          if (!callMediaAction('previoustrack') && el) el.currentTime = 0;
          break;

        case 'next':
          if (!callMediaAction('nexttrack') && el) el.currentTime = el.duration || el.currentTime;
          break;

        case 'seek':
          if (el) {
            const target = Number(value);
            if (!Number.isNaN(target) && target >= 0) {
              el.currentTime = target;
            }
          }
          break;

        default:
          console.debug('VDI_MEDIA_ACTION unknown action:', action, value);
      }
    } catch (e) {
      console.debug('VDI_MEDIA_ACTION failed:', action, e);
    }
  }
})();
