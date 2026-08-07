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
        // Pierce TWO shadow DOM levels: player-bar SR -> toggle-button-renderer -> its SR -> paper-icon-button
        var shuffleEl = deepQueryOne('ytmusic-toggle-button-renderer.shuffle, [aria-label*="shuffle" i]', playerBar);
        if (shuffleEl) {
          // Check the element itself AND its inner paper-icon-button (second shadow level)
          var sInner = deepQueryOne('tp-yt-paper-icon-button, button', shuffleEl) || shuffleEl;
          var sLabel = (shuffleEl.getAttribute('aria-label') || '').toLowerCase();
          shuffleOn = shuffleEl.getAttribute('aria-pressed') === 'true' ||
                      shuffleEl.hasAttribute('active') ||
                      sInner.getAttribute('aria-pressed') === 'true' ||
                      sLabel.includes(' on') || sLabel.includes(': on');
        }
        var repeatEl = deepQueryOne('ytmusic-toggle-button-renderer.repeat, [aria-label*="repeat" i]', playerBar);
        if (repeatEl) {
          var rInner = deepQueryOne('tp-yt-paper-icon-button, button', repeatEl) || repeatEl;
          var rLabel = (repeatEl.getAttribute('aria-label') || '').toLowerCase();
          var rPressed = repeatEl.getAttribute('aria-pressed') === 'true' ||
                         repeatEl.hasAttribute('active') ||
                         rInner.getAttribute('aria-pressed') === 'true';
          if (rLabel.includes('one') || rLabel.includes('song')) repeatMode = 'one';
          else if (rPressed || rLabel.includes(' on') || rLabel.includes(': on')) repeatMode = 'all';
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
