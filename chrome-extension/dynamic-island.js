/**
 * Dynamic Island - Shared Core Module
 * Common utilities, color extraction, and lyrics handling
 */

var VDI = VDI || {};

VDI.Core = (function() {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // Time formatting
  // ─────────────────────────────────────────────────────────────
  function formatTime(s) {
    if (!s || !isFinite(s) || s < 0) return '0:00';
    s = Math.round(s);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  // ─────────────────────────────────────────────────────────────
  // Play/Pause icon SVG paths
  // ─────────────────────────────────────────────────────────────
  var ICONS = {
    play: '<path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/>',
    pause: '<path d="M8 19c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2s2 .9 2 2v10c0 1.1-.9 2-2 2zm8 0c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2s2 .9 2 2v10c0 1.1-.9 2-2 2z"/>'
  };

  function getPlayIcon(playing) {
    return playing ? ICONS.pause : ICONS.play;
  }

  // ─────────────────────────────────────────────────────────────
  // Color extraction from album art
  // ─────────────────────────────────────────────────────────────
  function extractVibrant(url, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      try {
        var W = 40, H = 40;
        var cv = document.createElement('canvas');
        cv.width = W;
        cv.height = H;
        var cx = cv.getContext('2d');
        cx.drawImage(img, 0, 0, W, H);
        var d = cx.getImageData(0, 0, W, H).data;

        // 36 buckets for hue ranges (10 degrees each)
        var buckets = new Array(36);
        for (var i = 0; i < 36; i++) {
          buckets[i] = { sumS: 0, maxS: 0, r: 0, g: 0, b: 0 };
        }

        for (var i = 0; i < W * H * 4; i += 4) {
          var r = d[i] / 255;
          var g = d[i + 1] / 255;
          var b = d[i + 2] / 255;
          var mx = Math.max(r, g, b);
          var mn = Math.min(r, g, b);
          var l = (mx + mn) / 2;
          var delta = mx - mn;

          // Skip very dark, very light, or grayscale pixels
          if (l < 0.05 || l > 0.95 || delta < 0.02) continue;

          var sat = delta / (1 - Math.abs(2 * l - 1));

          // Calculate hue
          var h = 0;
          if (mx === r) h = ((g - b) / delta) % 6;
          else if (mx === g) h = (b - r) / delta + 2;
          else h = (r - g) / delta + 4;
          h = Math.round(h * 60);
          if (h < 0) h += 360;

          var bIdx = Math.floor(h / 10) % 36;
          var score = sat * (l > 0.5 ? (1 - l) * 2 : l * 2);
          buckets[bIdx].sumS += score;

          if (sat > buckets[bIdx].maxS) {
            buckets[bIdx].maxS = sat;
            buckets[bIdx].r = r;
            buckets[bIdx].g = g;
            buckets[bIdx].b = b;
          }
        }

        // Find the bucket with highest saturation score
        var best = null;
        var maxSum = -1;
        for (var j = 0; j < 36; j++) {
          if (buckets[j].sumS > maxSum) {
            maxSum = buckets[j].sumS;
            best = buckets[j];
          }
        }

        if (!best || maxSum === 0) {
          cb(null);
          return;
        }

        // Convert to HSL with boosted saturation
        var mxA = Math.max(best.r, best.g, best.b);
        var mnA = Math.min(best.r, best.g, best.b);
        var hA = 0, sA = 0, lA = (mxA + mnA) / 2;

        if (mxA !== mnA) {
          var dA = mxA - mnA;
          sA = lA > 0.5 ? dA / (2 - mxA - mnA) : dA / (mxA + mnA);
          if (mxA === best.r) hA = (best.g - best.b) / dA + (best.g < best.b ? 6 : 0);
          else if (mxA === best.g) hA = (best.b - best.r) / dA + 2;
          else hA = (best.r - best.g) / dA + 4;
          hA = Math.round(hA * 60);
        }

        // Boost saturation and constrain lightness
        // Avoid making dull colors look "dirty" and avoid blowing out saturated colors
        sA = sA < 0.05 ? 0 : Math.min(1, sA * 1.2 + 0.1);
        lA = Math.max(0.35, Math.min(0.7, lA));

        cb({
          accent: 'hsl(' + hA + ',' + Math.round(sA * 100) + '%,' + Math.round(lA * 100) + '%)',
          gradient: 'linear-gradient(135deg, hsl(' + hA + ',' + Math.round(sA * 100) + '%,' + Math.round(lA * 100) + '%), hsl(' + ((hA + 35) % 360) + ',' + Math.round(sA * 90) + '%,' + Math.round((lA - 0.15) * 100) + '%))',
          dark: 'hsl(' + hA + ', ' + Math.round(sA * 40) + '%, 12%)',
          glow: 'hsla(' + hA + ', ' + Math.round(sA * 100) + '%, ' + Math.round(lA * 100) + '%, 0.45)'
        });
      } catch (e) {
        cb(null);
      }
    };
    img.onerror = function() {
      cb(null);
    };
    img.src = url;
  }

  // ─────────────────────────────────────────────────────────────
  // DOM Utilities
  // ─────────────────────────────────────────────────────────────
  function deepQuery(selector, root) {
    var results = [];
    var traverse = function(node) {
      var els = node.querySelectorAll(selector);
      for (var i = 0; i < els.length; i++) results.push(els[i]);
      var all = node.querySelectorAll('*');
      for (var j = 0; j < all.length; j++) {
        if (all[j].shadowRoot) traverse(all[j].shadowRoot);
      }
    };
    traverse(root || document);
    return results;
  }

  function deepQueryOne(selector, root) {
    var els = deepQuery(selector, root);
    return els.length > 0 ? els[0] : null;
  }

  // ─────────────────────────────────────────────────────────────
  // High-Res Album Art Fetching (iTunes API)
  // ─────────────────────────────────────────────────────────────
  function fetchHighResArt(title, artist, cb) {
    if (!title) return cb(null);
    var cleanTitle = title.replace(/\(.*(?:official|music|lyric|video|audio).*\)/i, '').trim();
    var cleanArtist = (artist || '').replace(/\(.*(?:official|music|lyric|video|audio).*\)/i, '').trim();
    var term = encodeURIComponent(cleanTitle + ' ' + cleanArtist);
    fetch('https://itunes.apple.com/search?term=' + term + '&media=music&limit=1')
      .then(function(res) {
        if (!res.ok) throw new Error('Bad status');
        return res.json();
      })
      .then(function(data) {
        if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
          var url = data.results[0].artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
          cb(url);
        } else {
          cb(null);
        }
      })
      .catch(function(e) {
        cb(null);
      });
  }

  // ─────────────────────────────────────────────────────────────
  // Lyrics fetching from LyricsPlus (Primary) & LRCLib (Fallback)
  // ─────────────────────────────────────────────────────────────
  var LYRICS_API = 'https://lrclib.net/api/search';
  var LYRICS_PLUS_API = 'https://lyricsplus.binimum.org/v2/lyrics/get';

  function fetchLyrics(title, artist, duration, cb) {
    var cleanTitle = title.replace(/\(.*(?:official|music|lyric|video|audio).*\)/i, '').trim();
    var cleanArtist = (artist || '').replace(/\(.*(?:official|music|lyric|video|audio).*\)/i, '').trim();
    
    var lpPromise = new Promise(function(resolve, reject) {
      var lpParams = 'title=' + encodeURIComponent(cleanTitle) + '&artist=' + encodeURIComponent(cleanArtist);
      if (duration > 0) lpParams += '&duration=' + Math.round(duration);
      
      fetch(LYRICS_PLUS_API + '?' + lpParams)
        .then(function(res) {
          if (!res.ok) throw new Error('LyricsPlus status: ' + res.status);
          return res.json();
        })
        .then(function(data) {
          if (!data || data.error || !data.lyrics || data.lyrics.length === 0) {
            throw new Error('No lyrics found in LyricsPlus');
          }
          var lines = [];
          var synced = (data.type === 'Line' || data.type === 'Word' || data.type === 'Syllable');
          var hasWords = (data.type === 'Word' || data.type === 'Syllable');
          
          for (var i = 0; i < data.lyrics.length; i++) {
            var line = data.lyrics[i];
            if (!line.text) continue;
            var l = {
              time: line.time / 1000.0,
              text: line.text,
              translation: '',
              words: []
            };
            if (hasWords && line.syllabus && line.syllabus.length > 0) {
              for (var j = 0; j < line.syllabus.length; j++) {
                var syl = line.syllabus[j];
                l.words.push({
                  time: syl.time / 1000.0,
                  duration: syl.duration / 1000.0,
                  text: syl.text
                });
              }
            }
            lines.push(l);
          }
          if (lines.length > 0 && lines[0].time >= 5) {
            lines.unshift({ time: 0, text: '♪', translation: '', words: [] });
          }
          if (lines.length > 0) {
            resolve({ lines: lines, synced: synced, url: 'https://lyricsplus.binimum.org', hasWords: hasWords });
          } else {
            throw new Error('Empty parsed lyrics');
          }
        }).catch(reject);
    });

    var lrcPromise = new Promise(function(resolve, reject) {
      var q = cleanTitle + ' ' + cleanArtist;
      var targetUrl = LYRICS_API + '?q=' + encodeURIComponent(q.trim());

      function parseLRCLib(data) {
        if (!data) return null;
        var lines = [];
        var synced = false;
        if (data.syncedLyrics) {
          synced = true;
          var raw = data.syncedLyrics.split('\n');
          var rawLines = [];
          for (var i = 0; i < raw.length; i++) {
            var m = raw[i].match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
            if (m) {
              var lineTime = parseInt(m[1]) * 60 + parseFloat(m[2]);
              var rawText = m[3].trim();
              var wordsArray = [];
              var wordRegex = /<(\d+):(\d+(?:\.\d+)?)>([^<]+)/g;
              var wMatch, hasEnhanced = false, cleanText = rawText;
              
              if (rawText.indexOf('<') !== -1 && rawText.indexOf('>') !== -1) {
                while ((wMatch = wordRegex.exec(rawText)) !== null) {
                  hasEnhanced = true;
                  wordsArray.push({
                    time: parseInt(wMatch[1]) * 60 + parseFloat(wMatch[2]),
                    duration: 0.2,
                    text: wMatch[3].trim()
                  });
                }
              }
              if (hasEnhanced && wordsArray.length > 0) {
                cleanText = '';
                for (var w = 0; w < wordsArray.length; w++) {
                  cleanText += wordsArray[w].text + ' ';
                  if (w < wordsArray.length - 1) wordsArray[w].duration = wordsArray[w+1].time - wordsArray[w].time;
                }
                cleanText = cleanText.trim();
                synced = true;
              }
              rawLines.push({ time: lineTime, text: cleanText, translation: '', words: wordsArray });
            }
          }
          rawLines.sort(function(a, b) { return a.time - b.time; });
          for (var i = 0; i < rawLines.length; i++) {
            var text = rawLines[i].text;
            if (!text) {
              var nextIdx = -1;
              for (var j = i + 1; j < rawLines.length; j++) {
                if (rawLines[j].text) { nextIdx = j; break; }
              }
              var gap = nextIdx > -1 ? rawLines[nextIdx].time - rawLines[i].time : 0;
              if (gap >= 5) lines.push({ time: rawLines[i].time, text: '♪', translation: '', words: [] });
              continue;
            }
            lines.push(rawLines[i]);
          }
          if (lines.length > 0 && lines[0].time >= 5) lines.unshift({ time: 0, text: '♪', translation: '', words: [] });
        } else if (data.plainLyrics) {
          synced = false;
          var plines = data.plainLyrics.split('\n');
          for (var j = 0; j < plines.length; j++) lines.push({ time: 0, text: plines[j].trim(), words: [] });
        }
        if (lines.length === 0) return null;
        var trackUrl = data.id ? 'https://lrclib.net/track/' + data.id : 'https://lrclib.net';
        return { lines: lines, synced: synced, url: trackUrl };
      }

      function doFetch(url, isProxy) {
        fetch(url)
          .then(function(res) {
            if (!res.ok) throw new Error('Bad status');
            return res.json();
          })
          .then(function(responseData) {
            var data = null;
            if (Array.isArray(responseData)) {
              for (var i = 0; i < responseData.length; i++) {
                if (responseData[i].syncedLyrics) { data = responseData[i]; break; }
              }
              if (!data && responseData.length > 0) data = responseData[0];
            } else {
              data = responseData;
            }
            var result = parseLRCLib(data);
            if (result) resolve({ lines: result.lines, synced: result.synced, url: result.url, hasWords: false });
            else throw new Error('No lyrics in response');
          })
          .catch(function(err) {
            if (!isProxy) doFetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl), true);
            else reject(err);
          });
      }
      doFetch(targetUrl, false);
    });

    if (typeof Promise.allSettled === 'function') {
      Promise.allSettled([lpPromise, lrcPromise]).then(function(results) {
        var lpRes = results[0].status === 'fulfilled' ? results[0].value : null;
        var lrcRes = results[1].status === 'fulfilled' ? results[1].value : null;
        if (!lpRes && !lrcRes) cb(null);
        else cb({ lyricsplus: lpRes, lrclib: lrcRes });
      });
    } else {
      // Fallback for extremely old browsers without allSettled
      var completed = 0;
      var results = { lyricsplus: null, lrclib: null };
      function checkDone() {
        if (++completed === 2) {
          if (!results.lyricsplus && !results.lrclib) cb(null);
          else cb(results);
        }
      }
      lpPromise.then(function(res) { results.lyricsplus = res; checkDone(); }).catch(function() { checkDone(); });
      lrcPromise.then(function(res) { results.lrclib = res; checkDone(); }).catch(function() { checkDone(); });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Batch Romanization via Google Translate API
  // ─────────────────────────────────────────────────────────────
  function batchRomanize(lines, cb) {
    if (!lines || lines.length === 0) return cb([]);
    
    var CHUNK_MAX = 800; // Safe chunk size for URL encoding
    var chunks = [];
    var currentChunk = [];
    var currentLen = 0;
    
    for (var i = 0; i < lines.length; i++) {
      var text = lines[i].text || '';
      // Skip instrumentals
      if (text === '♪' || text === '♫' || text === '&nbsp;' || !text.trim()) {
        currentChunk.push({ index: i, text: '' });
        continue;
      }
      var len = encodeURIComponent(text).length;
      if (currentLen + len > CHUNK_MAX && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentLen = 0;
      }
      currentChunk.push({ index: i, text: text });
      currentLen += len + 3; // +3 for \n
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);

    var results = new Array(lines.length);
    var completed = 0;

    if (chunks.length === 0) return cb(results);

    chunks.forEach(function(chunk) {
      // Strip existing pipes to avoid delimiter collision
      var texts = chunk.map(function(c) { return c.text ? c.text.replace(/\|/g, ' ') : ''; }).filter(Boolean);
      if (texts.length === 0) {
        chunk.forEach(function(c) { results[c.index] = ''; });
        completed++;
        if (completed === chunks.length) cb(results);
        return;
      }

      var q = texts.join(' | ');
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=rm&q=' + encodeURIComponent(q);
      
      fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          var romStr = '';
          if (data && data[0]) {
            for (var j = 0; j < data[0].length; j++) {
              if (data[0][j][3]) { // Romanization is usually at index 3
                romStr += data[0][j][3];
              } else if (data[0][j][2]) {
                romStr += data[0][j][2];
              }
            }
          }
          var romLines = romStr.split(/\s*\|\s*/);
          var idx = 0;
          chunk.forEach(function(c) {
            if (!c.text) {
              results[c.index] = '';
            } else {
              var rLine = romLines[idx] || '';
              // Occasionally GT capitalizes the first letter after a pipe, we can leave it
              results[c.index] = rLine.trim();
              idx++;
            }
          });
          completed++;
          if (completed === chunks.length) cb(results);
        })
        .catch(function() {
          chunk.forEach(function(c) { results[c.index] = ''; });
          completed++;
          if (completed === chunks.length) cb(results);
        });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Apple Music Media State Extractor (Isolated)
  // ─────────────────────────────────────────────────────────────
  function getAppleMusicMediaState() {
    var parseTime = function(str) {
      if (!str) return 0;
      var p = str.trim().split(':').map(Number);
      return p.length === 2 ? p[0] * 60 + p[1] : (p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : 0);
    };

    var deepQuery = function(selector, root) {
      var results = [];
      var traverse = function(node) {
        var els = node.querySelectorAll(selector);
        for (var i = 0; i < els.length; i++) results.push(els[i]);
        var all = node.querySelectorAll('*');
        for (var j = 0; j < all.length; j++) {
          if (all[j].shadowRoot) traverse(all[j].shadowRoot);
        }
      };
      traverse(root || document);
      return results;
    };

    var ms = navigator.mediaSession;
    var uiDur = 0;
    var uiCur = 0;
    
    // Apple Music Web uses MusicKit JS which heavily utilizes Shadow DOMs.
    var els = deepQuery('video, audio');
    var realEl = null;

    // Find the active element, ignoring short looping background videos
    for (var k = 0; k < els.length; k++) {
      var d = els[k].duration;
      if (!els[k].paused && els[k].currentTime > 0 && (isNaN(d) || d === Infinity || d > 30)) {
        realEl = els[k];
        break;
      }
    }
    if (!realEl && els.length > 0) {
      for (var j = 0; j < els.length; j++) {
        var d2 = els[j].duration;
        if (isNaN(d2) || d2 === Infinity || d2 > 30) {
          realEl = els[j];
          break;
        }
      }
      if (!realEl) realEl = els[0];
    }

    if (realEl) {
      uiCur = realEl.currentTime >= 0 ? realEl.currentTime : 0;
    }
    
    // Apple Music pads its HLS video durations, and ms.getPositionState is notoriously buggy on Apple Music Web.
    // The ONLY source of truth is the visual time strings in the playback controls bar.
    var playerBar = document.querySelector('#apple-music-player, .amp-playback-controls, apple-music-playback-controls, [role="region"][aria-label="Media Controls"], .web-chrome-playback-lcd') || document.body;
    var timeEls = deepQuery('[data-testid="playback-duration"], [data-testid="playback-time"], .lcd-time, [class*="time"], [class*="duration"], [class*="current"], time', playerBar);
    var times = [];
    for (var i = 0; i < timeEls.length; i++) {
      if (timeEls[i].getBoundingClientRect().width > 0) {
        var tVal = parseTime(timeEls[i].textContent);
        if (tVal > 0) times.push(tVal);
      }
    }
    if (times.length > 0) {
      times.sort(function(a, b) { return a - b; });
      // Sanity cap: discard values over 60 minutes (likely accumulated bug across songs)
      var validTimes = times.filter(function(t) { return t <= 3600; });
      if (validTimes.length > 0) {
        uiDur = validTimes[validTimes.length - 1]; // Largest valid = duration
        if (!uiCur || uiCur === 0) {
          uiCur = validTimes.length >= 2 ? validTimes[0] : (validTimes[0] !== uiDur ? validTimes[0] : 0);
        }
      } else if (times.length > 0) {
        uiDur = times[times.length - 1];
      }
    }

    if ((!uiDur || uiDur === 0) && realEl && isFinite(realEl.duration)) {
      uiDur = realEl.duration;
    }
    if (!uiDur || uiDur === 0) {
      if (ms && typeof ms.getPositionState === 'function') {
        try {
          var pState = ms.getPositionState();
          if (pState && pState.duration > 0) uiDur = pState.duration;
        } catch(e) {}
      }
    }

    var isPlaying = realEl ? !realEl.paused : (ms && ms.playbackState === 'playing');
    var art = null;
    if (ms && ms.metadata && ms.metadata.artwork && ms.metadata.artwork.length) {
      art = ms.metadata.artwork[ms.metadata.artwork.length - 1].src;
    }

    var titleEls = deepQuery('.web-chrome-playback-lcd__song-name-scroll, [data-testid="track-title"], .ticker-item, [class*="song-name"]', playerBar);
    var artistEls = deepQuery('.web-chrome-playback-lcd__sub-info-scroll, [data-testid="track-artist"], [class*="artist-name"]', playerBar);
    
    var domTitle = titleEls.length > 0 ? titleEls[0].textContent.trim() : '';
    var domArtist = artistEls.length > 0 ? artistEls[0].textContent.trim() : '';
    
    var finalTitle = (ms && ms.metadata && ms.metadata.title) || domTitle || '';
    var finalArtist = (ms && ms.metadata && ms.metadata.artist) || domArtist || '';
    
    if (!finalTitle && document.title) {
      var parts = document.title.split(' - ');
      if (parts.length >= 2) {
        finalTitle = parts[0].trim();
        if (!finalArtist) finalArtist = parts[1].trim();
      } else {
        finalTitle = document.title.replace(' - Apple Music', '').trim();
      }
    }

    var shuffleOn = false;
    var repeatMode = 'off';
    if (window.MusicKit && window.MusicKit.getInstance()) {
      var m = window.MusicKit.getInstance();
      shuffleOn = m.shuffleMode === 1;
      repeatMode = m.repeatMode === 1 ? 'one' : (m.repeatMode === 2 ? 'all' : 'off');
    }

    return {
      title: finalTitle,
      artist: finalArtist,
      artwork: art,
      isPlaying: isPlaying,
      duration: uiDur,
      position: uiCur,
      hasMedia: !!(finalTitle || uiDur > 0),
      volume: realEl ? realEl.volume : 1,
      pipOk: false, // PiP is generally blocked or custom on Apple Music
      isFullscreen: !!document.fullscreenElement,
      isYouTubeVideo: false,
      isMusicApp: true,
      shuffleOn: shuffleOn,
      repeatMode: repeatMode,
      timestamp: Date.now()
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Spotify Media State Extractor (Isolated)
  // ─────────────────────────────────────────────────────────────
  function getSpotifyMediaState() {
    var parseTime = function(str) {
      if (!str) return 0;
      var p = str.trim().split(':').map(Number);
      return p.length === 2 ? p[0] * 60 + p[1] : (p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : 0);
    };

    var durEls = document.querySelectorAll('[data-testid="playback-duration"]');
    var posEls = document.querySelectorAll('[data-testid="playback-position"]');
    var playBtn = document.querySelector('[data-testid="control-button-playpause"]');
    
    var uiDur = 0;
    for (var i = 0; i < durEls.length; i++) {
      if (durEls[i].getBoundingClientRect().width > 0) {
        var dt = parseTime(durEls[i].textContent);
        if (dt > uiDur) uiDur = dt;
      }
    }
    
    var uiCur = 0;
    for (var j = 0; j < posEls.length; j++) {
      if (posEls[j].getBoundingClientRect().width > 0) {
        var ct = parseTime(posEls[j].textContent);
        if (ct > uiCur) uiCur = ct;
      }
    }
    
    var isPlaying = playBtn ? playBtn.getAttribute('aria-label') === 'Pause' : false;

    // Spotify's UI string is often 1-3 seconds delayed due to chunked media buffering.
    // To sync lyrics perfectly, we MUST extract millisecond precision from the true audio element.
    var realCur = null;
    var els = Array.prototype.slice.call(document.querySelectorAll('video, audio'));
    var realEl = null;

    if (uiDur > 0) {
      for (var k = 0; k < els.length; k++) {
        var d = els[k].duration;
        if (d > 0 && Math.abs(d - uiDur) <= 5) { realEl = els[k]; break; }
      }
    }
    if (!realEl) {
      for (var m = 0; m < els.length; m++) {
        var d2 = els[m].duration;
        // Ignore < 30s elements to completely avoid 8-second looping Canvas videos!
        if (!els[m].paused && (isNaN(d2) || d2 === Infinity || d2 > 30)) { realEl = els[m]; break; }
      }
    }
    if (realEl && realEl.currentTime >= 0) {
      realCur = realEl.currentTime;
    }
    if (realCur !== null) {
      uiCur = realCur;
    }

    var ms = navigator.mediaSession;
    var art = null;
    if (ms && ms.metadata && ms.metadata.artwork && ms.metadata.artwork.length) {
      art = ms.metadata.artwork[ms.metadata.artwork.length - 1].src;
    }

    var shufBtn = document.querySelector('[data-testid="control-button-shuffle"], [data-testid="control-button-smart-shuffle"], button[aria-label*="shuffle" i]');
    var repBtn = document.querySelector('[data-testid="control-button-repeat"], button[aria-label*="repeat" i]');
    var shuffleOn = shufBtn ? (
      shufBtn.getAttribute('aria-checked') === 'true' ||
      shufBtn.getAttribute('aria-checked') === 'mixed' ||
      shufBtn.getAttribute('aria-pressed') === 'true' ||
      shufBtn.getAttribute('aria-pressed') === 'mixed' ||
      shufBtn.getAttribute('data-state') === 'active' ||
      shufBtn.classList.contains('active')
    ) : false;
    var repeatMode = 'off';
    if (repBtn) {
      var ariaChecked = repBtn.getAttribute('aria-checked');
      if (ariaChecked === 'true' || ariaChecked === 'mixed') {
        repeatMode = repBtn.getAttribute('aria-label') && repBtn.getAttribute('aria-label').toLowerCase().indexOf('one') > -1 ? 'one' : 'all';
      }
    }

    return {
      title: (ms && ms.metadata && ms.metadata.title) || document.title.replace(' - Spotify', '').trim() || '',
      artist: (ms && ms.metadata && ms.metadata.artist) || '',
      artwork: art,
      isPlaying: isPlaying,
      duration: uiDur,
      position: uiCur,
      hasMedia: !!((ms && ms.metadata && ms.metadata.title) || uiDur > 0),
      volume: 1, 
      pipOk: false,
      isFullscreen: !!document.fullscreenElement,
      isYouTubeVideo: false,
      isMusicApp: true,
      shuffleOn: shuffleOn,
      repeatMode: repeatMode,
      timestamp: Date.now()
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Tab media state extraction (injected into content pages)
  // ─────────────────────────────────────────────────────────────
  function getTabMediaState() {
    var deepQuery = VDI.Core.deepQuery;
    var deepQueryOne = VDI.Core.deepQueryOne;
    var getAppleMusicMediaState = VDI.Core.getAppleMusicMediaState;
    var getSpotifyMediaState = VDI.Core.getSpotifyMediaState;
    // URL LOCKDOWN: Only detect media on supported sites
    var ALLOWED_HOSTS = ['music.apple.com', 'open.spotify.com', 'spotify.com', 'youtube.com', 'www.youtube.com', 'music.youtube.com'];
    var host = window.location.hostname;
    var isAllowed = false;
    for (var i = 0; i < ALLOWED_HOSTS.length; i++) {
      if (host === ALLOWED_HOSTS[i] || host.endsWith('.' + ALLOWED_HOSTS[i])) { isAllowed = true; break; }
    }
    if (!isAllowed) return null;

    // 100% ISOLATION: Intercept Apple Music immediately
    if (window.location.hostname.includes('music.apple.com')) {
      return getAppleMusicMediaState();
    }

    // 100% ISOLATION: Intercept Spotify immediately
    if (window.location.hostname.includes('spotify.com')) {
      return getSpotifyMediaState();
    }

    var vids = document.querySelectorAll('video');
    var auds = document.querySelectorAll('audio');
    var isYTMusic = window.location.hostname === 'music.youtube.com';
    var pipOk = !!(!isYTMusic && document.pictureInPictureEnabled && vids.length &&
          Array.prototype.slice.call(vids).some(function(v) { return !v.disablePictureInPicture; }));

    var uiDur = null;
    var uiCur = null;

    try {
      if (isYTMusic) {
        var timeInfo = document.querySelector('.time-info.ytmusic-player-bar');
        if (timeInfo) {
          var parts = timeInfo.textContent.trim().split('/');
          if (parts.length === 2) {
            var parseTime = function(str) {
              var p = str.trim().split(':').map(Number);
              return p.length === 2 ? p[0] * 60 + p[1] : (p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : 0);
            };
            uiCur = parseTime(parts[0]);
            uiDur = parseTime(parts[1]);
          }
        }
      } else if (window.location.hostname.indexOf('youtube.com') > -1) {
        var td = document.querySelector('.ytp-time-duration');
        if (td) {
          uiDur = td.textContent.trim().split(':').reduce(function(a, v) {
            return (60 * a) + parseInt(v);
          }, 0);
        }
      }
    } catch (e) {}

    // Find the best video element
    var el = null;

    // For YouTube (non-Music), match by duration
    if (uiDur !== null && uiDur > 0 && !isYTMusic) {
      for (var i = 0; i < vids.length; i++) {
        if (Math.abs(vids[i].duration - uiDur) <= 2) {
          el = vids[i];
          break;
        }
      }
    }

    // Find currently playing video
    if (!el) {
      for (var i = 0; i < vids.length; i++) {
        if (!vids[i].paused && vids[i].currentTime > 0) {
          el = vids[i];
          break;
        }
      }
    }

    // Fallback to main video selector
    if (!el) el = document.querySelector('.html5-main-video');
    if (!el && vids.length) el = vids[vids.length - 1];
    if (!el && auds.length) el = auds[0];

    try {
      var ms = navigator.mediaSession;
      var art = null;
      if (ms && ms.metadata && ms.metadata.artwork && ms.metadata.artwork.length) {
        art = ms.metadata.artwork[ms.metadata.artwork.length - 1].src;
      }

      var finalPos = (uiCur !== null) ? uiCur : (el ? el.currentTime : 0);

      var shuffleOn = false;
      var repeatMode = 'off';
      if (isYTMusic) {
        var playerBar = document.querySelector('ytmusic-player-bar');
        var shuffleEl = playerBar ? playerBar.querySelector('ytmusic-toggle-button-renderer.shuffle') : null;
        if (shuffleEl) {
          var sLabel = (shuffleEl.getAttribute('aria-label') || '').toLowerCase();
          shuffleOn = shuffleEl.getAttribute('aria-pressed') === 'true' ||
                      shuffleEl.hasAttribute('active') ||
                      sLabel.includes(' on');
        }
        var repeatEl = playerBar ? playerBar.querySelector('ytmusic-toggle-button-renderer.repeat') : null;
        if (repeatEl) {
          var rLabel = (repeatEl.getAttribute('aria-label') || '').toLowerCase();
          var rPressed = repeatEl.getAttribute('aria-pressed') === 'true' || repeatEl.hasAttribute('active');
          if (rLabel.includes('one') || rLabel.includes('1')) repeatMode = 'one';
          else if (rPressed || rLabel.includes(' on')) repeatMode = 'all';
        }
      }
        var rb = deepQueryOne('tp-yt-paper-icon-button.repeat, .repeat, [aria-label*="repeat" i], [title*="repeat" i]', playerBar);
        if (rb) {
          var rbInner = VDI.Core.deepQueryOne('button, tp-yt-paper-icon-button', rb) || rb;
          var rbWrap = rb.closest('ytmusic-toggle-button-renderer, ytmusic-like-button-renderer, button, tp-yt-paper-icon-button') || rb;
          var rbTitle = (rbWrap.getAttribute('title') || rbWrap.getAttribute('aria-label') || '').toLowerCase();
          var isPressed = rb.getAttribute('aria-pressed') === 'true' || rbInner.getAttribute('aria-pressed') === 'true' || rbWrap.getAttribute('aria-pressed') === 'true' || rbWrap.hasAttribute('active');
          if (rbTitle.includes('one') || rbTitle.includes('1')) {
            repeatMode = 'one';
          } else if (isPressed || rbTitle.includes('all') || rbTitle.includes('on')) {
            repeatMode = 'all';
          }
        }
      }

      return {
        title: (ms && ms.metadata && ms.metadata.title) || '',
        artist: (ms && ms.metadata && ms.metadata.artist) || '',
        artwork: art,
        isPlaying: (ms && ms.playbackState === 'playing') || (el ? !el.paused : false),
        duration: (uiDur !== null && uiDur > 0) ? uiDur : (el ? (isFinite(el.duration) ? el.duration : 0) : 0),
        position: finalPos,
        hasMedia: !!(el || (ms && ms.metadata && ms.metadata.title)),
        volume: el ? el.volume : 1,
        pipOk: pipOk,
        isFullscreen: !!document.fullscreenElement,
        isYouTubeVideo: location.hostname.includes('youtube.com') && !location.hostname.includes('music.youtube.com'),
        isMusicApp: location.hostname.includes('music.youtube') || location.hostname.includes('spotify') || location.hostname.includes('soundcloud') || location.hostname.includes('music.apple'),
        shuffleOn: shuffleOn,
        repeatMode: repeatMode,
        timestamp: Date.now()
      };
    } catch (e) {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Media actions (injected into content pages)
  // ─────────────────────────────────────────────────────────────
  function executeMediaAction(act, val) {
    var deepQuery = VDI.Core.deepQuery;
    var deepQueryOne = VDI.Core.deepQueryOne;
    
    // 100% ISOLATION: Intercept Spotify immediately
    if (window.location.hostname.includes('spotify.com')) {
      if (act === 'toggle') {
        var tb = document.querySelector('[data-testid="control-button-playpause"]');
        if (tb) tb.click();
      } else if (act === 'prev') {
        var pb = document.querySelector('[data-testid="control-button-skip-back"]');
        if (pb) pb.click();
      } else if (act === 'next') {
        var nb = document.querySelector('[data-testid="control-button-skip-forward"]');
        if (nb) nb.click();
      } else if (act === 'shuffle') {
        var sb = document.querySelector('[data-testid="control-button-shuffle"], [data-testid="control-button-smart-shuffle"], button[aria-label*="shuffle" i]');
        if (sb) sb.click();
      } else if (act === 'repeat') {
        var rb = document.querySelector('[data-testid="control-button-repeat"], button[aria-label*="repeat" i]');
        if (rb) rb.click();
      } else if (act === 'seek' && typeof val === 'number') {
        var durEls = document.querySelectorAll('[data-testid="playback-duration"]');
        var dur = 0;
        for (var i = 0; i < durEls.length; i++) {
          if (durEls[i].getBoundingClientRect().width > 0) {
            var p = durEls[i].textContent.trim().split(':').map(Number);
            var dt = p.length === 2 ? p[0] * 60 + p[1] : (p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : 0);
            if (dt > dur) dur = dt;
          }
        }
        if (dur > 0) {
          var bars = document.querySelectorAll('[data-testid="progress-bar"], [data-testid="playback-progressbar"], .playback-bar');
          var bar = null;
          for (var j = 0; j < bars.length; j++) {
            if (bars[j].getBoundingClientRect().width > 0) { bar = bars[j]; break; }
          }
          if (bar) {
            var rect = bar.getBoundingClientRect();
              var cx = rect.left + (rect.width * (val / dur));
              var cy = rect.top + (rect.height / 2);
              var target = document.elementFromPoint(cx, cy) || bar;
              
              var evOpts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, button: 0, buttons: 1 };
              
              if (typeof PointerEvent !== 'undefined') {
                target.dispatchEvent(new PointerEvent('pointerdown', evOpts));
                target.dispatchEvent(new PointerEvent('pointerup', evOpts));
              }
              target.dispatchEvent(new MouseEvent('mousedown', evOpts));
              target.dispatchEvent(new MouseEvent('mouseup', evOpts));
              target.dispatchEvent(new MouseEvent('click', evOpts));
            }
          }
        }
      return;
    }
    
    try {
      // 100% ISOLATION: Intercept Apple Music actions
      if (window.location.hostname.includes('music.apple.com')) {
        // Vivaldi Web Panel executes this in the MAIN world natively, so MusicKit is available!
        if (window.MusicKit && window.MusicKit.getInstance()) {
          var m = window.MusicKit.getInstance();
          if (act === 'toggle') { m.isPlaying ? m.pause() : m.play(); return; }
          else if (act === 'prev') { m.skipToPreviousItem(); return; }
          else if (act === 'next') { m.skipToNextItem(); return; }
          else if (act === 'seek' && typeof val === 'number') { m.seekToTime(val); return; }
          else if (act === 'shuffle') { m.shuffleMode = m.shuffleMode === 0 ? 1 : 0; return; }
          else if (act === 'repeat') { m.repeatMode = (m.repeatMode + 1) % 3; return; }
        }

        if (act === 'toggle') {
          var tb = deepQueryOne('button[aria-label*="Play"], button[aria-label*="Pause"], button[aria-label*="play"], button[aria-label*="pause"]');
          if (tb) tb.click();
        } else if (act === 'prev') {
          var pb = deepQueryOne('button[aria-label*="Previous"], button[title*="Previous"], button[aria-label*="previous"]');
          if (pb) pb.click();
        } else if (act === 'next') {
          var nb = deepQueryOne('button[aria-label*="Next"], button[title*="Next"], button[aria-label*="next"]');
          if (nb) nb.click();
        } else if (act === 'seek' && typeof val === 'number') {
          var ms = navigator.mediaSession;
          var dur = 0;
          if (ms && typeof ms.getPositionState === 'function') {
            try {
              var pState = ms.getPositionState();
              if (pState && pState.duration > 0) dur = pState.duration;
            } catch(e) {}
          }
          // Fallback to our scoped UI duration if ms fails
          if (!dur || dur === 0) {
            var playerBar = document.querySelector('#apple-music-player, .amp-playback-controls, apple-music-playback-controls, [role="region"][aria-label="Media Controls"], .web-chrome-playback-lcd') || document.body;
            var timeEls = deepQuery('[class*="time"], [class*="duration"], [class*="current"], time', playerBar);
            var times = [];
            for (var i = 0; i < timeEls.length; i++) {
              if (timeEls[i].getBoundingClientRect().width > 0) {
                var p = timeEls[i].textContent.trim().split(':').map(Number);
                var tVal = p.length === 2 ? p[0] * 60 + p[1] : (p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : 0);
                if (tVal > 0) times.push(tVal);
              }
            }
            if (times.length > 0) {
              times.sort(function(a, b) { return a - b; });
              dur = times[times.length - 1]; 
            }
          }

          if (dur > 0) {
            // Find the progress bar (it will be the widest slider on the page)
            var bars = deepQuery('input[type="range"], [role="slider"], [aria-label*="progress"], [aria-label*="time"], [class*="progress"]');
            var bar = null;
            var maxWidth = 0;
            for (var j = 0; j < bars.length; j++) {
              var rect = bars[j].getBoundingClientRect();
              if (rect.width > maxWidth && rect.height > 0) { 
                maxWidth = rect.width;
                bar = bars[j]; 
              }
            }
            if (bar) {
              var br = bar.getBoundingClientRect();
              var cx = br.left + (br.width * (val / dur));
              var cy = br.top + (br.height / 2);
              var target = document.elementFromPoint(cx, cy) || bar;
              
              var evOpts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, button: 0, buttons: 1 };
              if (typeof PointerEvent !== 'undefined') {
                target.dispatchEvent(new PointerEvent('pointerdown', evOpts));
                target.dispatchEvent(new PointerEvent('pointerup', evOpts));
              }
              target.dispatchEvent(new MouseEvent('mousedown', evOpts));
              target.dispatchEvent(new MouseEvent('mouseup', evOpts));
              target.dispatchEvent(new MouseEvent('click', evOpts));

              // Force the underlying input to register the state change!
              var inputEl = bar.tagName.toLowerCase() === 'input' ? bar : bar.querySelector('input[type="range"]');
              if (inputEl) {
                var pct = val / dur;
                var max = parseFloat(inputEl.max) || 100;
                try {
                  var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                  nativeInputValueSetter.call(inputEl, pct * max);
                } catch(e) {
                  try { inputEl.value = pct * max; } catch(e2) {}
                }
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                inputEl.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          }
        }
        return;
      }

      var els = deepQuery('video, audio');
      var el = null;

      // Find active element
      for (var i = 0; i < els.length; i++) {
        if (!els[i].paused && !els[i].ended) {
          el = els[i];
          break;
        }
      }
      if (!el) {
        for (var j = 0; j < els.length; j++) {
          if (els[j].paused && els[j].currentTime > 0) {
            el = els[j];
            break;
          }
        }
      }
      if (!el && els.length) el = els[0];

      if (act === 'toggle') {
        var tb = deepQueryOne('#play-pause-button, .ytp-play-button, .play-pause-button');
        if (tb && typeof tb.click === 'function') {
          tb.click();
        } else if (el) {
          if (el.paused) el.play();
          else el.pause();
        }
      } else if (act === 'prev') {
        if (el) {
          var pb = deepQueryOne('ytmusic-player-bar .previous-button, .ytp-prev-button, .previous-button');
          if (pb) pb.click();
          else el.currentTime = 0;
        }
      } else if (act === 'next') {
        if (el) {
          var nb = deepQueryOne('ytmusic-player-bar .next-button, .ytp-next-button, .next-button');
          if (nb) nb.click();
          else el.currentTime = el.duration;
        }
      } else if (act === 'shuffle') {
        var sb = deepQueryOne('ytmusic-player-bar .shuffle, ytmusic-player-bar .shuffle-button, [aria-label*="shuffle" i], [title*="shuffle" i]');
        if (sb) sb.click();
      } else if (act === 'repeat') {
        var rb = deepQueryOne('ytmusic-player-bar .repeat, ytmusic-player-bar .repeat-button, [aria-label*="repeat" i], [title*="repeat" i]');
        if (rb) rb.click();
      } else if (act === 'seek' && typeof val === 'number') {
        var isYTM = window.location.hostname === 'music.youtube.com';
        var v = deepQuery('video, audio');
        var u = null;
        var uc = null;

        try {
          if (isYTM) {
            var t = document.querySelector('.time-info.ytmusic-player-bar');
            if (t) {
              var p = t.textContent.trim().split('/');
              if (p.length === 2) {
                var pT = function(s) {
                  var z = s.trim().split(':').map(Number);
                  return z.length === 2 ? z[0] * 60 + z[1] : (z.length === 3 ? z[0] * 3600 + z[1] * 60 + z[2] : 0);
                };
                uc = pT(p[0]);
                u = pT(p[1]);
              }
            }
          } else {
            var td = document.querySelector('.ytp-time-duration');
            if (td) {
              u = td.textContent.trim().split(':').reduce(function(a, x) {
                return (60 * a) + parseInt(x);
              }, 0);
            }
          }
        } catch (e) {}

        var target = null;
        if (u > 0 && !isYTM) {
          for (var i = 0; i < v.length; i++) {
            if (Math.abs(v[i].duration - u) <= 2) {
              target = v[i];
              break;
            }
          }
        }
        if (!target) target = document.querySelector('.html5-main-video');
        if (!target && v.length) target = v[v.length - 1];

        if (target) {
          if (isYTM && uc !== null && u > 0) {
            var offset = target.currentTime - uc;
            target.currentTime = val + offset;
          } else {
            target.currentTime = val;
          }
        }
      }
    } catch (e) {}
  }

  function togglePiP(sourceInfo) {
    function teleportBack() {
      if (sourceInfo) {
        try {
          if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'VDI_TELEPORT_BACK', source: sourceInfo });
          }
        } catch (e) {}
      }
    }

    function showPiPOverlay(videoElement) {
      if (document.getElementById('vdi-pip-overlay')) return;
      var overlay = document.createElement('div');
      overlay.id = 'vdi-pip-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.zIndex = '2147483647'; // Max z-index
      overlay.style.cursor = 'pointer';
      overlay.style.background = 'rgba(0, 0, 0, 0.8)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.backdropFilter = 'blur(5px)';
      overlay.style.transition = 'opacity 0.2s';
      
      var msg = document.createElement('div');
      msg.style.background = 'rgba(255, 255, 255, 0.1)';
      msg.style.color = '#fff';
      msg.style.padding = '20px 30px';
      msg.style.borderRadius = '16px';
      msg.style.fontFamily = 'system-ui, sans-serif';
      msg.style.fontSize = '20px';
      msg.style.fontWeight = '600';
      msg.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
      msg.style.border = '1px solid rgba(255,255,255,0.2)';
      msg.innerHTML = '<div style="margin-bottom:8px;font-size:24px;text-align:center;">🎬</div>Click anywhere to enter Picture-in-Picture';
      
      overlay.appendChild(msg);
      
      overlay.onclick = function() {
        overlay.style.opacity = '0';
        setTimeout(function() { overlay.remove(); }, 200);
        try {
          videoElement.requestPictureInPicture().then(function() {
            teleportBack();
          }).catch(function() {
            teleportBack();
          });
        } catch (e) {
          teleportBack();
        }
      };
      
      (document.documentElement || document.body).appendChild(overlay);
    }

    try {
      var vids = Array.prototype.slice.call(document.querySelectorAll('video'));
      var v = null;
      for (var i = 0; i < vids.length; i++) {
        if (!vids[i].paused) {
          v = vids[i];
          break;
        }
      }
      if (!v && vids.length) v = vids[0];
      if (!v) return false;

      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().then(function() {
          teleportBack();
        }).catch(function() {
          teleportBack();
        });
        return true;
      }

      // Try direct first (works in Chrome Extension with user gesture)
      var promise = v.requestPictureInPicture();
      if (promise && promise.catch) {
        promise.then(function() {
          teleportBack();
        }).catch(function(err) {
          showPiPOverlay(v);
        });
      }
      return true;
    } catch (e) {
      showPiPOverlay(v);
      return true;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────
  return {
    formatTime: formatTime,
    getPlayIcon: getPlayIcon,
    extractVibrant: extractVibrant,
    fetchLyrics: fetchLyrics,
    batchRomanize: batchRomanize,
    getTabMediaState: getTabMediaState,
    deepQuery: deepQuery,
    deepQueryOne: deepQueryOne,
    getAppleMusicMediaState: getAppleMusicMediaState,
    getSpotifyMediaState: getSpotifyMediaState,
    executeMediaAction: executeMediaAction,
    togglePiP: togglePiP
  };
})();


/**
 * Dynamic Island - Shared CSS Styles
 * Generates CSS string based on configuration
 */

var VDI = VDI || {};

VDI.Styles = (function() {
  'use strict';

  var DEFAULTS = {
    accent: '#6366f1',
    gradient: 'linear-gradient(135deg,#6366f1,#a855f7)',
    dark: 'hsl(244,40%,6%)'
  };

  function generate(opts) {
    opts = opts || {};
    var islandTop = opts.islandTop || 10;
    var accent = opts.accent || DEFAULTS.accent;
    var gradient = opts.gradient || DEFAULTS.gradient;
    var dark = opts.dark || DEFAULTS.dark;

    var rules = [];

    // ═══════════════════════════════════════════════════════════
    // Main Container
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi{',
        'position:fixed;top:' + islandTop + 'px;left:50%;transform:translateX(-50%);',
        'z-index:2147483647;border-radius:32px;overflow:hidden;user-select:none;cursor:default;',
        'width:168px;height:34px;',
        'background:var(--vdi-dark,' + dark + ');',
        'box-shadow:0 0 0 1px rgba(255,255,255,.08),0 10px 40px rgba(0,0,0,.8),0 0 80px var(--vdi-glow,rgba(99,102,241,.18));',
        'opacity:0;pointer-events:none;',
        'font-family:-apple-system,Inter,Segoe UI,sans-serif;',
        '-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;letter-spacing:normal;line-height:normal;',
        'transition:width .55s cubic-bezier(0.34, 1.56, 0.64, 1),height .55s cubic-bezier(0.34, 1.56, 0.64, 1),',
          'border-radius .55s cubic-bezier(0.34, 1.56, 0.64, 1),background .7s ease,box-shadow .7s ease,opacity .3s ease;',
      '}'
    );

    // State classes
    rules.push('#vdi.vdi-visible{opacity:1;pointer-events:all;}');
    rules.push('#vdi.vdi-expanded{width:400px;height:152px;border-radius:26px;}');
    rules.push('#vdi.vdi-idle{width:28px!important;height:28px!important;border-radius:14px!important;opacity:.95!important;}');

    // ═══════════════════════════════════════════════════════════
    // Collapsed Pill View
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-col{',
        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);',
        'width:168px;height:34px;box-sizing:border-box;',
        'display:flex;align-items:center;gap:8px;padding:0 13px;',
        'opacity:1;transition:opacity .18s ease;',
      '}'
    );
    rules.push('#vdi.vdi-expanded #vdi-col{opacity:0;pointer-events:none;}');
    rules.push('#vdi.vdi-idle #vdi-col{justify-content:center;padding:0;width:28px;height:28px;}');
    rules.push('#vdi.vdi-idle #vdi-col-text,#vdi.vdi-idle #vdi-col-btn{display:none;}');

    // EQ Visualizer
    rules.push(
      '#vdi-eq{',
        'display:flex;align-items:flex-end;justify-content:center;gap:3px;',
        'width:16px;height:12px;flex-shrink:0;',
      '}'
    );
    rules.push(
      '.vdi-eq-bar{',
        'width:3px;height:3px;',
        'background:var(--vdi-accent,' + accent + ');',
        'border-radius:1.5px;',
        'transition:height .15s ease, background .7s ease;',
      '}'
    );

    // Track text
    rules.push('#vdi-col-text{flex:1;overflow:hidden;white-space:nowrap;transition:width 0.3s ease, flex 0.3s ease;}');
    rules.push(
      '#vdi-col-inner{',
        'display:inline-block;font-size:11px;font-weight:500;color:rgba(255,255,255,.82);',
        'animation:vdi-scroll 9s linear infinite;',
      '}'
    );
    rules.push('@keyframes vdi-scroll{0%,28%{transform:translateX(0)}72%{transform:translateX(-55%)}100%{transform:translateX(0)}}');
    rules.push('#vdi-col-btn{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;}');

    // ═══════════════════════════════════════════════════════════
    // Expanded View
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-exp{',
        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(.9);',
        'width:400px;height:152px;box-sizing:border-box;',
        'display:flex;align-items:center;padding:14px 15px;gap:13px;',
        'opacity:0;',
        'transition:opacity .28s ease .13s,transform .28s ease .13s;pointer-events:none;',
      '}'
    );
    rules.push('#vdi.vdi-expanded #vdi-exp{opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:all;}');

    rules.push(
      '#vdi-teleport-btn{',
        'position:absolute;top:14px;right:46px;width:20px;height:20px;z-index:50;',
        'background:none;border:none;border-radius:50%;padding:3px;cursor:pointer;',
        'color:rgba(255,255,255,0.45);opacity:1;transition:color 0.2s,transform 0.15s;display:flex;flex-shrink:0;',
      '}',
      '#vdi-teleport-btn:hover{color:rgba(255,255,255,0.9);transform:scale(1.15);}',
      '#vdi-teleport-btn svg{width:100%;height:100%;pointer-events:none;}'
    );

    // Album Art
    rules.push(
      '#vdi-art{',
        'width:74px !important;height:74px !important;min-width:74px !important;min-height:74px !important;border-radius:14px !important;flex-shrink:0 !important;overflow:hidden !important;isolation:isolate !important;box-sizing:border-box !important;padding:0 !important;margin:0 !important;border:none !important;',
        'background:var(--vdi-grad,' + gradient + ');',
        'box-shadow:0 4px 20px rgba(0,0,0,.5);',
        'display:flex;align-items:center;justify-content:center;position:relative;',
        'transition:background .7s ease;',
      '}'
    );
    rules.push('#vdi-art img{position:absolute !important;inset:0 !important;width:100% !important;height:100% !important;max-width:100% !important;max-height:100% !important;object-fit:cover !important;border-radius:14px !important;opacity:0;transition:opacity .4s ease, filter .4s ease;box-sizing:border-box !important;padding:0 !important;margin:0 !important;border:none !important;display:block !important;min-width:100% !important;min-height:100% !important;}');
    rules.push('#vdi-art img.ok{opacity:1 !important;}');
    rules.push('#vdi-art-ph{font-size:28px;line-height:1;}');

    // Track Info
    rules.push('#vdi-track{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0;}');
    rules.push('#vdi-title-row{display:flex;align-items:center;gap:6px;min-width:0;}');
    rules.push('#vdi-title{flex:1;font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}');

    rules.push('#vdi-artist{font-size:11px;color:rgba(255,255,255,.38);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}');

    // ═══════════════════════════════════════════════════════════
    // Progress Bar
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-prog-row{display:flex;align-items:center;gap:5px;}');
    rules.push('.vdi-t{font-size:9px;color:rgba(255,255,255,.5);min-width:22px;}');
    rules.push('#vdi-prog{flex:1;height:4px;background:rgba(255,255,255,.15);border-radius:99px;cursor:pointer;position:relative;}');
    rules.push(
      '#vdi-prog-fill{',
        'height:100%;width:0%;border-radius:99px;',
        'background:var(--vdi-accent,' + accent + ') ;',
        'transition:width .6s linear, background .7s ease;',
      '}'
    );

    // ═══════════════════════════════════════════════════════════
    // Control Buttons
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-ctrl-row{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}');
    rules.push('#vdi-ctrl-main{display:flex;align-items:center;gap:6px;}');
    rules.push('#vdi-ctrl-extra{display:flex;align-items:center;gap:3px;}');

    // Standard button
    rules.push(
      '.vdi-btn{',
        'width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(255,255,255,.07);color:rgba(255,255,255,.75);',
        'transition:background .2s,transform .15s,color .15s;',
      '}'
    );
    rules.push('.vdi-btn:hover{background:rgba(255,255,255,.16);color:#fff;transform:scale(1.1);}');
    rules.push('.vdi-btn:active{transform:scale(.92);}');
    rules.push('.vdi-btn svg{width:16px;height:16px;pointer-events:none;}');
    rules.push('#vdi-shuffle, #vdi-repeat{background:transparent;color:rgba(255,255,255,.4);}');
    rules.push('#vdi-shuffle:hover, #vdi-repeat:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.9);}');
    rules.push('#vdi-shuffle.vdi-active, #vdi-repeat.vdi-active{color:var(--vdi-accent,' + accent + ') !important; filter: drop-shadow(0 0 6px var(--vdi-accent,' + accent + '));}');
    rules.push('#vdi-repeat{position:relative;}');

    // Icon button (smaller, square-ish)
    rules.push(
      '.vdi-icon-btn{',
        'width:28px;height:28px;border-radius:8px;border:none;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(255,255,255,.06);color:rgba(255,255,255,.55);',
        'transition:background .2s,color .2s,transform .15s;',
      '}'
    );
    rules.push('.vdi-icon-btn:hover{background:rgba(255,255,255,.15);color:#fff;transform:scale(1.08);}');
    rules.push('.vdi-icon-btn.active{color:var(--vdi-accent,' + accent + ');}');
    rules.push('.vdi-icon-btn.loading{pointer-events: none;}');
    rules.push(
      '.vdi-loading-dots{',
        'display:flex;gap:3px;align-items:center;justify-content:center;height:100%;',
      '}'
    );
    rules.push('.vdi-loading-dots span{width:4px;height:4px;background:currentColor;border-radius:50%;animation:vdi-bounce 0.6s infinite alternate;}');
    rules.push('.vdi-loading-dots span:nth-child(2){animation-delay:0.2s;}');
    rules.push('.vdi-loading-dots span:nth-child(3){animation-delay:0.4s;}');
    rules.push('@keyframes vdi-bounce{ 0%{transform:translateY(0);} 100%{transform:translateY(-3px);} }');
    rules.push('.vdi-icon-btn svg{width:15px;height:15px;pointer-events:none;}');

    // Play button (special styling)
    rules.push(
      '#vdi-play{',
        'width:40px;height:40px;border-radius:50%;',
        'background:var(--vdi-grad,' + gradient + ');',
        'color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.45);',
        'display:flex;align-items:center;justify-content:center;border:none;',
        'cursor:pointer;transition:background .7s ease, transform .15s;',
      '}'
    );
    rules.push('#vdi-play:hover{transform:scale(1.08);filter:brightness(1.1);}');
    rules.push('#vdi-play svg{width:18px;height:18px;}');

    // ═══════════════════════════════════════════════════════════
    // Lyrics Panel
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-lyrics-panel{',
        'position:fixed;left:50%;transform:translateX(-50%) translateY(-10px);',
        'z-index:2147483646;width:400px;height:380px;border-radius:32px;overflow:hidden;',
        'font-family:-apple-system,Inter,Segoe UI,sans-serif;',
        'background:rgba(0,0,0,0.5);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);',
        'border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.6);',
        'opacity:0;pointer-events:none;',
        'transition:opacity 0.4s cubic-bezier(.32,.72,0,1), transform 0.4s cubic-bezier(.32,.72,0,1);',
        'display:flex;flex-direction:column;padding:24px 0;box-sizing:border-box;',
      '}'
    );
    rules.push('#vdi-lyrics-panel.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:all;}');

    rules.push(
      '#vdi-lyrics-scroll{width:100%;height:100%;overflow-y:auto;overflow-x:hidden;padding:50% 24px;box-sizing:border-box;scroll-behavior:smooth;}',
      '#vdi-lyrics-footer{position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:11px;color:rgba(255,255,255,0.4);padding:4px 0;background:linear-gradient(to top, rgba(0,0,0,0.4), transparent);pointer-events:none;z-index:10;}',
      '#vdi-resume-scroll-btn{position:absolute;top:16px;left:50%;transform:translateX(-50%) translateY(-20px);z-index:20;background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:16px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;opacity:0;pointer-events:none;transition:all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);}',
      '#vdi-resume-scroll-btn:hover{background:rgba(255,255,255,0.25);transform:translateX(-50%) scale(1.05);}',
      '#vdi-resume-scroll-btn.show{opacity:1;pointer-events:all;transform:translateX(-50%) translateY(0);}',
      '#vdi-lyrics-scroll{',
        'flex:1;overflow-y:auto;scroll-behavior:smooth;padding:0 32px;',
        'mask-image:linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);',
        '-webkit-mask-image:linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);',
      '}'
    );
    rules.push('#vdi-lyrics-scroll::-webkit-scrollbar{display:none;}');

    // Lyric lines
    rules.push(
      '.vdi-lyric-line{',
        'font-size:22px;font-weight:700;line-height:1.6;color:rgba(255,255,255,0.3);',
        'padding:16px 0;',
        'margin: 0 10px;',
        'transition:color 0.3s ease, transform 0.3s cubic-bezier(0.2,0.8,0.2,1), filter 0.3s ease;',
        'transform-origin:center center;cursor:pointer;',
        'filter:blur(2px);transform:scale(0.95);',
      '}'
    );
    rules.push('.vdi-lyric-line:hover{color:rgba(255,255,255,0.6);filter:blur(0px);}');
    rules.push(
      '.vdi-lyric-line.active{',
        'transform:scale(1.05);text-shadow:0 4px 20px rgba(0,0,0,0.5);filter:blur(0px);',
        'color: #fff;',
      '}'
    );
    rules.push('#vdi-romanize-btn:hover{background:rgba(255,255,255,0.2) !important; color:#fff !important;}');
    rules.push('#vdi-romanize-btn.active{background:#fff !important; color:#000 !important;}');
    rules.push('@keyframes sweep{ 0%{background-position:100% 0;} 100%{background-position:0% 0;} }');
    rules.push('.vdi-lyric-line.active{color:rgba(255,255,255,1);filter:blur(0);transform:scale(1.1);}',
      '.vdi-lyric-line.has-words.active{color:rgba(255,255,255,0.5);}',
      '.vdi-lyric-word{transition:color 0.15s ease-out, text-shadow 0.15s ease-out;}',
      '.vdi-lyric-word.active-word{color:#fff;text-shadow:0 0 16px rgba(255,255,255,0.4);}',
      '.vdi-lyric-roman{font-size:14px;font-weight:500;color:inherit;opacity:0.6;margin-top:4px;}'
    );
    rules.push('.vdi-lyric-line.unsynced{font-size:16px;color:rgba(255,255,255,0.8);transform:none;filter:none;}');
    rules.push('.vdi-lyric-translation{font-size:14px;color:rgba(255,255,255,0.5);margin-top:6px;font-weight:500;}');
    rules.push(
      '.vdi-lyrics-source{',
        'font-size:12px;color:rgba(255,255,255,0.4);margin-top:40px;text-align:center;',
      '}'
    );
    rules.push(
      '.vdi-lyrics-source a{',
        'color:rgba(255,255,255,0.6);text-decoration:none;font-weight:600;transition:color 0.2s;',
      '}'
    );
    rules.push('.vdi-lyrics-source a:hover{color:#fff;}');
    rules.push(
      '.vdi-instrumental-wrapper{',
        'display:flex;justify-content:center;align-items:center;height:40px;margin-top:8px;',
      '}'
    );
    rules.push(
      '.vdi-instrumental{',
        'position:relative;width:32px;height:32px;',
      '}'
    );
    rules.push(
      '.vdi-note-bg, .vdi-note-fill{',
        'position:absolute;top:0;left:0;width:100%;height:100%;',
        'fill:rgba(255,255,255,0.2);',
      '}'
    );
    rules.push(
      '.vdi-note-fill{',
        'fill:#fff;',
        'clip-path:inset(100% 0 0 0);',
        '-webkit-clip-path:inset(100% 0 0 0);',
      '}'
    );

    // Provider Menu
    rules.push(
      '#vdi-prov-menu{position:absolute;bottom:12px;right:12px;display:flex;gap:6px;z-index:100;}',
      '.vdi-prov-btn{',
        'display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:12px;',
        'background:rgba(255,255,255,0.1);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
        'font-size:11px;font-weight:600;color:rgba(255,255,255,0.4);',
        'cursor:not-allowed;transition:all 0.2s; border: 1px solid rgba(255,255,255,0.05);',
      '}',
      '.vdi-prov-btn.has-lyr{cursor:pointer; color:rgba(255,255,255,0.7);}',
      '.vdi-prov-btn.has-lyr:hover{background:rgba(255,255,255,0.2);}',
      '.vdi-prov-btn.active{background:rgba(255,255,255,0.25); color:#fff; border-color:rgba(255,255,255,0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.2);}',
      '.vdi-prov-dot{width:6px;height:6px;border-radius:50%;background:#ff4444;box-shadow:0 0 8px rgba(255,68,68,0.5);transition:all 0.2s;}',
      '.vdi-prov-btn.has-lyr .vdi-prov-dot{background:#44ff44;box-shadow:0 0 8px rgba(68,255,68,0.5);}'
    );    // ═══════════════════════════════════════════════════════════
    // Snap Zones (Drop Indicators)
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-snap-zones{position:fixed;inset:0;pointer-events:none;z-index:2147483646;opacity:0;transition:opacity .3s;}',
      '#vdi-snap-zones.active{opacity:1;}',
      '.vdi-sz{position:absolute;background:rgba(255,255,255,0.06);border:2px dashed rgba(255,255,255,0.3);border-radius:26px;transition:all .25s cubic-bezier(0.34, 1.56, 0.64, 1);}',
      '.vdi-sz-t{top:10px;left:50%;transform:translateX(-50%);width:400px;height:152px;}',
      '.vdi-sz-b{bottom:10px;left:50%;transform:translateX(-50%);width:400px;height:152px;}',
      '.vdi-sz-l{top:50%;left:10px;transform:translateY(-50%);width:400px;height:152px;}',
      '.vdi-sz-r{top:50%;right:10px;transform:translateY(-50%);width:400px;height:152px;}',
      '.vdi-sz.active{background:rgba(99,102,241,0.15);border-color:#6366f1;box-shadow:0 0 30px rgba(99,102,241,0.3);transform:translateX(-50%) scale(1.03);}',
      '.vdi-sz-l.active, .vdi-sz-r.active{transform:translateY(-50%) scale(1.03);}'
    );

    // Settings Panel & Gear Icon
    rules.push(
      '#vdi-settings-btn{',
        'width:24px;height:24px;position:absolute;top:10px;left:10px;border-radius:50%;',
        'display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;',
        'transition:all 0.2s;background:rgba(255,255,255,0.1);z-index:3;',
      '}',
      '#vdi:hover #vdi-settings-btn{opacity:1;}',
      '#vdi-settings-btn:hover{background:rgba(255,255,255,0.25);transform:rotate(45deg);}',
      '#vdi-settings-btn svg{width:14px;height:14px;fill:rgba(255,255,255,0.8);}',

      '#vdi-stg-tooltip{position:fixed; width:180px; background:rgba(20,20,30,0.9); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; display:none; flex-direction:column; gap:8px; z-index:2147483647; box-shadow:0 10px 20px rgba(0,0,0,0.5); opacity:0; pointer-events:none; transition:opacity 0.3s, transform 0.3s; transform:translateY(-10px); font-family:system-ui,sans-serif;}',
      '#vdi-stg-tooltip.show{opacity:1; pointer-events:all; transform:translateY(0);}',
      '#vdi-stg-tooltip:before{content:""; position:absolute; top:-6px; left:16px; border-left:6px solid transparent; border-right:6px solid transparent; border-bottom:6px solid rgba(20,20,30,0.9);}',
      '#vdi-stg-tooltip span{font-size:12px; color:rgba(255,255,255,0.9); font-weight:500; line-height:1.4;}',
      '#vdi-stg-tooltip-btn{background:var(--vdi-accent, #6366f1); border:none; color:#fff; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit;}',
      '#vdi-stg-tooltip-btn:hover{filter:brightness(1.2);}',
      '#vdi-settings-panel{',
        'position:fixed;width:280px;padding:16px;',
        'background:rgba(20,20,30,0.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);',
        'border:1px solid rgba(255,255,255,0.1);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.5);',
        'display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);',
        'transform:translateX(-50%);z-index:2147483647;font-family:system-ui,sans-serif;',
      '}',
      '#vdi-settings-panel.show{opacity:1;pointer-events:all;}',
      '.vdi-stg-row{display:flex;justify-content:space-between;align-items:center; margin-bottom:12px;}',
      '.vdi-stg-label{color:rgba(255,255,255,0.9);font-size:13px;font-weight:500;}',
      '.vdi-stg-sub{font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px;}',
      '.vdi-switch{position:relative;display:inline-block;width:36px;height:20px;}',
      '.vdi-switch input{opacity:0;width:0;height:0;}',
      '.vdi-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:rgba(255,255,255,0.1);transition:.3s;border-radius:20px;border:1px solid rgba(255,255,255,0.1);}',
      '.vdi-slider:before{position:absolute;content:"";height:14px;width:14px;left:2px;bottom:2px;background-color:rgba(255,255,255,0.6);transition:.3s;border-radius:50%;}',
      '.vdi-switch input:checked + .vdi-slider{background-color:var(--vdi-accent, #6366f1);border-color:transparent;}',
      '.vdi-switch input:checked + .vdi-slider:before{transform:translateX(16px);background-color:#fff;}',
      '.vdi-stg-header{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--vdi-accent, #6366f1);margin-bottom:4px;font-weight:600;opacity:0.8;}',
      '.vdi-preset-btn{background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:rgba(255,255,255,0.8); padding:4px 0; width:22%; border-radius:8px; cursor:pointer; font-family:inherit; font-size:11px; font-weight:600; transition:all 0.2s;}',
      '.vdi-preset-btn:hover{background:var(--vdi-accent, #6366f1); color:#fff; border-color:transparent;}'
    );

    return rules.join('');
  }

  return {
    generate: generate,
    DEFAULTS: DEFAULTS
  };
})();


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
    var returnTabId = null;
    var S = {
      isPlaying: false,
      title: '',
      artist: '',
      artwork: null,
      duration: 0,
      position: 0,
      hasMedia: false,
      tabId: null,
      windowId: null,
      supportsPiP: false
    };

    var pollInterval = 1000;

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
            returnTabId = null;
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
      } else if (msg.type === 'VDI_TELEPORT_BACK' && msg.source) {
        if (msg.source.tabId) chrome.tabs.update(msg.source.tabId, { active: true });
        if (msg.source.winId) chrome.windows.update(msg.source.winId, { focused: true });
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


/**
 * Dynamic Island - Shared UI Component
 * Manages the DOM, interactions, and visual updates
 */

var VDI = VDI || {};

VDI.UI = (function() {
  'use strict';

  // URL lockdown moved to core.js media detection — island must render on ALL tabs
  // so users can control music from any page

  var DEFAULTS = VDI.Styles.DEFAULTS;

  function createIsland(opts) {
    opts = opts || {};

    var island = document.createElement('div');
    island.id = 'vdi';

    island.innerHTML =
      '<div id="vdi-col">' +
        '<div id="vdi-eq">' +
          '<div class="vdi-eq-bar b1"></div>' +
          '<div class="vdi-eq-bar b2"></div>' +
          '<div class="vdi-eq-bar b3"></div>' +
        '</div>' +
        '<div id="vdi-col-text"><span id="vdi-col-inner">No media</span></div>' +
        '<div id="vdi-col-btn"><svg id="vdi-col-icon" viewBox="0 0 24 24" fill="white" width="10" height="10">' + VDI.Core.getPlayIcon(false) + '</svg></div>' +
      '</div>' +
      '<div id="vdi-exp">' +
        '<div id="vdi-settings-btn" title="Settings">' +
          '<svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"></path></svg>' +
        '</div>' +
        '<button id="vdi-close-btn" title="Hide Island" style="position:absolute; top:12px; right:12px; z-index:100; background:rgba(255,255,255,0.1); border:none; border-radius:50%; width:24px; height:24px; color:rgba(255,255,255,0.6); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
        '</button>' +
        '<button id="vdi-teleport-btn" title="Jump to Media Tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg></button>' +
        '<div id="vdi-art">' +
          '<div id="vdi-art-ph">\uD83C\uDFB5</div>' +
          '<img id="vdi-art-img" src="" alt="" crossorigin="anonymous"/>' +
        '</div>' +
        '<div id="vdi-track">' +
          '<div id="vdi-title-row">' +
            '<div id="vdi-title">No media</div>' +
          '</div>' +
          '<div id="vdi-artist">Open a media tab</div>' +
          '<div id="vdi-prog-row">' +
            '<span class="vdi-t" id="vdi-pos">0:00</span>' +
            '<div id="vdi-prog"><div id="vdi-prog-fill"></div></div>' +
            '<span class="vdi-t" id="vdi-dur" style="text-align:right">0:00</span>' +
          '</div>' +
          '<div id="vdi-ctrl-row">' +
            '<div id="vdi-ctrl-main">' +
              '<button class="vdi-btn" id="vdi-shuffle" title="Shuffle" style="display:none;"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg></button>' +
              '<button class="vdi-btn" id="vdi-prev" title="Previous"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>' +
              '<button class="vdi-btn" id="vdi-play" title="Play/Pause"><svg id="vdi-pp" viewBox="0 0 24 24" fill="currentColor">' + VDI.Core.getPlayIcon(false) + '</svg></button>' +
              '<button class="vdi-btn" id="vdi-next" title="Next"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>' +
              '<button class="vdi-btn" id="vdi-repeat" title="Repeat" style="display:none;"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg></button>' +
            '</div>' +
            '<div id="vdi-ctrl-extra">' +
              '<button class="vdi-icon-btn" id="vdi-lyr-btn" title="Lyrics">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>' +
              '</button>' +
              '<button class="vdi-icon-btn" id="vdi-pip-main-btn" title="Picture-in-Picture" style="display:none;">' +
                '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 7H9c-1.1 0-2 .9-2 2v3H5v3h2v3c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 10H9v-3h4v-3h6v6z"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    return island;
  }

  function createSettingsPanel(opts) {
    opts = opts || {};
    var panel = document.createElement('div');
    panel.id = 'vdi-settings-panel';
    panel.innerHTML =
      '<div class="vdi-stg-header">General</div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Hide on YouTube</span><span class="vdi-stg-sub">Hides the island completely while on YouTube</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-hideyt"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Hide on YT Music</span><span class="vdi-stg-sub">Hides the island completely while on YT Music</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-hideytm"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Hide on Spotify</span><span class="vdi-stg-sub">Hides the island completely while on Spotify</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-hidespotify"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Hide on Apple Music</span><span class="vdi-stg-sub">Hides the island completely on Apple Music</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-hideapplemusic"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-header" style="margin-top:8px;">Features</div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Enable Lyrics Engine</span><span class="vdi-stg-sub">Fetch and display time-synced lyrics</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-enlyrics"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Free Placement</span><span class="vdi-stg-sub">Allow dragging anywhere on the screen</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-freeplace"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-header" style="margin-top:8px;">Presets</div>' +
      '<div class="vdi-stg-row" style="justify-content:space-between; margin-top:4px;">' +
        '<button class="vdi-preset-btn" id="vdi-stg-pos-t" title="Snap to Top Center">Top</button>' +
        '<button class="vdi-preset-btn" id="vdi-stg-pos-b" title="Snap to Bottom Center">Bottom</button>' +
        '<button class="vdi-preset-btn" id="vdi-stg-pos-l" title="Snap to Left Edge">Left</button>' +
        '<button class="vdi-preset-btn" id="vdi-stg-pos-r" title="Snap to Right Edge">Right</button>' +
      '</div>' +
      '</div>';
    return panel;
  }

  function createSettingsTooltip() {
    var tt = document.createElement('div');
    tt.id = 'vdi-stg-tooltip';
    tt.innerHTML = 
      '<span>You can now customize the island from the settings menu!</span>' +
      '<button id="vdi-stg-tooltip-btn">Got it</button>';
    return tt;
  }

  function createLyricsPanel(opts) {
    opts = opts || {};
    var panel = document.createElement('div');
    panel.id = 'vdi-lyrics-panel';
    panel.innerHTML = 
      '<button id="vdi-romanize-btn" title="Show Romanization (KR/JP)" style="display:none; position:absolute; top:12px; right:12px; z-index:100; background:rgba(255,255,255,0.1); border:none; border-radius:50%; width:32px; height:32px; color:rgba(255,255,255,0.6); cursor:pointer; align-items:center; justify-content:center; transition:all 0.2s;">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">' +
          '<path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>' +
        '</svg>' +
      '</button>' +
      '<button id="vdi-resume-scroll-btn">Resume Autoscroll</button>' +
      '<div id="vdi-lyrics-scroll"></div>' +
      '<div id="vdi-prov-menu">' +
        '<div class="vdi-prov-btn" id="vdi-prov-lp"><span class="vdi-prov-dot"></span> LyricsPlus</div>' +
        '<div class="vdi-prov-btn" id="vdi-prov-lrc"><span class="vdi-prov-dot"></span> LRCLib</div>' +
      '</div>';
    return panel;
  }

  function createController(island, lyrPanel, stgPanel, platform, opts) {
    opts = opts || {};
    var isVivaldi = opts.isVivaldi || false;

    var state = {
      isPlaying: false,
      title: '',
      artist: '',
      artwork: null,
      duration: 0,
      position: 0,
      hasMedia: false,
      tabId: null,
      windowId: null,
      lastArtwork: null,
      lastArtTitle: null,
      supportsPiP: false,
      lyricsOn: false,
      autoscroll: true,
      isSeeking: false,
      isPlayToggling: false,
      shuffleOn: false,
      repeatMode: 'off',
      lyricsLines: [],
      lyricsIdx: -1,
      lastLyricsKey: '',
      isIdle: false,
      lyricsSynced: false,
      romanizeOn: false,
      hasNonLatin: false
    };

    function performSeek(targetPos) {
      state.isSeeking = true;
      if (state.seekTimeout) clearTimeout(state.seekTimeout);
      state.seekTimeout = setTimeout(function() {
        state.isSeeking = false;
        state.forceNextSync = true;
      }, 2000);
      
      state.position = targetPos;
      state.basePosition = targetPos;
      state.lastSyncTime = Date.now();
      
      refreshProgress();
      syncLyrics();
      platform.sendAction(state.tabId, 'seek', targetPos);
    }

    var idleTimer = null;
    var colTimer = null;
    var tickInterval = opts.tickInterval || 1000;
    var idleDelay = opts.idleDelay || 9000;
    var collapseDelay = opts.collapseDelay || 500;
    var isDragging = false;
    var settings = { hideYouTube: false, hideYouTubeMusic: false, hideSpotify: false, hideAppleMusic: false, enableLyrics: true, freePlacement: true, seenTooltip: false };

    // Helper
    function $(id) { return document.getElementById(id); }

    var cachedWords = null;

    // Theme application
    function applyTheme(c) {
      var accent = c ? c.accent : DEFAULTS.accent;
      var grad = c ? c.gradient : DEFAULTS.gradient;
      var dark = c ? c.dark : DEFAULTS.dark;
      var glow = c ? c.glow : 'rgba(99,102,241,.2)';

      island.style.setProperty('--vdi-accent', accent);
      island.style.setProperty('--vdi-grad', grad);
      island.style.setProperty('--vdi-dark', dark);
      island.style.setProperty('--vdi-glow', glow);
      
      if (typeof stgPanel !== 'undefined' && stgPanel) {
        stgPanel.style.setProperty('--vdi-accent', accent);
        stgPanel.style.setProperty('--vdi-grad', grad);
        stgPanel.style.setProperty('--vdi-dark', dark);
        stgPanel.style.setProperty('--vdi-glow', glow);
      }
    }

    // Update progress bar
    function refreshProgress() {
      var pct = state.duration > 0 ? Math.min(100, (state.position / state.duration) * 100) : 0;
      $('vdi-prog-fill').style.width = pct + '%';
      $('vdi-pos').textContent = VDI.Core.formatTime(state.position);
      $('vdi-dur').textContent = VDI.Core.formatTime(state.duration);

      // Dynamically fill instrumental notes based on exact seek position
      var instWrappers = document.querySelectorAll('.vdi-instrumental-wrapper');
      for (var i = 0; i < instWrappers.length; i++) {
        var start = parseFloat(instWrappers[i].getAttribute('data-start'));
        var dur = parseFloat(instWrappers[i].getAttribute('data-dur'));
        if (dur > 0) {
          var progress = (state.position - start) / dur;
          progress = Math.max(0, Math.min(1, progress));
          var fill = instWrappers[i].querySelector('.vdi-note-fill');
          if (fill) fill.style.clipPath = 'inset(' + (100 - (progress * 100)) + '% 0 0 0)';
        }
      }
    }

    // Update play/pause icons
    function setPlayIcon(playing) {
      var svg = VDI.Core.getPlayIcon(playing);
      if ($('vdi-pp')) $('vdi-pp').innerHTML = svg;
      if ($('vdi-col-icon')) $('vdi-col-icon').innerHTML = svg;
    }

    // Main UI update
    var manuallyClosed = false;

    function updateUI() {
      var isBrowserFs = document.getElementById('browser') && document.getElementById('browser').classList.contains('fullscreen');
      
      var onYTM = opts.isVivaldi ? state.isMusicApp : window.location.hostname.includes('music.youtube.com');
      var onYT = opts.isVivaldi ? state.isYouTubeVideo : (window.location.hostname.includes('youtube.com') && !window.location.hostname.includes('music.youtube.com'));
      var onSpotify = window.location.hostname.includes('spotify.com');
      var onAppleMusic = window.location.hostname.includes('music.apple.com');
      
      var isHiddenByApp = (state.isMusicApp && settings.hideYouTubeMusic && onYTM) || 
                          (state.isYouTubeVideo && settings.hideYouTube && onYT) ||
                          (settings.hideSpotify && onSpotify) ||
                          (settings.hideAppleMusic && onAppleMusic);
      
      var hideIsland = !state.hasMedia || state.isFullscreen || isBrowserFs || document.fullscreenElement || manuallyClosed || isHiddenByApp;

      if (hideIsland) {
        island.style.display = 'none';
        if (lyrPanel) lyrPanel.style.display = 'none';
        return;
      }
      island.style.display = '';
      if (lyrPanel) lyrPanel.style.display = '';
      island.classList.add('vdi-visible');

      var shouldShowLyrics = settings.enableLyrics && !state.isYouTubeVideo;
      if ($('vdi-lyr-btn')) $('vdi-lyr-btn').style.display = shouldShowLyrics ? '' : 'none';
      if (!shouldShowLyrics && state.lyricsOn) {
        state.lyricsOn = false;
        if ($('vdi-lyr-btn')) $('vdi-lyr-btn').classList.remove('active');
        if (lyrPanel) lyrPanel.classList.remove('show');
      }

      var label = [state.title, state.artist].filter(Boolean).join(' \u2014 ') || 'Now Playing';
      $('vdi-col-inner').textContent = label;
      $('vdi-title').textContent = state.title || 'Unknown Track';
      $('vdi-artist').textContent = state.artist || 'Unknown Artist';

      if ($('vdi-shuffle')) {
        $('vdi-shuffle').style.display = (state.isYouTubeVideo || !state.isMusicApp) ? 'none' : '';
        if (state.shuffleOn) $('vdi-shuffle').classList.add('vdi-active');
        else $('vdi-shuffle').classList.remove('vdi-active');
      }

      if ($('vdi-repeat')) {
        $('vdi-repeat').style.display = (state.isYouTubeVideo || !state.isMusicApp) ? 'none' : '';
        $('vdi-repeat').classList.remove('vdi-active', 'vdi-repeat-one');
        var repeatSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>';
        var repeatOneSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="15.5" font-size="8.5" font-weight="900" font-family="sans-serif" text-anchor="middle">1</text></svg>';
        if (state.repeatMode !== 'off') {
          $('vdi-repeat').classList.add('vdi-active');
        }
        if (state.repeatMode === 'one') {
          $('vdi-repeat').classList.add('vdi-repeat-one');
          $('vdi-repeat').innerHTML = repeatOneSvg;
        } else {
          $('vdi-repeat').innerHTML = repeatSvg;
        }
      }

      setPlayIcon(state.isPlaying);

      if (state.supportsPiP && !state.isMusicApp) {
        $('vdi-pip-main-btn').style.display = 'flex';
      } else {
        $('vdi-pip-main-btn').style.display = 'none';
      }

      // Lyrics button is handled by settings.enableLyrics above
      // Album art
      if (state.artwork && (state.artwork !== state.lastArtwork || state.title !== state.lastArtTitle)) {
        // If we already fetched high res for this exact title, and the background gave us the low res again, ignore it!
        var skipArtUpdate = (state.highResFetchedFor === state.title && state.artwork.includes('i.ytimg.com'));

        if (!skipArtUpdate) {
          state.lastArtwork = state.artwork;
          state.lastArtTitle = state.title;
          var img = $('vdi-art-img');
          img.classList.remove('ok');
          
          var loadImg = function(url) {
            img.src = url;
            img.onload = function() {
              img.classList.add('ok');
              $('vdi-art-ph').style.display = 'none';
            };
            img.onerror = function() {
              $('vdi-art-ph').style.display = 'flex';
            };
          };

          if (state.artwork.includes('i.ytimg.com') || state.artwork.includes('hqdefault')) {
            loadImg(state.artwork); // Load low res first
            if (VDI.Core.fetchHighResArt && state.highResFetchedFor !== state.title) {
              state.highResFetchedFor = state.title; // Mark as fetched immediately to prevent race conditions
              VDI.Core.fetchHighResArt(state.title, state.artist, function(highResUrl) {
                if (highResUrl) {
                  state.artwork = highResUrl;
                  state.lastArtwork = highResUrl;
                  // Swap to high res, color extractor will pick it up
                  var tempImg = new Image();
                  tempImg.onload = function() {
                    img.src = highResUrl;
                    VDI.Core.extractVibrant(tempImg, function(rgb) {
                      if (rgb) {
                        $('vdi').style.background = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
                      }
                    });
                  };
                  tempImg.crossOrigin = 'Anonymous';
                  tempImg.src = highResUrl;
                }
              });
            }
          } else {
            loadImg(state.artwork);
          }
          
          VDI.Core.extractVibrant(state.artwork, applyTheme);
        }
      } else if (!state.artwork && state.lastArtwork) {
        state.lastArtwork = null;
        var im2 = $('vdi-art-img');
        im2.classList.remove('ok');
        im2.src = '';
        $('vdi-art-ph').style.display = 'flex';
        applyTheme(null);
      }

      refreshProgress();
    }

    function updateLyricsPanelPosition() {
      var lyr = $('vdi-lyrics-panel');
      if (!lyr || !state.lyricsOn) return;
      
      var r = island.getBoundingClientRect();
      var islandTop = r.top;
      var islandLeft = r.left + (r.width / 2);
      var expH = 152;
      
      var ch = window.innerHeight;
      
      // Horizontal: center with island (left is already centered via transform)
      lyr.style.left = islandLeft + 'px';
      
      // Vertical: flip based on screen half
      if (islandTop > ch / 2 - (expH / 2)) {
        // Bottom half: put above
        lyr.style.top = 'auto';
        lyr.style.bottom = (ch - islandTop + 16) + 'px';
        lyr.style.maxHeight = Math.max(100, islandTop - 32) + 'px';
      } else {
        // Top half: put below the fully expanded island
        var islandBottom = islandTop + expH;
        lyr.style.bottom = 'auto';
        lyr.style.top = (islandBottom + 16) + 'px';
        lyr.style.maxHeight = Math.max(100, ch - islandBottom - 32) + 'px';
      }
    }

    function updateTooltipPosition() {
      var stgTooltip = $('vdi-stg-tooltip');
      if (!stgTooltip) return;
      var r = island.getBoundingClientRect();
      // Gear icon is at top:10px, height:24px. So bottom of gear is r.top + 34.
      stgTooltip.style.top = (r.top + 42) + 'px';
      stgTooltip.style.left = (r.left + 4) + 'px';
    }

    function updateSettingsPanelPosition() {
      var stgPanel = $('vdi-settings-panel');
      if (!stgPanel || !stgPanel.classList.contains('show')) return;
      var r = island.getBoundingClientRect();
      var ch = window.innerHeight;
      var expH = 152;
      var islandTop = r.top;
      
      if (islandTop > ch / 2 - (expH / 2)) {
        stgPanel.style.top = 'auto';
        stgPanel.style.bottom = (ch - islandTop + 16) + 'px';
      } else {
        var islandBottom = islandTop + expH;
        stgPanel.style.bottom = 'auto';
        stgPanel.style.top = (islandBottom + 16) + 'px';
      }
      stgPanel.style.left = (r.left + r.width / 2) + 'px';
    }

    // Lyrics handling
    function fetchAndRenderLyrics() {
      var key = state.title + '|' + state.artist;
      state.lastLyricsKey = key;
      state.lyricsLines = [];
      state.lyricsIdx = -1;
      state.lyricsSynced = false;
      state.hasLyrics = undefined;
      state.multiLyrics = null;
      if (!state.selectedProvider) state.selectedProvider = 'lyricsplus';

      $('vdi-lyr-btn').classList.add('loading');
      $('vdi-lyr-btn').style.pointerEvents = 'auto'; // Reset
      $('vdi-lyr-btn').innerHTML = '<div class="vdi-loading-dots"><span></span><span></span><span></span></div>';
      $('vdi-lyrics-scroll').innerHTML = '<div class="vdi-lyric-line unsynced" style="text-align:center;margin-top:50px;">Loading lyrics...</div>';

      function handleMultiResult(res, k) {
        if (k !== state.lastLyricsKey) return;
        if (!res) res = { lyricsplus: null, lrclib: null };
        state.multiLyrics = res;
        
        // Auto-select provider
        if (state.selectedProvider === 'lyricsplus' && !res.lyricsplus && res.lrclib) {
          state.selectedProvider = 'lrclib';
        } else if (state.selectedProvider === 'lrclib' && !res.lrclib && res.lyricsplus) {
          state.selectedProvider = 'lyricsplus';
        } else if (!res.lyricsplus && !res.lrclib) {
          state.selectedProvider = 'lyricsplus'; // Default on total failure
        }
        
        renderLyricsData(key);
      }

      try {
        var cached = localStorage.getItem('vdi_lyr_multi_' + key);
        if (cached) {
          var data = JSON.parse(cached);
          if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
            handleMultiResult(data.payload, key);
            return;
          }
        }
      } catch(e) {}

      var handleFetchResult = function(result) {
        if (result) {
          try {
            localStorage.setItem('vdi_lyr_multi_' + key, JSON.stringify({ 
              payload: result,
              timestamp: Date.now() 
            }));
          } catch (e) {}
        }
        handleMultiResult(result, key);
      };

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'VDI_FETCH_LYRICS',
          title: state.title,
          artist: state.artist,
          duration: state.duration
        }, handleFetchResult);
      } else {
        VDI.Core.fetchLyrics(state.title, state.artist, state.duration, handleFetchResult);
      }
    }

    window.vdiSwitchProvider = function(prov) {
      if (!state.multiLyrics || !state.multiLyrics[prov]) return; // Cannot switch to null provider
      state.selectedProvider = prov;
      renderLyricsData(state.lastLyricsKey);
    };

    function renderLyricsData(key) {
        if (key !== state.lastLyricsKey) return;
        var m = state.multiLyrics || { lyricsplus: null, lrclib: null };
        var provData = m[state.selectedProvider];
        var lines = provData ? provData.lines : [];
        var synced = provData ? provData.synced : false;
        var shouldShowLyrics = settings.enableLyrics && !state.isYouTubeVideo;

        $('vdi-lyr-btn').classList.remove('loading');
        $('vdi-lyr-btn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';

        var hasAny = (m.lyricsplus !== null || m.lrclib !== null);

        if (!hasAny) {
          state.hasLyrics = false;
          $('vdi-lyr-btn').style.display = shouldShowLyrics ? 'flex' : 'none';
          $('vdi-lyr-btn').style.opacity = '0.2';
          $('vdi-lyr-btn').style.pointerEvents = 'none'; // Completely disable
          
          $('vdi-lyrics-scroll').innerHTML = '<div class="vdi-lyric-line unsynced" style="text-align:center;margin-top:50px;color:rgba(255,255,255,0.4);font-size:16px;">Lyrics not found for this track.</div>';
          var romBtn = $('vdi-romanize-btn');
          if (romBtn) romBtn.style.display = 'none';
          return;
        }

        // We have lyrics on at least one provider.
        state.hasLyrics = true;
        $('vdi-lyr-btn').style.opacity = '1';
        $('vdi-lyr-btn').style.pointerEvents = 'auto';
        $('vdi-lyr-btn').style.display = shouldShowLyrics ? 'flex' : 'none';
        
        state.lyricsLines = lines;
        state.lyricsSynced = synced;
        state.hasWords = provData ? provData.hasWords : false;

        // Update provider menu UI
        var btnLp = $('vdi-prov-lp');
        var btnLrc = $('vdi-prov-lrc');
        if (btnLp && btnLrc) {
          btnLp.className = 'vdi-prov-btn' + (m.lyricsplus ? ' has-lyr' : '') + (state.selectedProvider === 'lyricsplus' ? ' active' : '');
          btnLrc.className = 'vdi-prov-btn' + (m.lrclib ? ' has-lyr' : '') + (state.selectedProvider === 'lrclib' ? ' active' : '');
        }
        
        // Detect if any lines have non-Latin script
        var anyNonLatin = false;
        var hasKanjiOrKana = function(t) {
          for (var i = 0; i < t.length; i++) {
            var c = t.charCodeAt(i);
            if (c >= 0x0400 && c <= 0x04FF) return true; // Cyrillic
            if (c >= 0x0900 && c <= 0x0D7F) return true; // Indic
            if (c >= 0xAC00 && c <= 0xD7A3) return true; // Hangul
            if (c >= 0x3040 && c <= 0x9FFF) return true; // CJK
          }
          return false;
        };

        for (var c = 0; c < lines.length; c++) {
          if (hasKanjiOrKana(lines[c].text || '')) {
            anyNonLatin = true;
            break;
          }
        }
        state.hasNonLatin = anyNonLatin;

        var html = '';
        for (var k = 0; k < lines.length; k++) {
          var cls = 'vdi-lyric-line';
          if (state.hasWords && lines[k].words && lines[k].words.length > 0) cls += ' has-words';
          if (!synced) cls += ' unsynced';
          var text = lines[k].text || '&nbsp;';
          var wordsHtml = '&nbsp;';
          
          var duration = 2; // default fallback
          if (synced && k < lines.length - 1) {
            duration = lines[k+1].time - lines[k].time;
            if (duration < 0.5) duration = 0.5;
          } else if (synced) {
            duration = 4; // last line
          }

          var isInst = text.indexOf('♪') > -1 || text.indexOf('♫') > -1 || !lines[k].text || lines[k].text.trim() === '';
          if (isInst) {
            var notePath = 'M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z';
            wordsHtml = '<div class="vdi-instrumental-wrapper" data-start="' + lines[k].time + '" data-dur="' + duration + '"><div class="vdi-instrumental">' +
              '<svg class="vdi-note-bg" viewBox="0 0 24 24"><path d="' + notePath + '"/></svg>' +
              '<svg class="vdi-note-fill" viewBox="0 0 24 24"><path d="' + notePath + '"/></svg>' +
            '</div></div>';
            cls += ' vdi-lyr-inst vdi-instrumental-break';
          } else {
            // Full line highlight or word-by-word highlight
            if (state.hasWords && lines[k].words && lines[k].words.length > 0) {
              wordsHtml = '';
              for (var w = 0; w < lines[k].words.length; w++) {
                var word = lines[k].words[w];
                wordsHtml += '<span class="vdi-lyric-word" data-start="' + word.time + '" style="--w-dur: ' + Math.max(0.2, word.duration) + 's;">' + word.text + '</span>';
              }
            } else {
              wordsHtml = text.replace(/\n/g, '<br>');
            }
          }

          var transHtml = '';
          if (lines[k].translation) {
            transHtml = '<div class="vdi-lyric-translation">' + lines[k].translation + '</div>';
          }

          html += '<div class="' + cls + '" id="vdi-lyr-' + k + '">' + wordsHtml + transHtml + '</div>';
        }
        $('vdi-lyrics-scroll').innerHTML = html;
        $('vdi-lyr-btn').style.display = shouldShowLyrics ? 'flex' : 'none';

        // Async fetch romanization if needed
        if (anyNonLatin && VDI.Core.batchRomanize) {
          var handleRomanizeResult = function(roms) {
            if (key !== state.lastLyricsKey) return;
            for (var r = 0; r < roms.length; r++) {
              var romText = roms[r];
              var lineEl = document.getElementById('vdi-lyr-' + r);
              var origText = lines[r].text || '';
              if (lineEl && romText && romText.toLowerCase() !== origText.toLowerCase() && origText.indexOf('♪') === -1) {
                var romDiv = document.createElement('div');
                romDiv.className = 'vdi-lyric-roman';
                romDiv.textContent = romText;
                romDiv.style.display = state.romanizeOn ? 'block' : 'none';
                
                var transDiv = lineEl.querySelector('.vdi-lyric-translation');
                if (transDiv) {
                  lineEl.insertBefore(romDiv, transDiv);
                } else {
                  lineEl.appendChild(romDiv);
                }
              }
            }
          };

          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
              type: 'VDI_BATCH_ROMANIZE',
              lines: lines
            }, handleRomanizeResult);
          } else {
            VDI.Core.batchRomanize(lines, handleRomanizeResult);
          }
        }

        // Show/hide romanize toggle
        var romBtn = $('vdi-romanize-btn');
        if (romBtn) {
          romBtn.style.display = anyNonLatin ? 'flex' : 'none';
          romBtn.classList.toggle('active', state.romanizeOn);
          romBtn.onclick = function() {
            state.romanizeOn = !state.romanizeOn;
            romBtn.classList.toggle('active', state.romanizeOn);
            var allRoman = document.querySelectorAll('.vdi-lyric-roman');
            for (var r = 0; r < allRoman.length; r++) {
              allRoman[r].style.display = state.romanizeOn ? 'block' : 'none';
            }
            // Re-scroll to active line after layout shift
            setTimeout(function() {
              var activeLine = document.querySelector('.vdi-lyric-line.active');
              if (activeLine) {
                activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 50);
          };
          // Apply initial state
          var allRoman = document.querySelectorAll('.vdi-lyric-roman');
          for (var r = 0; r < allRoman.length; r++) {
            allRoman[r].style.display = state.romanizeOn ? 'block' : 'none';
          }
        }

        if (state.lyricsOn) lyrPanel.classList.add('show');

        // Bind click handlers for synced lyrics
        if (synced) {
          for (var n = 0; n < lines.length; n++) {
            (function(tTarget, idx) {
              var lineEl = document.getElementById('vdi-lyr-' + idx);
              if (lineEl) {
                lineEl.addEventListener('click', function(e) {
                  e.stopPropagation();
                  performSeek(tTarget);
                });
              }
            })(lines[n].time, n);
          }
        }
      }

    function syncLyrics() {
      if (!state.lyricsLines.length || !state.lyricsSynced) return;

      var pos = state.position;
      // Add a tiny lookahead so CSS transitions finish exactly on the sung word
      var lookahead = 0.1;
      
      var idx = -1;

      for (var i = state.lyricsLines.length - 1; i >= 0; i--) {
        if (state.lyricsLines[i].time <= pos + 0.1) {
          idx = i;
          break;
        }
      }

      if (idx !== state.lyricsIdx) {
        var prevActive = document.querySelector('.vdi-lyric-line.active');
        if (prevActive) {
          prevActive.classList.remove('active');
          if (state.hasWords) {
            var activeWords = prevActive.querySelectorAll('.vdi-lyric-word.active-word');
            for (var j = 0; j < activeWords.length; j++) {
              activeWords[j].classList.remove('active-word');
            }
          }
        }

        var newActive = $('vdi-lyr-' + idx);
        if (newActive) {
          newActive.classList.add('active');
          if (state.lyricsOn && state.autoscroll) {
            newActive.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }

          if (state.hasWords) {
            var wEls = newActive.querySelectorAll('.vdi-lyric-word');
            cachedWords = [];
            for (var w = 0; w < wEls.length; w++) {
              cachedWords.push({
                el: wEls[w],
                start: parseFloat(wEls[w].getAttribute('data-start')),
                isActive: false
              });
            }
          }
        } else {
          cachedWords = null;
        }
      }

      if (state.hasWords && cachedWords) {
        for (var w = 0; w < cachedWords.length; w++) {
          if (cachedWords[w].start <= pos + lookahead) {
            if (!cachedWords[w].isActive) {
              cachedWords[w].el.classList.add('active-word');
              cachedWords[w].isActive = true;
            }
          } else {
            if (cachedWords[w].isActive) {
              cachedWords[w].el.classList.remove('active-word');
              cachedWords[w].isActive = false;
            }
          }
        }
      }

      state.lyricsIdx = idx;
    }

    // Idle handling
    function resetIdle() {
      clearTimeout(idleTimer);
      if (state.isIdle) {
        state.isIdle = false;
        island.classList.remove('vdi-idle');
      }
      idleTimer = setTimeout(function() {
        if (!state.hasMedia) return;
        if (state.lyricsOn) return; // Never collapse if lyrics are open
        state.isIdle = true;
        island.classList.add('vdi-idle');
      }, idleDelay);
    }

    // Expand/collapse
    function handleMouseEnter() {
      clearTimeout(colTimer);
      if (state.isIdle) {
        state.isIdle = false;
        island.classList.remove('vdi-idle');
      }
      island.classList.add('vdi-expanded');

      if (!settings.seenTooltip && $('vdi-stg-tooltip')) {
        $('vdi-stg-tooltip').style.display = 'flex';
        updateTooltipPosition();
        setTimeout(function() {
          $('vdi-stg-tooltip').classList.add('show');
        }, 50);
      }

      resetIdle();
    }

    function handleMouseLeave() {
      if (isDragging) return;
      clearTimeout(colTimer);
      colTimer = setTimeout(function() {
        island.classList.remove('vdi-expanded');
        var sp = $('vdi-settings-panel');
        if (sp) sp.classList.remove('show');
        if ($('vdi-stg-tooltip')) {
          $('vdi-stg-tooltip').classList.remove('show');
          setTimeout(function() {
            if ($('vdi-stg-tooltip')) $('vdi-stg-tooltip').style.display = 'none';
          }, 300);
        }
        if (state.lyricsOn) {
          state.lyricsOn = false;
          $('vdi-lyr-btn').classList.remove('active');
          lyrPanel.classList.remove('show');
        }
      }, collapseDelay);
      resetIdle();
    }

    // Event binding
    function bindEvents() {
      // --- Draggable Logic ---
      var dragStartX = 0;
      var dragStartY = 0;
      var startLeftCenter = 0;
      var startTop = 0;

      island.addEventListener('mousedown', function(e) {
        if (!settings.freePlacement) return;
        if (e.target.closest('button, svg, #vdi-prog, #vdi-lyrics-scroll, a')) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        var r = island.getBoundingClientRect();
        startLeftCenter = r.left + (r.width / 2);
        startTop = r.top;
        island.style.transition = 'none';

        // Show snap zones
        if (!$('vdi-snap-zones')) {
          var sz = document.createElement('div');
          sz.id = 'vdi-snap-zones';
          sz.innerHTML = '<div class="vdi-sz vdi-sz-t"></div><div class="vdi-sz vdi-sz-b"></div><div class="vdi-sz vdi-sz-l"></div><div class="vdi-sz vdi-sz-r"></div>';
          document.body.appendChild(sz);
        }
        $('vdi-snap-zones').classList.add('active');
      });

      document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault();
        var dx = e.clientX - dragStartX;
        var dy = e.clientY - dragStartY;
        var newLeftCenter = startLeftCenter + dx;
        var newTop = startTop + dy;

        // Magnetic Snapping
        var midX = window.innerWidth / 2;
        var midY = window.innerHeight / 2;
        var expW = 400;
        var expH = 152;
        var snapD = 40;
        
        var activeZone = null;

        if (newTop < snapD && Math.abs(newLeftCenter - midX) < snapD) {
          newTop = 10; newLeftCenter = midX;
          activeZone = 't';
        } else if (newTop > window.innerHeight - expH - snapD && Math.abs(newLeftCenter - midX) < snapD) {
          newTop = window.innerHeight - expH - 10; newLeftCenter = midX;
          activeZone = 'b';
        } else if (newLeftCenter - (expW/2) < snapD && Math.abs(newTop + (expH/2) - midY) < snapD) {
          newLeftCenter = (expW/2) + 10; newTop = midY - (expH/2);
          activeZone = 'l';
        } else if (newLeftCenter + (expW/2) > window.innerWidth - snapD && Math.abs(newTop + (expH/2) - midY) < snapD) {
          newLeftCenter = window.innerWidth - (expW/2) - 10; newTop = midY - (expH/2);
          activeZone = 'r';
        }

        // Highlight active zone
        if ($('vdi-snap-zones')) {
          var szs = $('vdi-snap-zones').children;
          szs[0].classList.toggle('active', activeZone === 't');
          szs[1].classList.toggle('active', activeZone === 'b');
          szs[2].classList.toggle('active', activeZone === 'l');
          szs[3].classList.toggle('active', activeZone === 'r');
        }

        // Clamp to edges using expanded dimensions to prevent spillover
        var minLeftCenter = (expW / 2) + 10;
        var maxLeftCenter = window.innerWidth - (expW / 2) - 10;
        newLeftCenter = Math.max(minLeftCenter, Math.min(newLeftCenter, maxLeftCenter));

        var maxTop = window.innerHeight - expH - 10;
        newTop = Math.max(10, Math.min(newTop, maxTop));

        // Always keep it centered via transform to ensure symmetrical width expansion!
        island.style.left = newLeftCenter + 'px';
        island.style.top = newTop + 'px';
        island.style.transform = 'translateX(-50%)';
        
        if (state.lyricsOn) {
          updateLyricsPanelPosition();
        }
        updateSettingsPanelPosition();
      });

      document.addEventListener('mouseup', function(e) {
        if (!isDragging) return;
        isDragging = false;
        island.style.transition = '';
        if ($('vdi-snap-zones')) $('vdi-snap-zones').classList.remove('active');
        
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({
            'vdi_loc_x': island.style.left,
            'vdi_loc_y': island.style.top,
            'vdi_transform': island.style.transform,
            'activePreset': null
          });
        } else {
          localStorage.setItem('vdi_loc_x', island.style.left);
          localStorage.setItem('vdi_loc_y', island.style.top);
          localStorage.setItem('vdi_transform', island.style.transform);
        }
      });
      // -----------------------

      island.addEventListener('mouseenter', handleMouseEnter);
      island.addEventListener('mouseleave', handleMouseLeave);
      lyrPanel.addEventListener('mouseenter', handleMouseEnter);
      lyrPanel.addEventListener('mouseleave', handleMouseLeave);

      document.addEventListener('mousemove', function(e) {
        if (!state.hasMedia) return;
        var r = island.getBoundingClientRect();
        if (e.clientX >= r.left - 80 && e.clientX <= r.right + 80 &&
            e.clientY >= r.top - 60 && e.clientY <= r.bottom + 60) {
          resetIdle();
        }
      });

      // Cancel drag if mouse leaves window or document loses focus
      document.addEventListener('mouseleave', function(e) {
        if (isDragging) {
          isDragging = false;
          if ($('vdi-snap-zones')) $('vdi-snap-zones').classList.remove('active');
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ 'vdi_loc_x': island.style.left, 'vdi_loc_y': island.style.top, 'vdi_transform': island.style.transform, 'activePreset': null });
          }
        }
      });
      window.addEventListener('blur', function() {
        if (isDragging) {
          isDragging = false;
          if ($('vdi-snap-zones')) $('vdi-snap-zones').classList.remove('active');
        }
      });

      if ($('vdi-teleport-btn')) {
        $('vdi-teleport-btn').addEventListener('click', function(e) {
          e.stopPropagation();
          platform.sendAction(state.tabId, 'teleport');
        });
      }

      if ($('vdi-col-btn')) {
        $('vdi-col-btn').addEventListener('click', function(e) {
          e.stopPropagation();
          platform.sendAction(state.tabId, 'toggle');
        });
      }

      // Controls
      $('vdi-prev').addEventListener('click', function(e) {
        e.stopPropagation();
        platform.sendAction(state.tabId, 'prev');
      });

      $('vdi-next').addEventListener('click', function(e) {
        e.stopPropagation();
        platform.sendAction(state.tabId, 'next');
      });

      if ($('vdi-shuffle')) {
        $('vdi-shuffle').addEventListener('click', function(e) {
          e.stopPropagation();
          platform.sendAction(state.tabId, 'shuffle');
        });
      }

      if ($('vdi-repeat')) {
        $('vdi-repeat').addEventListener('click', function(e) {
          e.stopPropagation();
          platform.sendAction(state.tabId, 'repeat');
        });
      }

      if ($('vdi-close-btn')) {
        $('vdi-close-btn').addEventListener('click', function(e) {
          e.stopPropagation();
          manuallyClosed = true;
          updateUI();
        });
      }

      // Settings Modal Logic
      var stgBtn = $('vdi-settings-btn');
      if (stgBtn && stgPanel) {
        stgBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (state.lyricsOn && !stgPanel.classList.contains('show')) {
            $('vdi-lyr-btn').click(); // close lyrics
          }
          stgPanel.classList.toggle('show');
          if (stgPanel.classList.contains('show')) {
            updateSettingsPanelPosition();
          }
          // Sync UI state
          $('vdi-stg-hideyt').checked = settings.hideYouTube;
          $('vdi-stg-hideytm').checked = settings.hideYouTubeMusic;
          $('vdi-stg-hidespotify').checked = settings.hideSpotify;
          $('vdi-stg-hideapplemusic').checked = settings.hideAppleMusic;
          $('vdi-stg-enlyrics').checked = settings.enableLyrics;
          $('vdi-stg-freeplace').checked = settings.freePlacement;
        });

        stgPanel.addEventListener('mouseleave', function() {
          handleMouseLeave();
        });
        stgPanel.addEventListener('mouseenter', function() {
          handleMouseEnter();
        });
        island.addEventListener('mouseenter', function() {
          // Island enter logic handled centrally, this is just a stub if needed
        });

        document.addEventListener('click', function(e) {
          if (!island.contains(e.target) && !stgPanel.contains(e.target)) {
            stgPanel.classList.remove('show');
          }
        });
        
        if ($('vdi-stg-tooltip')) {
          $('vdi-stg-tooltip').addEventListener('mouseleave', function() {
            handleMouseLeave();
          });
          $('vdi-stg-tooltip').addEventListener('mouseenter', function() {
            handleMouseEnter();
          });
        }

        if ($('vdi-stg-tooltip-btn')) {
          $('vdi-stg-tooltip-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            settings.seenTooltip = true;
            $('vdi-stg-tooltip').classList.remove('show');
            setTimeout(function() {
              if ($('vdi-stg-tooltip')) $('vdi-stg-tooltip').style.display = 'none';
            }, 300);
            
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ 'vdi_cfg_seenTooltip3': true });
            } else {
              localStorage.setItem('vdi_cfg_seenTooltip3', 'true');
            }
          });
        }

        var bindStg = function(id, key) {
          var el = $(id);
          if (el) {
            el.addEventListener('change', function(e) {
              settings[key] = e.target.checked;
              if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                var update = {};
                update[key] = settings[key];
                chrome.storage.local.set(update);
              } else {
                localStorage.setItem('vdi_cfg_' + key, settings[key]);
              }
              updateUI();
            });
          }
        };

        bindStg('vdi-stg-hideyt', 'hideYouTube');
        bindStg('vdi-stg-hideytm', 'hideYouTubeMusic');
        bindStg('vdi-stg-hidespotify', 'hideSpotify');
        bindStg('vdi-stg-hideapplemusic', 'hideAppleMusic');
        bindStg('vdi-stg-enlyrics', 'enableLyrics');
        bindStg('vdi-stg-freeplace', 'freePlacement');

        var updatePos = function(left, top, transform) {
          island.style.left = left;
          island.style.top = top;
          island.style.transform = transform;
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ 'vdi_loc_x': left, 'vdi_loc_y': top, 'vdi_transform': transform });
          } else {
            localStorage.setItem('vdi_loc_x', left);
            localStorage.setItem('vdi_loc_y', top);
            localStorage.setItem('vdi_transform', transform);
          }
          if (state.lyricsOn) updateLyricsPanelPosition();
          updateSettingsPanelPosition();
          updateTooltipPosition();
        };

        if ($('vdi-stg-pos-t')) $('vdi-stg-pos-t').addEventListener('click', function(e) { e.stopPropagation(); updatePos('50%', '10px', 'translateX(-50%)'); });
        if ($('vdi-stg-pos-b')) $('vdi-stg-pos-b').addEventListener('click', function(e) { e.stopPropagation(); updatePos('50%', (window.innerHeight - 152 - 10) + 'px', 'translateX(-50%)'); });
        if ($('vdi-stg-pos-l')) $('vdi-stg-pos-l').addEventListener('click', function(e) { e.stopPropagation(); updatePos('210px', (window.innerHeight / 2 - 76) + 'px', 'translateX(-50%)'); });
        if ($('vdi-stg-pos-r')) $('vdi-stg-pos-r').addEventListener('click', function(e) { e.stopPropagation(); updatePos((window.innerWidth - 210) + 'px', (window.innerHeight / 2 - 76) + 'px', 'translateX(-50%)'); });
      }

      $('vdi-play').addEventListener('click', function(e) {
        e.stopPropagation();
        if (!state.hasMedia || !state.tabId) return;
        
        platform.sendAction(state.tabId, 'toggle');
        state.isPlaying = !state.isPlaying;
        setPlayIcon(state.isPlaying);
        
        state.isPlayToggling = true;
        state.playToggleLockTime = Date.now();
      });

      $('vdi-prog').addEventListener('click', function(e) {
        e.stopPropagation();
        if (!state.duration) return;
        var r = e.currentTarget.getBoundingClientRect();
        var targetPos = ((e.clientX - r.left) / r.width) * state.duration;
        performSeek(targetPos);
      });

      $('vdi-pip-main-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        if (!opts.isVivaldi && typeof VDI !== 'undefined' && VDI.Core && VDI.Core.togglePiP) {
          var success = VDI.Core.togglePiP();
          if (!success && platform.requestPiP) {
            platform.requestPiP(state.tabId);
          }
        } else if (platform.requestPiP) {
          platform.requestPiP(state.tabId);
        }
      });

      $('vdi-lyr-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        if (typeof stgPanel !== 'undefined' && stgPanel && stgPanel.classList.contains('show')) {
          stgPanel.classList.remove('show');
        }
        state.lyricsOn = !state.lyricsOn;
        $('vdi-lyr-btn').classList.toggle('active', state.lyricsOn);

        if (state.lyricsOn) {
          lyrPanel.classList.add('show');
          updateLyricsPanelPosition();

          if (state.lyricsSynced && state.lyricsIdx >= 0 && state.autoscroll) {
            var cur = $('vdi-lyr-' + state.lyricsIdx);
            if (cur) {
              setTimeout(function() {
                cur.scrollIntoView({ behavior: 'auto', block: 'center' });
              }, 50);
            }
          }
        } else {
          lyrPanel.classList.remove('show');
        }
      });

      // Autoscroll handling
      var scrollEl = $('vdi-lyrics-scroll');
      if (scrollEl) {
        var disableAutoscroll = function() {
          if (state.autoscroll) {
            state.autoscroll = false;
            var btn = $('vdi-resume-scroll-btn');
            if (btn) btn.classList.add('show');
          }
        };
        scrollEl.addEventListener('wheel', disableAutoscroll, { passive: true });
        scrollEl.addEventListener('touchmove', disableAutoscroll, { passive: true });
      }

      var resBtn = $('vdi-resume-scroll-btn');
      if (resBtn) {
        resBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          state.autoscroll = true;
          resBtn.classList.remove('show');
          if (state.lyricsIdx > -1) {
            var cur = $('vdi-lyr-' + state.lyricsIdx);
            if (cur) cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }

      var provLp = $('vdi-prov-lp');
      if (provLp) {
        provLp.addEventListener('click', function(e) {
          e.stopPropagation();
          if (window.vdiSwitchProvider) window.vdiSwitchProvider('lyricsplus');
        });
      }

      var provLrc = $('vdi-prov-lrc');
      if (provLrc) {
        provLrc.addEventListener('click', function(e) {
          e.stopPropagation();
          if (window.vdiSwitchProvider) window.vdiSwitchProvider('lrclib');
        });
      }
    }

    // Tick update
    function startTick() {
      // Use requestAnimationFrame for buttery smooth UI updates
      function tick() {
        if (!state.isSeeking && state.isPlaying && state.duration > 0 && state.lastSyncTime) {
          var elapsed = (Date.now() - state.lastSyncTime) / 1000.0;
          state.position = Math.min(state.duration, state.basePosition + elapsed);
          refreshProgress();
        }
        syncLyrics();
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);

      // EQ animation
      setInterval(function() {
        var bars = document.querySelectorAll('.vdi-eq-bar');
        if (!bars.length) return;
        for (var i = 0; i < bars.length; i++) {
          if (!state.isPlaying) {
            bars[i].style.height = '3px';
          } else {
            bars[i].style.height = Math.floor(4 + Math.random() * 9) + 'px';
          }
        }
      }, 200);
    }

    // Fullscreen handling
    function setupFullscreen() {
      // Chrome Extension context: injected directly into the page, so standard HTML5 API works instantly

      // 2. Chrome Extension context: injected directly into the page, so standard HTML5 API works perfectly
      document.addEventListener('fullscreenchange', function() {
        if (document.fullscreenElement) {
          island.style.display = 'none';
          if (lyrPanel) lyrPanel.style.display = 'none';
        } else {
          island.style.display = '';
          if (lyrPanel) lyrPanel.style.display = '';
        }
      });
    }

    // Public state getter/setter
    function setState(newState) {
      if (!newState) return;

      var prevKey = state.title + '|' + state.artist;

      state.hasMedia = newState.hasMedia;
      if (!state.isPlayToggling || (Date.now() - (state.playToggleLockTime || 0) > 300)) {
        state.isPlayToggling = false;
        state.isPlaying = newState.isPlaying;
      }
      state.title = newState.title;
      state.artist = newState.artist;
      state.artwork = newState.artwork;
      state.duration = newState.duration;
      state.shuffleOn = newState.shuffleOn || false;
      state.repeatMode = newState.repeatMode || 'off';
      
      // Use exact clock interpolation instead of dt accumulation
      if (!state.isSeeking) {
        var now = Date.now();
        var newBase = newState.position;
        var elapsed = (now - state.lastSyncTime) / 1000.0;
        var currentPredicted = (state.basePosition || 0) + elapsed;
        
        // Only violently snap the clock if we drifted by more than 1.5s (or if forced).
        // Otherwise, trust our local 60FPS coasting timer to prevent micro-stutters!
        if (!state.lastSyncTime || state.forceNextSync || Math.abs(currentPredicted - newBase) > 1.5) {
          state.basePosition = newBase;
          state.lastSyncTime = now;
          state.position = state.basePosition;
          state.forceNextSync = false;
        }
      }

      state.supportsPiP = newState.supportsPiP;
      state.isFullscreen = newState.isFullscreen;
      state.isYouTubeVideo = newState.isYouTubeVideo;
      state.isMusicApp = newState.isMusicApp;
      state.tabId = newState.tabId !== undefined ? newState.tabId : state.tabId;
      state.windowId = newState.windowId !== undefined ? newState.windowId : state.windowId;

      updateUI();

      var key = state.title + '|' + state.artist;
      if (key !== prevKey && state.title) {
        fetchAndRenderLyrics();
      }
    }

    function getState() {
      return state;
    }

    // Initialize
    function init() {
      function applyPos(x, y, tf) {
        if (!x || !y) return;
        var midX = window.innerWidth / 2;
        var midY = window.innerHeight / 2;
        var expW = 400;
        var expH = 152;

        if (x === 'CENTER') x = midX + 'px';
        if (x === 'RIGHT') x = (window.innerWidth - (expW/2) - 10) + 'px';
        if (x === 'LEFT') x = ((expW/2) + 10) + 'px';
        
        if (y === 'TOP') y = '10px';
        if (y === 'BOTTOM') y = (window.innerHeight - expH - 10) + 'px';
        if (y === 'MIDDLE') y = (midY - (expH/2)) + 'px';

        island.style.left = x;
        island.style.top = y;
        island.style.transform = tf || 'none';
        
        if (state.lyricsOn) {
          // Give it a frame to apply CSS before measuring bounds
          requestAnimationFrame(updateLyricsPanelPosition);
        }
      }



      window.addEventListener('resize', function() {
        if (!state.hasMedia) return;
        var expW = 400;
        var expH = 152;
        
        // Clamp island position to new viewport bounds
        var minLeftCenter = (expW / 2) + 10;
        var maxLeftCenter = window.innerWidth - (expW / 2) - 10;
        var currentLeftStr = island.style.left || '';
        var currentLeft = window.innerWidth / 2;
        if (currentLeftStr.indexOf('%') !== -1) {
          currentLeft = window.innerWidth * (parseFloat(currentLeftStr) / 100);
        } else if (currentLeftStr) {
          currentLeft = parseFloat(currentLeftStr);
        }
        var newLeftCenter = Math.max(minLeftCenter, Math.min(currentLeft, maxLeftCenter));
        
        var maxTop = window.innerHeight - expH - 10;
        var currentTop = parseFloat(island.style.top) || 10;
        var newTop = Math.max(10, Math.min(currentTop, maxTop));
        
        island.style.left = newLeftCenter + 'px';
        island.style.top = newTop + 'px';
        
        if (state.lyricsOn) {
          updateLyricsPanelPosition();
        }
        updateSettingsPanelPosition();
      });
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['vdi_loc_x', 'vdi_loc_y', 'vdi_transform', 'hideYouTube', 'hideYouTubeMusic', 'hideSpotify', 'hideAppleMusic', 'enableLyrics', 'freePlacement', 'vdi_cfg_seenTooltip3'], function(res) {
          applyPos(res.vdi_loc_x, res.vdi_loc_y, res.vdi_transform);
          if (res.hideYouTube !== undefined) settings.hideYouTube = res.hideYouTube;
          if (res.hideYouTubeMusic !== undefined) settings.hideYouTubeMusic = res.hideYouTubeMusic;
          if (res.hideSpotify !== undefined) settings.hideSpotify = res.hideSpotify;
          if (res.hideAppleMusic !== undefined) settings.hideAppleMusic = res.hideAppleMusic;
          if (res.enableLyrics !== undefined) settings.enableLyrics = res.enableLyrics;
          if (res.freePlacement !== undefined) settings.freePlacement = res.freePlacement;
          if (res.vdi_cfg_seenTooltip3 !== undefined) settings.seenTooltip = res.vdi_cfg_seenTooltip3;

          $('vdi-stg-hideyt').checked = settings.hideYouTube;
          $('vdi-stg-hideytm').checked = settings.hideYouTubeMusic;
          $('vdi-stg-hidespotify').checked = settings.hideSpotify;
          $('vdi-stg-hideapplemusic').checked = settings.hideAppleMusic;
          $('vdi-stg-enlyrics').checked = settings.enableLyrics;
          $('vdi-stg-freeplace').checked = settings.freePlacement;
        });

        chrome.storage.onChanged.addListener(function(changes, namespace) {
          if (namespace === 'local') {
            if (changes.hideYouTube) settings.hideYouTube = changes.hideYouTube.newValue;
            if (changes.hideYouTubeMusic) settings.hideYouTubeMusic = changes.hideYouTubeMusic.newValue;
            if (changes.hideSpotify) settings.hideSpotify = changes.hideSpotify.newValue;
            if (changes.hideAppleMusic) settings.hideAppleMusic = changes.hideAppleMusic.newValue;
            if (changes.enableLyrics) settings.enableLyrics = changes.enableLyrics.newValue;
            if (changes.freePlacement) settings.freePlacement = changes.freePlacement.newValue;
            
            if (changes.vdi_loc_x && changes.vdi_loc_y && changes.vdi_transform) {
              applyPos(changes.vdi_loc_x.newValue, changes.vdi_loc_y.newValue, changes.vdi_transform.newValue);
            }
            
            updateUI();
          }
        });
      } else {
        applyPos(localStorage.getItem('vdi_loc_x'), localStorage.getItem('vdi_loc_y'), localStorage.getItem('vdi_transform'));
        var getBool = function(key, defaultVal) {
          var val = localStorage.getItem('vdi_cfg_' + key);
          return val !== null ? val === 'true' : defaultVal;
        };
        settings.hideYouTube = getBool('hideYouTube', settings.hideYouTube);
        settings.hideYouTubeMusic = getBool('hideYouTubeMusic', settings.hideYouTubeMusic);
        settings.hideSpotify = getBool('hideSpotify', settings.hideSpotify);
        settings.enableLyrics = getBool('enableLyrics', settings.enableLyrics);
        settings.freePlacement = getBool('freePlacement', settings.freePlacement);
        settings.seenTooltip = getBool('seenTooltip3', settings.seenTooltip);
      }
      
      bindEvents();
      startTick();
      setupFullscreen();
      resetIdle();
    }

    return {
      init: init,
      setState: setState,
      getState: getState,
      updateUI: updateUI,
      refreshProgress: refreshProgress
    };
  }

  return {
    createIsland: createIsland,
    createSettingsPanel: createSettingsPanel,
    createSettingsTooltip: createSettingsTooltip,
    createLyricsPanel: createLyricsPanel,
    createController: createController
  };
})();



