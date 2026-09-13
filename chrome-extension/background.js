/**
 * Glance - Shared Core Module
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
  function extractVibrant(url, amoledBlack, cb) {
    if (!url || url.indexOf('data:') === 0) return cb(null);
    var img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      try {
        var W = 128, H = 128;
        var cvs=document.createElement('canvas');
        var ctx=cvs.getContext('2d',{willReadFrequently:true});
        cvs.width = W; cvs.height = H;
        ctx.drawImage(img, 0, 0, W, H);
        var d = ctx.getImageData(0, 0, W, H).data;
        var total = W * H;

        // ── PASS 1: Dominant color — the album's overall "mood" ──
        // 12 coarse hue buckets (30° each). All non-extreme pixels count.
        var dom = [];
        for (var i = 0; i < 12; i++) dom[i] = { n: 0, sr: 0, sg: 0, sb: 0 };
        var darkN = 0, darkR = 0, darkG = 0, darkB = 0;
        var greyN = 0, lightN = 0;
        var domHue = -1; // -1 = no dominant chromatic hue (neutral image)

        for (var i = 0; i < total * 4; i += 4) {
          var r = d[i]/255, g = d[i+1]/255, b = d[i+2]/255;
          var mx = Math.max(r,g,b), mn = Math.min(r,g,b);
          var l = (mx+mn)/2, delta = mx-mn;
          if (l < 0.04) { darkN++; darkR+=r; darkG+=g; darkB+=b; continue; }
          if (l > 0.94) { lightN++; continue; }
          if (delta < 0.09) { greyN++; continue; }
          var h = 0;
          if (mx===r) h=((g-b)/delta)%6;
          else if (mx===g) h=(b-r)/delta+2;
          else h=(r-g)/delta+4;
          h=Math.round(h*60); if(h<0)h+=360;
          var bIdx=Math.floor(h/30)%12;
          dom[bIdx].n++; dom[bIdx].sr+=r; dom[bIdx].sg+=g; dom[bIdx].sb+=b;
        }

        var domBest=null, domMax=-1;
        for(var j=0;j<12;j++){if(dom[j].n>domMax){domMax=dom[j].n;domBest=dom[j];}}

        // Is image mostly neutral (grey/dark/light)?
        var neutralN = darkN + greyN + lightN;
        var isNeutral = (neutralN > total * 0.50);

        // Dominant hue center (degrees) — used to devalue in accent pass
        if (!isNeutral && domBest && domBest.n > 0) {
          var dr=domBest.sr/domBest.n,dg=domBest.sg/domBest.n,db_=domBest.sb/domBest.n;
          var mxD=Math.max(dr,dg,db_),mnD=Math.min(dr,dg,db_),dltD=mxD-mnD;
          if(dltD>0){
            var hD=0;
            if(mxD===dr) hD=((dg-db_)/dltD)%6;
            else if(mxD===dg) hD=(db_-dr)/dltD+2;
            else hD=(dr-dg)/dltD+4;
            domHue=Math.round(hD*60); if(domHue<0)domHue+=360;
          }
        }

        // Background color → forced very dark version of dominant
        var bgR=0.09,bgG=0.09,bgB=0.09; // default near-black
        if (!isNeutral && domBest && domBest.n>0) {
          bgR=domBest.sr/domBest.n; bgG=domBest.sg/domBest.n; bgB=domBest.sb/domBest.n;
        } else if (darkN > 0) {
          bgR=darkR/darkN*0.6; bgG=darkG/darkN*0.6; bgB=darkB/darkN*0.6;
        }
        // AMOLED MODE vs TINTED MODE
        // If AMOLED Black is enabled, use pure black (lBg = 0.0)
        // If disabled, use a very dark tint of the dominant background (lBg ~ 0.07-0.12)
        var hBg = 0, sBg = 0, lBg = 0.0;
        
        if (!amoledBlack) {
          // Convert bg to HSL, force very dark
          var mxBg=Math.max(bgR,bgG,bgB),mnBg=Math.min(bgR,bgG,bgB);
          lBg=(mxBg+mnBg)/2;
          if(mxBg!==mnBg){
            var dBg=mxBg-mnBg;
            sBg=lBg>0.5?dBg/(2-mxBg-mnBg):dBg/(mxBg+mnBg);
            if(mxBg===bgR) hBg=(bgG-bgB)/dBg+(bgG<bgB?6:0);
            else if(mxBg===bgG) hBg=(bgB-bgR)/dBg+2;
            else hBg=(bgR-bgG)/dBg+4;
            hBg=Math.round(hBg*60); if(hBg<0)hBg+=360;
          }
          lBg=Math.max(0.06,Math.min(0.16,lBg*0.4+0.03));
          sBg=Math.min(0.5,sBg*0.55);
        }

        // ── PASS 2: Accent color — the vibrant "pop" (buttons, toggles) ──
        // Key: DEVALUE hues close to dominant so contrasting highlights win.
        // e.g. Monica: red fabric (dominant) → gold text (accent) wins over more red
        var acc = [];
        for(var i=0;i<36;i++) acc[i]={n:0,ss:0,maxS:0,br:0,bg:0,bb:0};

        for(var i=0;i<total*4;i+=4){
          var r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255;
          var mx=Math.max(r,g,b),mn=Math.min(r,g,b);
          var l=(mx+mn)/2,delta=mx-mn;
          // Looser thresholds so thin, dark-anti-aliased lines (like Spider-Man's red ring) aren't discarded
          if(l<0.03||l>0.97||delta<0.08) continue;
          var sat=delta/(1-Math.abs(2*l-1));
          if(sat<0.25) continue;
          var h=0;
          if(mx===r) h=((g-b)/delta)%6;
          else if(mx===g) h=(b-r)/delta+2;
          else h=(r-g)/delta+4;
          h=Math.round(h*60); if(h<0)h+=360;
          var bIdx=Math.floor(h/10)%36;
          acc[bIdx].n++; acc[bIdx].ss+=delta; // Accumulate CHROMA (delta), not HSL saturation
          if(delta>acc[bIdx].maxS){acc[bIdx].maxS=delta;acc[bIdx].br=r;acc[bIdx].bg=g;acc[bIdx].bb=b;}
        }

        // Glance Color Extraction
        // We do NOT use a contrast multiplier (cMult) because the Island background is always dark.
        // Forcing a contrasting color causes tiny logos (like Blue text in Jawan) to artificially win over the main theme.
        var accBest=null,accScore=-1;
        for(var j=0;j<36;j++){
          var bkt=acc[j]; 
          // Noise filter: Must be at least 25 pixels
          if(bkt.n < 25) continue;
          
          var avgC=bkt.ss/bkt.n; // Average Chroma
          
          // The pure Golden Ratio: Area * Purity
          // Allows pure tiny elements (Spider-Man red ring) to beat pale reflections,
          // but ensures massive vibrant themes (Jawan Red) easily beat tiny pure text.
          var score = Math.sqrt(bkt.n) * Math.pow(avgC, 4);
          if(score>accScore){accScore=score;accBest=bkt;}
        }

        // Fallback: no vibrant pixels at all → neutral white/silver accent
        if(!accBest){
          cb({
            isAmoled: amoledBlack,
            accent:'hsl(0,0%,88%)',
            gradient:'linear-gradient(135deg,#e0e0e0,#bbb)',
            dark:'hsl('+hBg+','+Math.round(sBg*100)+'%,'+Math.round(lBg*100)+'%)',
            glow:'rgba(220,220,220,0.35)'
          });
          return;
        }

        var ar=accBest.br,ag=accBest.bg,ab=accBest.bb;
        var mxA=Math.max(ar,ag,ab),mnA=Math.min(ar,ag,ab);
        var hA=0,sA=0,lA=(mxA+mnA)/2;
        if(mxA!==mnA){
          var dA=mxA-mnA;
          sA=lA>0.5?dA/(2-mxA-mnA):dA/(mxA+mnA);
          if(mxA===ar) hA=(ag-ab)/dA+(ag<ab?6:0);
          else if(mxA===ag) hA=(ab-ar)/dA+2;
          else hA=(ar-ag)/dA+4;
          hA=Math.round(hA*60); if(hA<0)hA+=360;
        }
        sA=Math.max(0.78,Math.min(1.0,sA*1.15));
        lA=Math.max(0.48,Math.min(0.65,lA));

        cb({
          isAmoled: amoledBlack,
          accent:'hsl('+hA+','+Math.round(sA*100)+'%,'+Math.round(lA*100)+'%)',
          gradient:'linear-gradient(135deg,hsl('+hA+','+Math.round(sA*100)+'%,'+Math.round(lA*100)+'%),hsl('+((hA+40)%360)+','+Math.round(sA*85)+'%,'+Math.round((lA-0.1)*100)+'%))',
          dark:'hsl('+hBg+','+Math.round(sBg*100)+'%,'+Math.round(lBg*100)+'%)',
          glow:'hsla('+hA+','+Math.round(sA*100)+'%,'+Math.round(lA*100)+'%,0.45)'
        });
      } catch(e){cb(null);}
    };
    img.onerror=function(){cb(null);};
    img.src=url;
  }


  // ─────────────────────────────────────────────────────────────

  // DOM Utilities
  // ─────────────────────────────────────────────────────────────
  function deepQuery(selector, root) {
    var results = [];
    var traverse = function(node) {
      if (!node) return;
      if (node.shadowRoot) traverse(node.shadowRoot);
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
  // Lyrics fetching from LRCLib
  // ─────────────────────────────────────────────────────────────
  var LYRICS_API = 'https://lrclib.net/api/search';

  function fetchLyrics(title, artist, duration, cb) {
    var cleanTitle = title.replace(/\(.*(?:official|music|lyric|video|audio).*\)/i, '').trim();
    var cleanArtist = (artist || '').replace(/\(.*(?:official|music|lyric|video|audio).*\)/i, '').trim();

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
          if (result) {
            cb({ lyricsplus: null, lrclib: { lines: result.lines, synced: result.synced, url: result.url, hasWords: false } });
          } else {
            throw new Error('No lyrics in response');
          }
        })
        .catch(function(err) {
          if (!isProxy) doFetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl), true);
          else cb(null);
        });
    }
    doFetch(targetUrl, false);
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
      var url = 'https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=auto&tl=en&dt=rm&q=' + encodeURIComponent(q);
      
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
    var ms = navigator.mediaSession;
    var uiDur = 0, uiCur = 0;
    var isPlaying = false;
    var shuffleOn = false;
    var repeatMode = 'off';
    var finalTitle = '', finalArtist = '', art = null;
    var mkFound = false;

    // ─── PRIMARY: MusicKit via wrappedJSObject (Firefox/Zen only) ───
    // Firefox content scripts can access page JS objects via wrappedJSObject.
    // This bypasses CSP entirely since no script injection is needed.
    try {
      var pageWin = window.wrappedJSObject || window;
      var MK = pageWin.MusicKit;
      if (MK && typeof MK.getInstance === 'function') {
        var mk = MK.getInstance();
        if (mk) {
          mkFound = true;
          var ni = mk.nowPlayingItem;

          // Position (seconds)
          uiCur = mk.currentPlaybackTime || 0;

          // Duration: playbackDuration is in MILLISECONDS
          if (ni && ni.playbackDuration) {
            uiDur = ni.playbackDuration / 1000;
          }

          isPlaying = !!mk.isPlaying;

          // Shuffle: 0=off, 1=songs
          shuffleOn = (mk.shuffleMode !== 0 && mk.shuffleMode !== undefined);

          // Repeat: 0=off, 1=one, 2=all
          // NOTE: wrappedJSObject setter is ignored by MusicKit, so we read only.
          // DOM class 'mode--X' on .button--repeat is the ground truth.
          var rm = mk.repeatMode;
          repeatMode = (rm === 2) ? 'all' : ((rm === 1) ? 'one' : 'off');

          // ── DOM override for repeat: .button--repeat has class mode--0/1/2 ──
          // This is more reliable than wrappedJSObject on Firefox/Zen
          try {
            var repDomBtn = VDI.Core.deepQueryOne('.button--repeat, amp-playback-controls-repeat');
            if (repDomBtn) {
              var rc = repDomBtn.className || '';
              var rl = (repDomBtn.getAttribute('aria-label') || repDomBtn.getAttribute('title') || '').toLowerCase();
              if (rl.includes('one') || rc.includes('mode--2')) repeatMode = 'one';
              else if (rl.includes('all') || rc.includes('mode--1')) repeatMode = 'all';
              else if (rc.includes('mode--0')) repeatMode = 'off';
            }
          } catch(e) {}

          // Metadata
          if (ni) {
            finalTitle = ni.title || (ni.attributes && ni.attributes.name) || '';
            finalArtist = ni.artistName || (ni.attributes && ni.attributes.artistName) || '';
            if (ni.artwork && MK.formatArtworkURL) {
              try { art = MK.formatArtworkURL(ni.artwork, 600, 600); } catch(e) {}
            }
          }
        }
      }
    } catch(e) {
      // wrappedJSObject not available (Chrome) or MusicKit not loaded yet
    }

    // ─── FALLBACK: Audio element + mediaSession (Chrome/Vivaldi) ───
    if (!mkFound) {
      var realEl = document.getElementById('apple-music-player');
      if (!realEl) {
        var els = document.querySelectorAll('audio, video');
        for (var k = 0; k < els.length; k++) {
          if (!els[k].paused && els[k].currentTime > 0) { realEl = els[k]; break; }
        }
        if (!realEl && els.length > 0) realEl = els[0];
      }

      if (realEl) {
        uiCur = realEl.currentTime || 0;
        isPlaying = !realEl.paused;
        if (isFinite(realEl.duration) && realEl.duration > 0) uiDur = realEl.duration;
      }

      // mediaSession for metadata and better duration
      if (ms) {
        if (typeof ms.getPositionState === 'function') {
          try {
            var ps = ms.getPositionState();
            if (ps && ps.duration > 0 && ps.duration < 3600) uiDur = ps.duration;
            if (ps && ps.position > 0 && (!uiCur || uiCur === 0)) uiCur = ps.position;
          } catch(e) {}
        }
        if (ms.metadata) {
          finalTitle = ms.metadata.title || '';
          finalArtist = ms.metadata.artist || '';
          if (ms.metadata.artwork && ms.metadata.artwork.length) {
            art = ms.metadata.artwork[ms.metadata.artwork.length - 1].src;
          }
        }
        if (!isPlaying) isPlaying = ms.playbackState === 'playing';
      }

      // Audio element title: "Song Name - Album - Artist"
      if (!finalTitle && realEl && realEl.title) {
        var tParts = realEl.title.split(' - ');
        if (tParts.length >= 1) finalTitle = tParts[0].trim();
        if (tParts.length >= 3 && !finalArtist) finalArtist = tParts[tParts.length - 1].trim();
      }

      // Page title fallback
      if (!finalTitle && document.title) {
        var parts = document.title.split(' - ');
        if (parts.length >= 2) {
          finalTitle = parts[0].trim();
          if (!finalArtist) finalArtist = parts[1].trim();
        } else {
          finalTitle = document.title.replace(' - Apple Music', '').trim();
        }
      }

      // TreeWalker: scan for "-M:SS" remaining time to compute real duration
      if (uiCur > 0) {
        var timeRx = /^-\d{1,2}:\d{2}$/;
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        var tNode;
        while ((tNode = walker.nextNode())) {
          var txt = tNode.textContent.trim();
          if (timeRx.test(txt)) {
            var cleaned = txt.replace(/^-/, '');
            var tp = cleaned.split(':').map(Number);
            var remaining = tp.length === 2 ? tp[0] * 60 + tp[1] : 0;
            if (remaining > 0) {
              uiDur = uiCur + remaining;
              break;
            }
          }
        }
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
  // Spotify Media State Extractor (Isolated)
  // ─────────────────────────────────────────────────────────────
  function getSpotifyMediaState() {
    var ms = navigator.mediaSession;
    var uiDur = 0;
    var uiCur = 0;
    var playBtn = document.querySelector('[data-testid="control-button-playpause"]');
    
    // Prefer MediaSession for precise duration and position to avoid parsing DOM strings
    if (ms && typeof ms.getPositionState === 'function') {
      try {
        var ps = ms.getPositionState();
        if (ps && ps.duration > 0 && ps.duration < 3600) uiDur = ps.duration;
        if (ps && ps.position >= 0) uiCur = ps.position;
      } catch(e) {}
    }

    // Fallback to DOM parsing ONLY if MediaSession fails
    if (uiDur === 0 || uiCur === 0) {
      var parseTime = function(str) {
        if (!str) return 0;
        var p = str.trim().split(':').map(Number);
        return p.length === 2 ? p[0] * 60 + p[1] : (p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : 0);
      };
      if (uiDur === 0) {
        var durEls = document.querySelectorAll('[data-testid="playback-duration"]');
        for (var i = 0; i < durEls.length; i++) {
          if (durEls[i].getBoundingClientRect().width > 0) {
            var dt = parseTime(durEls[i].textContent);
            if (dt > uiDur) uiDur = dt;
          }
        }
      }
      if (uiCur === 0) {
        var posEls = document.querySelectorAll('[data-testid="playback-position"]');
        for (var j = 0; j < posEls.length; j++) {
          if (posEls[j].getBoundingClientRect().width > 0) {
            var ct = parseTime(posEls[j].textContent);
            if (ct > uiCur) uiCur = ct;
          }
        }
      }
    }

    // Spotify's UI string and MediaSession position can be slightly delayed due to buffering.
    // To sync lyrics perfectly, we MUST extract millisecond precision from the true audio element.
    var realCur = null;
    var els = Array.prototype.slice.call(document.querySelectorAll('video, audio'));
    var realEl = null;

    if (uiDur > 0) {
      var matchedEls = [];
      for (var k = 0; k < els.length; k++) {
        var d = els[k].duration;
        if (d > 0 && Math.abs(d - uiDur) <= 5) matchedEls.push(els[k]);
      }
      if (matchedEls.length === 1) {
        realEl = matchedEls[0];
      } else if (matchedEls.length > 1) {
        // Crossfade tie-breaker: prioritize the playing element, or the one just starting
        var playingEls = matchedEls.filter(function(e) { return !e.paused; });
        if (playingEls.length === 1) realEl = playingEls[0];
        else if (playingEls.length > 1) realEl = playingEls.sort(function(a, b) { return a.currentTime - b.currentTime; })[0];
        else realEl = matchedEls.sort(function(a, b) { return b.currentTime - a.currentTime; })[0];
      }
    }

    if (!realEl) {
      var possibleEls = [];
      for (var m = 0; m < els.length; m++) {
        var d2 = els[m].duration;
        var isCanvas = (d2 > 0 && d2 <= 30);
        if (!isCanvas && (!els[m].paused || els[m].currentTime > 0)) {
          possibleEls.push(els[m]);
        }
      }
      var playingEls = possibleEls.filter(function(e) { return !e.paused; });
      if (playingEls.length > 0) {
        realEl = playingEls[0];
      } else if (possibleEls.length > 0) {
        realEl = possibleEls[0];
      }
    }
    
    var isPlaying = false;
    if (realEl) {
      if (realEl.currentTime >= 0) realCur = realEl.currentTime;
      isPlaying = !realEl.paused;
    } else {
      if (playBtn) {
        isPlaying = (playBtn.getAttribute('aria-label') || '').toLowerCase().includes('pause');
      } else if (ms) {
        isPlaying = (ms.playbackState === 'playing');
      }
    }

    if (realCur !== null) {
      uiCur = realCur;
    } else {
      // Initialize exact MutationObserver tracker
      if (!window._vdiPosObserver) {
        window._vdiPosFlipTime = Date.now();
        window._vdiPosFlipText = '';
        window._vdiPosObserver = new MutationObserver(function(mutations) {
          if (mutations[0] && mutations[0].target) {
            window._vdiPosFlipTime = Date.now();
            window._vdiPosFlipText = mutations[0].target.textContent;
          }
        });
        var posEl = document.querySelector('[data-testid="playback-position"]');
        if (posEl) {
          window._vdiPosFlipText = posEl.textContent;
          window._vdiPosObserver.observe(posEl, { characterData: true, childList: true, subtree: true });
        }
      }

      if (window._vdiPosFlipText) {
        var parts = window._vdiPosFlipText.trim().split(':').map(Number);
        var base = parts.length === 2 ? parts[0] * 60 + parts[1] : (parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0);
        var elapsed = (Date.now() - window._vdiPosFlipTime) / 1000.0;
        
        // Prevent elapsed from compounding if Spotify is paused in the background
        if (!isPlaying) {
          elapsed = 0;
          window._vdiPosFlipTime = Date.now();
        }
        
        uiCur = base + elapsed;
      } else if (uiCur > 0) {
        uiCur += 0.5; // fallback
      }
    }

    var art = null;
    if (ms && ms.metadata && ms.metadata.artwork && ms.metadata.artwork.length) {
      art = ms.metadata.artwork[ms.metadata.artwork.length - 1].src;
    }

    // Spotify shuffle: 3 modes — off / on / smart
    var playerBar = document.querySelector('[data-testid="player-controls"], .now-playing-bar') || document;
    var shufPath = playerBar.querySelector('path[d^="M13.151"], path[d^="M4.502"]');
    var shufBtn = shufPath ? shufPath.closest('button') : playerBar.querySelector('[data-testid="control-button-shuffle"], button[aria-label*="shuffle" i]');
    var shuffleOn = false;
    var isSmartShuffle = false;
    if (shufBtn) {
      shuffleOn = shufBtn.className.includes('encore-internal-color-text-bright-accent') || shufBtn.getAttribute('aria-checked') === 'true' || shufBtn.getAttribute('aria-checked') === 'mixed';
      var sLabel = (shufBtn.getAttribute('aria-label') || '').toLowerCase();
      isSmartShuffle = !!shufBtn.querySelector('path[d^="M12.69"]');
      if (!isSmartShuffle && shuffleOn && sLabel.includes('disable smart')) {
          isSmartShuffle = true;
      }
    }
    
    var repeatMode = 'off';
    var repBtn = document.querySelector('[data-testid="control-button-repeat"], button[aria-label*="repeat" i]');
    if (repBtn) {
      var ariaChecked = repBtn.getAttribute('aria-checked');
      var rLabel = (repBtn.getAttribute('aria-label') || '').toLowerCase();
      
      if (ariaChecked === 'true' || ariaChecked === 'mixed') {
        if (ariaChecked === 'mixed' || rLabel.includes('disable') || rLabel.includes('turn off')) {
          repeatMode = 'one';
        } else {
          repeatMode = 'all';
        }
      } else if (!ariaChecked) {
         if (rLabel.includes('disable') || rLabel.includes('turn off')) {
            repeatMode = 'one';
         } else if (rLabel.includes('enable repeat one')) {
            repeatMode = 'all'; // Spotify next-action logic
         }
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
      platform: 'spotify',
      shuffleOn: shuffleOn,
      smartShuffleOn: isSmartShuffle,
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
        function isNodeActive(el) {
          if (!el) return false;
          if (el.getAttribute('aria-pressed') === 'true') return true;
          if (el.getAttribute('is-toggled') === 'true') return true;
          var title = (el.getAttribute('title') || el.getAttribute('aria-label') || '').toLowerCase();
          if (title.includes('turn off') || title.includes('disable')) return true;
          
          // Check children for aria-pressed
          var children = deepQuery('*', el);
          for (var i = 0; i < children.length; i++) {
             if (children[i].getAttribute('aria-pressed') === 'true') return true;
             if (children[i].getAttribute('is-toggled') === 'true') return true;
             var ct = (children[i].getAttribute('title') || children[i].getAttribute('aria-label') || '').toLowerCase();
             if (ct.includes('turn off') || ct.includes('disable')) return true;
          }
          
          // Check color of SVG/Icon
          var icon = deepQueryOne('yt-icon, svg', el) || el;
          var c = window.getComputedStyle(icon).color || '';
          var f = window.getComputedStyle(icon).fill || '';
          if (c.includes('255, 255, 255') || f.includes('255, 255, 255')) return true;
          
          return false;
        }

        var shuffleEl = deepQueryOne('ytmusic-toggle-button-renderer[aria-label*="shuffle" i], ytmusic-toggle-button-renderer[title*="shuffle" i], tp-yt-paper-icon-button[aria-label*="shuffle" i], tp-yt-paper-icon-button[title*="shuffle" i], button[aria-label*="shuffle" i], button[title*="shuffle" i]', playerBar);
        var repeatEl = deepQueryOne('ytmusic-toggle-button-renderer[aria-label*="repeat" i], ytmusic-toggle-button-renderer[title*="repeat" i], tp-yt-paper-icon-button[aria-label*="repeat" i], tp-yt-paper-icon-button[title*="repeat" i], button[aria-label*="repeat" i], button[title*="repeat" i]', playerBar);
        
        if (shuffleEl && isNodeActive(shuffleEl)) {
           shuffleOn = true;
        }
        
        if (repeatEl) {
           var rTitle = (repeatEl.getAttribute('title') || repeatEl.getAttribute('aria-label') || '').toLowerCase();
           var children = deepQuery('*', repeatEl);
           for (var j = 0; j < children.length; j++) {
              rTitle += ' ' + (children[j].getAttribute('title') || children[j].getAttribute('aria-label') || '').toLowerCase();
           }
           if (rTitle.includes('one') || rTitle.includes('1')) {
              repeatMode = 'one';
           } else if (rTitle.includes('all') || isNodeActive(repeatEl)) {
              repeatMode = 'all';
           }
        }
      }

        var finalTitle = (ms && ms.metadata && ms.metadata.title) || '';
        var finalArtist = (ms && ms.metadata && ms.metadata.artist) || '';

        // YOUTUBE MUSIC DOM FALLBACK (Bypasses KDE Plasma Integration Hijack)
        if (isYTMusic && (!finalTitle || !finalArtist || !art || finalArtist === 'Unknown Artist')) {
          var ytTitleEl = deepQueryOne('yt-formatted-string.title');
          var ytArtistEl = deepQueryOne('span.subtitle, .subtitle.ytmusic-player-bar .yt-formatting-string, .byline.ytmusic-player-bar');
          var thumbnailContainer = document.querySelector('.thumbnail.ytmusic-player-bar') || document;
          var ytArtEl = deepQueryOne('img#img, img.ytmusic-player-bar', thumbnailContainer);

          if (ytTitleEl) finalTitle = ytTitleEl.getAttribute('title') || ytTitleEl.textContent || finalTitle;
          if (ytArtistEl) finalArtist = ytArtistEl.getAttribute('title') || ytArtistEl.textContent || finalArtist;
          if (ytArtEl && ytArtEl.src) {
             var highResSrc = ytArtEl.src.replace(/w\d+-h\d+/, 'w600-h600');
             if (highResSrc.indexOf('data:image') !== 0) art = highResSrc;
          }
        }

        return {
          title: finalTitle,
          artist: finalArtist,
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
          platform: isYTMusic ? 'ytmusic' : (location.hostname.includes('youtube.com') ? 'youtube' : 'other'),
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
  var _vdiInternalTargetState = null;
  var _vdiInternalStateTimeout = null;

  function executeMediaAction(act, val) {
    var deepQuery = VDI.Core.deepQuery;
    var deepQueryOne = VDI.Core.deepQueryOne;
    
    // 100% ISOLATION: Intercept Spotify immediately
    if (window.location.hostname.includes('spotify.com')) {
      if (act === 'play' || act === 'pause' || act === 'toggle') {
        var tb = document.querySelector('[data-testid="control-button-playpause"]');
        if (tb) {
          var isPlaying = (tb.getAttribute('aria-label') || '').toLowerCase().includes('pause');
          if (_vdiInternalTargetState !== null) isPlaying = _vdiInternalTargetState;

          if (act === 'toggle') {
            tb.click();
          } else if (act === 'play' && !isPlaying) {
            tb.click();
            _vdiInternalTargetState = true;
          } else if (act === 'pause' && isPlaying) {
            tb.click();
            _vdiInternalTargetState = false;
          }

          if (act !== 'toggle') {
            clearTimeout(_vdiInternalStateTimeout);
            _vdiInternalStateTimeout = setTimeout(function() { _vdiInternalTargetState = null; }, 1000);
          }
        }
      } else if (act === 'prev') {
        var pb = document.querySelector('[data-testid="control-button-skip-back"]');
        if (pb) pb.click();
      } else if (act === 'next') {
        var nb = document.querySelector('[data-testid="control-button-skip-forward"]');
        if (nb) nb.click();
      } else if (act === 'shuffle') {
        var playerBar = document.querySelector('[data-testid="player-controls"], .now-playing-bar') || document;
        var sp = playerBar.querySelector('path[d^="M13.151"], path[d^="M4.502"]');
        var sb = sp ? sp.closest('button') : playerBar.querySelector('[data-testid="control-button-shuffle"], button[aria-label*="shuffle" i]');
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
        // Vivaldi runs in MAIN world (window.MusicKit available).
        // Firefox/Zen: use wrappedJSObject to access page's MusicKit from ISOLATED world.
        var pageWin = window.wrappedJSObject || window;
        var MK = pageWin.MusicKit;
        if (MK && typeof MK.getInstance === 'function' && MK.getInstance()) {
          var m = MK.getInstance();
          if (act === 'toggle') { m.isPlaying ? m.pause() : m.play(); return; }
          else if (act === 'prev') { m.skipToPreviousItem(); return; }
          else if (act === 'next') { m.skipToNextItem(); return; }
          else if (act === 'seek' && typeof val === 'number') { m.seekToTime(val); return; }
          else if (act === 'shuffle') { m.shuffleMode = m.shuffleMode === 0 ? 1 : 0; return; }
          else if (act === 'repeat') {
            // wrappedJSObject setter is silently ignored by MusicKit.
            // Click the native .button--repeat DOM button through shadow DOM instead.
            var repBtn = VDI.Core.deepQueryOne('.button--repeat, button[aria-label*="repeat" i], amp-playback-controls-repeat');
            if (repBtn) { repBtn.click(); return; }
            // Fallback: try setting repeatMode directly (Vivaldi main world)
            m.repeatMode = m.repeatMode === 0 ? 2 : (m.repeatMode === 2 ? 1 : 0);
            return;
          }
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
        } else if (act === 'shuffle') {
          var sb = deepQueryOne('.button--shuffle, button[aria-label*="shuffle" i], amp-playback-controls-shuffle');
          if (sb) sb.click();
        } else if (act === 'repeat') {
          var rb = deepQueryOne('.button--repeat, button[aria-label*="repeat" i], amp-playback-controls-repeat');
          if (rb) rb.click();
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
        } else if (act === 'shuffle') {
          var sb = deepQueryOne('button[aria-label*="shuffle" i], button[aria-label*="Shuffle" i], [class*="shuffle"]');
          if (sb) sb.click();
        } else if (act === 'repeat') {
          var rb = deepQueryOne('.button--repeat, amp-playback-controls-repeat, button[aria-label*="repeat" i], button[aria-label*="Repeat" i], [class*="repeat"]');
          if (rb) rb.click();
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
      var v = null;
      // On YouTube, prioritize the main player video to avoid hover preview thumbnails
      if (window.location.hostname.includes('youtube.com')) {
        v = document.querySelector('.html5-main-video');
      }
      if (!v) {
        var vids = Array.prototype.slice.call(document.querySelectorAll('video'));
        for (var i = 0; i < vids.length; i++) {
          if (!vids[i].paused) {
            v = vids[i];
            break;
          }
        }
        if (!v && vids.length) v = vids[0];
      }
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
      strictMode: false,
      bypassedSites: [],
      bypassLimits: {},
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
      var msg = { type: 'VDI_FOCUS_UPDATE', focus: F };
      // Send to content scripts in all normal tabs
      chrome.tabs.query({}, function(tabs) {
        for (var i = 0; i < tabs.length; i++) {
          chrome.tabs.sendMessage(tabs[i].id, msg, function() {
            if (chrome.runtime.lastError) {}
          });
        }
      });
      // Also send via runtime so extension pages (blocked.html) receive it
      chrome.runtime.sendMessage(msg, function() {
        if (chrome.runtime.lastError) {}
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
            var domain = activeBlocks[j];
            // Build exact domain list — includes www. variant but NOT subdomains
            // This prevents youtube.com from matching music.youtube.com
            var matchDomains = [domain];
            if (domain.indexOf('www.') !== 0) matchDomains.push('www.' + domain);
            // Always exclude music.youtube.com from a youtube.com block
            var excludedDomains = [];
            if (domain === 'youtube.com' || domain === 'www.youtube.com') {
              excludedDomains = ['music.youtube.com'];
            }
            var condition = {
              requestDomains: matchDomains,
              resourceTypes: ['main_frame']
            };
            if (excludedDomains.length) condition.excludedRequestDomains = excludedDomains;
            rules.push({
              id: 1000 + j,
              priority: 1,
              action: {
                type: 'redirect',
                redirect: {
                  extensionPath: '/blocked.html?site=' + encodeURIComponent(activeBlocks[j])
                }
              },
              condition: condition
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
      } else if (msg.type === 'VDI_CLOSE_TAB') {
        if (sender && sender.tab && sender.tab.id) {
          chrome.tabs.remove(sender.tab.id);
        }
      } else if (msg.type === 'VDI_BATCH_ROMANIZE') {
        VDI.Core.batchRomanize(msg.lines, function(result) {
          sendResponse(result);
        });
        return true;
      } else if (msg.type === 'VDI_FOCUS_REQUEST') {
        sendResponse(F);
      } else if (msg.type === 'VDI_GET_PREV_TAB') {
        sendResponse({ tabId: lastNonBlockedTabId });
        return true;
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
            // DNR only catches new navigations — redirect already-open blocked tabs too
            var blocklist = res.glance_focus_blocklist || [];
            if (blocklist.length === 0) return;
            chrome.tabs.query({}, function(tabs) {
              for (var i = 0; i < tabs.length; i++) {
                var tab = tabs[i];
                if (!tab.url) continue;
                try {
                  var tabHostname = new URL(tab.url).hostname;
                  for (var j = 0; j < blocklist.length; j++) {
                    var blocked = blocklist[j];
                    // Exact hostname match or www. variant — never match subdomains
                    var isMatch = tabHostname === blocked || tabHostname === 'www.' + blocked;
                    // Special case: youtube.com block must not catch music.youtube.com
                    if (blocked === 'youtube.com' && tabHostname === 'music.youtube.com') isMatch = false;
                    if (isMatch &&
                        tab.url.indexOf('blocked.html') === -1 &&
                        F.bypassedSites.indexOf(blocked) === -1) {
                      chrome.tabs.update(tab.id, {
                        url: chrome.runtime.getURL('blocked.html?site=' + encodeURIComponent(blocked))
                      });
                      break;
                    }
                  }
                } catch (e) {}
              }
            });
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
        if (F.phase === 'waiting') {
          // Already waiting — skip directly to the next phase
          handleMessage({ type: 'VDI_FOCUS_START', phase: F.nextPhase || 'work' }, sender, function(){});
        } else {
          handleFocusComplete();
        }
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
      } else {
        nextP = 'work';
      }
      
      handleMessage({ type: 'VDI_FOCUS_WAIT', nextPhase: nextP }, null, function(){});
    }

    function start() {
      // Clear any stale block rules from previous session
      // DNR rules persist across browser restarts but F resets to idle,
      // so we must always clear on startup and only re-add if session is restored
      if (typeof chrome.declarativeNetRequest !== 'undefined') {
        chrome.declarativeNetRequest.getDynamicRules(function(existing) {
          var staleIds = existing.filter(function(r) { return r.id >= 1000; }).map(function(r) { return r.id; });
          if (staleIds.length > 0) {
            chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: staleIds, addRules: [] });
          }
        });
      }

      setInterval(poll, pollInterval);
      poll();

      chrome.runtime.onMessage.addListener(handleMessage);
      // Expose for console testing & internal use (alarms, storage triggers)
      self._vdiHandleMessage = handleMessage;
      var lastNonBlockedTabId = null;
      chrome.tabs.onActivated.addListener(function(info) {
        poll();
        // Track last non-blocked tab so blocked page can return to it
        chrome.tabs.get(info.tabId, function(tab) {
          if (chrome.runtime.lastError) return;
          if (tab && tab.url && tab.url.indexOf('blocked.html') === -1) {
            lastNonBlockedTabId = info.tabId;
          }
        });
        // Re-poll quickly after switching to give media time to load
        multiPoll(poll, [500, 1500, 3000]);
      });

      // Re-poll aggressively when a supported tab finishes loading (hard refresh recovery)
      var SUPPORTED_HOSTS_CHECK = ['youtube.com', 'music.youtube.com', 'spotify.com', 'open.spotify.com', 'music.apple.com'];
      chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        if (changeInfo.status !== 'complete') return;
        if (!tab.url) return;
        try {
          var h = new URL(tab.url).hostname;
          var isSupported = SUPPORTED_HOSTS_CHECK.some(function(host) {
            return h === host || h.endsWith('.' + host);
          });
          if (isSupported) {
            // Page just finished loading — poll at 1s, 2s, 4s, 7s to catch media initialisation
            multiPoll(poll, [1000, 2000, 4000, 7000]);
          }
        } catch(e) {}
      });

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



(function() {
  'use strict';

  var worker = VDI.Platform.ChromeExt.createBackgroundWorker();
  worker.start();

})();