(function() {
  'use strict';

  // Guard: only run once
  if (document.getElementById('vdi')) return;

  // Inject CSS
  var css = document.createElement('style');
  css.id = 'vdi-css';
  css.textContent = VDI.Styles.generate({ islandTop: 10 });
  document.head.appendChild(css);

  // Create UI
  var island = VDI.UI.createIsland();
  var lyrPanel = VDI.UI.createLyricsPanel();
  var stgPanel = VDI.UI.createSettingsPanel();
  var stgTooltip = VDI.UI.createSettingsTooltip();
  document.body.appendChild(island);
  document.body.appendChild(lyrPanel);
  document.body.appendChild(stgPanel);
  document.body.appendChild(stgTooltip);

  // Platform adapter (Chrome Extension)
  var platform = {
    sendAction: function(tabId, action, value) {
      VDI.Platform.ChromeExt.sendAction(action, value);
    },
    jumpToTab: VDI.Platform.ChromeExt.jumpToTab,
    requestPiP: VDI.Platform.ChromeExt.requestPiP
  };

  // Create controller
  var ctrl = VDI.UI.createController(island, lyrPanel, stgPanel, platform, {
    isVivaldi: false,
    tickInterval: 1000,
    idleDelay: 9000,
    collapseDelay: 500
  });

  ctrl.init();

  // Listen for state updates from background
  VDI.Platform.ChromeExt.onStateUpdate(function(newState) {
    ctrl.setState(newState);
  });

  // Request initial state
  VDI.Platform.ChromeExt.requestState(function(state) {
    if (state) {
      ctrl.setState(state);
    }
  });

})();
