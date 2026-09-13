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
 * Glance - Shared CSS Styles
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
        'position:fixed !important;top:' + islandTop + 'px !important;left:50% !important;transform:translateX(-50%) !important;',
        'z-index:2147483647 !important;border-radius:32px !important;overflow:hidden !important;user-select:none !important;cursor:default !important;',
        'width:168px !important;height:34px !important;',
        'background:var(--vdi-dark,' + dark + ') !important;',
        'box-shadow:0 0 0 1px rgba(255,255,255,.08),0 10px 40px rgba(0,0,0,.8),0 0 80px var(--vdi-glow,rgba(99,102,241,.18)) !important;',
        'opacity:0 !important;pointer-events:none !important;',
        'font-family:"Inter",-apple-system,system-ui,"Segoe UI",sans-serif !important;',
        '-webkit-font-smoothing:antialiased !important;-moz-osx-font-smoothing:grayscale !important;text-rendering:optimizeLegibility !important;letter-spacing:normal !important;line-height:normal !important;',
        'transition:width .5s cubic-bezier(0.32, 0.72, 0, 1),height .5s cubic-bezier(0.32, 0.72, 0, 1),',
          'border-radius .5s cubic-bezier(0.32, 0.72, 0, 1),background .7s ease,box-shadow .7s ease,opacity .3s ease !important;',
      '}'
    );
    rules.push(
      '#vdi.vdi-swallowed{',
        'top: 50% !important;',
        'transform: translate(-50%, -50%) scale(2.5) !important;',
        'box-shadow: 0 0 0 1px rgba(255,255,255,.05), 0 30px 100px rgba(0,0,0,1), 0 0 160px var(--vdi-glow,rgba(99,102,241,.18)) !important;',
      '}'
    );
    // Bug 8 fix: force all island children to inherit font-family, blocking host CSS overrides
    rules.push('#vdi *{font-family:inherit !important;}');

    // State classes
    rules.push('#vdi.vdi-visible{opacity:1 !important;pointer-events:all !important;}');
    rules.push('#vdi.vdi-expanded{width:400px !important;height:152px !important;border-radius:26px !important;}');
    rules.push('#vdi.vdi-idle{width:28px!important;height:28px!important;border-radius:14px!important;opacity:.95!important;}');

    // ═══════════════════════════════════════════════════════════
    // Collapsed Pill View
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-col{',
        'position:absolute !important;top:50% !important;left:50% !important;transform:translate(-50%,-50%) !important;',
        'width:168px !important;height:34px !important;box-sizing:border-box !important;',
        'display:flex !important;align-items:center !important;gap:8px !important;padding:0 13px !important;',
        'opacity:1 !important;transition:opacity .25s ease !important;',
      '}'
    );
    rules.push('#vdi.vdi-expanded #vdi-col{opacity:0 !important;pointer-events:none !important;}');
    rules.push('#vdi.vdi-idle #vdi-col{justify-content:center;padding:0;width:28px;height:28px;gap:0 !important;transition:gap .3s cubic-bezier(0.32, 0.72, 0, 1) !important;}');
    rules.push('#vdi.vdi-idle #vdi-col-text, #vdi.vdi-idle #vdi-col-btn{max-width:0 !important;opacity:0 !important;margin:0 !important;padding:0 !important;pointer-events:none !important;border:none !important;}');
    rules.push('#vdi-col-media, #vdi-col-focus{display:flex;align-items:center !important;justify-content:center !important;position:relative !important;width:18px !important;height:18px !important;flex-shrink:0 !important;}');

    // ═══════════════════════════════════════════════════════════
    // Detached Focus Bubble (anchored to island via JS)
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-focus-bubble{',
        'position:fixed !important;top:' + islandTop + 'px !important;',
        'z-index:2147483646 !important;border-radius:17px !important;overflow:hidden !important;user-select:none !important;cursor:default !important;',
        'height:34px !important;',
        'background:var(--vdi-dark,' + dark + ') !important;',
        'backdrop-filter:blur(40px) !important;-webkit-backdrop-filter:blur(40px) !important;',
        'box-shadow:0 0 0 1px rgba(255,255,255,.08),0 10px 40px rgba(0,0,0,.8),0 0 80px var(--vdi-glow,rgba(99,102,241,.18)) !important;',
        'opacity:0 !important;pointer-events:none !important;',
        'font-family:"Inter",-apple-system,system-ui,"Segoe UI",sans-serif !important;',
        '-webkit-font-smoothing:antialiased !important;-moz-osx-font-smoothing:grayscale !important;text-rendering:optimizeLegibility !important;',
        'display:flex !important;align-items:center !important;justify-content:center !important;padding:0 10px !important;gap:6px !important;box-sizing:border-box !important;',
        'width:auto !important;max-width:0 !important;',
        'transition:max-width .5s cubic-bezier(0.32, 0.72, 0, 1),opacity .3s ease,',
          'background .7s ease,box-shadow .7s ease,padding .3s cubic-bezier(0.32, 0.72, 0, 1) !important;',
      '}'
    );
    rules.push('#vdi-focus-bubble *{font-family:inherit !important;}');
    // Visible: compact pill with ring + time
    rules.push('#vdi-focus-bubble.vdi-visible{max-width:80px !important;opacity:1 !important;pointer-events:all !important;}');
    // Expanded: show controls
    rules.push('#vdi-focus-bubble.vdi-expanded{max-width:200px !important;}');

    // Progress ring — matches island accent
    rules.push(
      '.vdi-progress-ring{',
        '--progress:0;',
        'width:20px !important;height:20px !important;border-radius:50% !important;flex-shrink:0 !important;',
        'background:conic-gradient(var(--vdi-accent,' + accent + ') calc(var(--progress) * 360deg), rgba(255,255,255,0.12) 0deg) !important;',
        '-webkit-mask:radial-gradient(closest-side, transparent 78%, #000 80%) !important;',
        'mask:radial-gradient(closest-side, transparent 78%, #000 80%) !important;',
      '}'
    );

    // Timer text — matches island typography
    rules.push(
      '#vdi-focus-time{',
        'font-size:12px !important;font-weight:700 !important;color:rgba(255,255,255,0.9) !important;',
        'letter-spacing:0.3px !important;white-space:nowrap !important;',
      '}'
    );

    // Action buttons container — hidden until hover
    rules.push(
      '#vdi-focus-actions{',
        'display:flex !important;gap:4px !important;opacity:0 !important;max-width:0 !important;overflow:hidden !important;',
        'transition:opacity .2s ease,max-width .3s cubic-bezier(0.32, 0.72, 0, 1) !important;',
      '}'
    );
    rules.push('#vdi-focus-bubble.vdi-expanded #vdi-focus-actions{opacity:1 !important;max-width:100px !important;}');

    // Action buttons — same style as island buttons
    rules.push(
      '#vdi-focus-actions button{',
        'background:rgba(255,255,255,0.08) !important;border:none !important;color:rgba(255,255,255,0.8) !important;',
        'border-radius:10px !important;font-size:10px !important;font-weight:600 !important;',
        'padding:4px 8px !important;cursor:pointer !important;font-family:inherit !important;',
        'white-space:nowrap !important;transition:background .2s ease,color .2s ease !important;',
      '}'
    );
    rules.push('#vdi-focus-actions button:hover{background:rgba(255,255,255,0.15) !important;color:#fff !important;}');
    rules.push('#vdi-focus-btn-stop{color:#ff4757 !important;}');
    rules.push('#vdi-focus-btn-stop:hover{background:rgba(255,60,60,0.2) !important;}');



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
    rules.push('#vdi-col-text{flex:1 !important;display:flex !important;align-items:center !important;overflow:hidden !important;margin:0 10px !important;min-width:0 !important;}');
    rules.push('#vdi-col-inner{font-family:"Inter",-apple-system,system-ui,"Segoe UI",sans-serif !important;font-size:13px !important;font-weight:600 !important;color:#fff !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;transition:transform 0.3s cubic-bezier(0.32, 0.72, 0, 1),opacity 0.2s ease !important;transform:translateX(0);opacity:1;}');
    rules.push('#vdi:hover #vdi-col-inner{transform:translateX(10px) !important;opacity:0 !important;}');

    // ═══════════════════════════════════════════════════════════
    // Expanded View & Pager
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-exp{',
        'position:absolute !important;top:50% !important;left:50% !important;transform:translate(-50%,-50%) scale(.9) !important;',
        'width:400px !important;height:152px !important;box-sizing:border-box !important;',
        'opacity:0 !important;overflow:hidden !important;border-radius:26px !important;',
        'transition:opacity .35s ease .1s,transform .4s cubic-bezier(0.32, 0.72, 0, 1) !important;pointer-events:none !important;',
      '}'
    );
    rules.push('#vdi.vdi-expanded #vdi-exp{opacity:1 !important;transform:translate(-50%,-50%) scale(1) !important;pointer-events:all !important;}');
    
    // Pager Container
    // Pager Container
    rules.push(
      '#vdi-pages{',
        'position:relative !important;width:100% !important;height:100% !important;overflow:hidden !important;',
      '}'
    );
    // Page Layout
    rules.push(
      '.vdi-page{',
        'position:absolute !important;top:0 !important;left:0 !important;',
        'width:100% !important;height:100% !important;box-sizing:border-box !important;',
        'display:flex !important;align-items:center !important;padding:14px 15px !important;gap:13px !important;',
        'transition:transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease !important;opacity:0 !important;pointer-events:none !important;',
      '}'
    );
    rules.push('.vdi-page.active{opacity:1 !important;transform:translateX(0) !important;pointer-events:all !important;}');
    rules.push('.vdi-no-transition{transition:none !important;}');
    // ═══════════════════════════════════════════════════════════
    // Focus Timer Page
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-page-focus{gap:0 !important;}');
    rules.push(
      '#vdi-focus-ring-container{',
        'width:74px !important;height:74px !important;min-width:74px !important;min-height:74px !important;',
        'border-radius:14px !important;flex-shrink:0 !important;position:relative !important;',
        'display:flex;align-items:center !important;justify-content:center !important;',
        'margin-right:13px !important;',
        'transition:width 0.4s cubic-bezier(0.32, 0.72, 0, 1), min-width 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease !important;',
      '}'
    );
    rules.push(
      '.vdi-progress-ring{',
        '--progress:0;',
        'border-radius:50% !important;',
        'background:conic-gradient(var(--vdi-accent,' + accent + ') calc(var(--progress) * 360deg), rgba(255,255,255,0.1) 0deg) !important;',
      '}'
    );
    // Large Ring (Expanded)
    rules.push('.vdi-progress-ring.exp-ring{width:74px !important;height:74px !important;-webkit-mask:radial-gradient(closest-side, transparent 85%, #000 87%) !important;mask:radial-gradient(closest-side, transparent 85%, #000 87%) !important;position:absolute !important;inset:0 !important;}');
    // Hourglass (Collapsed)
    rules.push('@keyframes vdiHourglassDynamic{0%,100%{transform:rotate(0deg);} 10%{transform:rotate(-15deg);} 20%{transform:rotate(15deg);} 30%{transform:rotate(0deg);} 50%,95%{transform:rotate(180deg);}}');
    rules.push('#vdi-hourglass{width:16px !important;height:16px !important;position:absolute !important;top:50% !important;left:50% !important;transform:translate(-50%,-50%) !important;color:var(--vdi-accent,' + accent + ') !important;}');
    rules.push('#vdi-hourglass svg{width:100% !important;height:100% !important;display:block !important;transform-origin:center !important;}');
    rules.push('#vdi-col-focus.running #vdi-hourglass svg{animation:vdiHourglassDynamic 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite !important;}');

    rules.push('#vdi-focus-icon{position:absolute !important;color:var(--vdi-accent,' + accent + ') !important;opacity:0.7 !important;width:24px !important;height:24px !important;transition:opacity 0.3s ease !important;}');
    
    rules.push('#vdi-focus-inner-pages{flex:1 !important;position:relative !important;display:flex !important;align-items:center !important;justify-content:center !important;min-width:0 !important;align-self:stretch !important;}');
    rules.push('#vdi-focus-setup, #vdi-focus-track{position:absolute !important;top:0 !important;left:0 !important;width:100% !important;height:100% !important;transition:opacity 0.3s ease, transform 0.3s ease !important;display:flex !important;flex-direction:column !important;align-items:center !important;justify-content:center !important;}');
    rules.push('#vdi-focus-setup{gap:8px !important;}');
    rules.push('.vdi-focus-setup-header{font-size:14px !important;font-weight:600 !important;color:#fff !important;margin:0 !important;line-height:1 !important;}');
    
    rules.push('#vdi-focus-track{justify-content:center !important;gap:5px !important;min-width:0 !important;}');
    rules.push('.vdi-fade-out{opacity:0 !important;pointer-events:none !important;transform:translateY(10px) !important;}');
    rules.push('#vdi-focus-ring-container.vdi-ring-hide{width:0 !important;min-width:0 !important;opacity:0 !important;margin:0 !important;padding:0 !important;pointer-events:none !important;}');
    rules.push('#vdi-focus-title-row{display:flex !important;align-items:center !important;gap:6px !important;max-width:100% !important;min-width:0 !important;}');
    rules.push('#vdi-focus-title{flex:1 !important;font-size:13px !important;font-weight:600 !important;color:#fff !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;}');
    rules.push('#vdi-focus-status{font-size:11px !important;font-weight:600 !important;text-transform:uppercase !important;letter-spacing:1px !important;color:var(--vdi-accent, #fff) !important;margin:4px 0 !important;text-align:center !important;}');
    rules.push('#vdi-focus-time{font-size:24px !important;font-weight:700 !important;color:#fff !important;letter-spacing:1px !important;margin:4px 0 !important;font-variant-numeric: tabular-nums !important;}');
    rules.push('#vdi-focus-ctrl-row{display:flex !important;align-items:center !important;gap:8px !important;}');

    // Toggle switch
    rules.push('.vdi-switch{position:relative !important;display:inline-block !important;width:42px !important;height:24px !important;}');
    rules.push('.vdi-switch input{opacity:0 !important;width:0 !important;height:0 !important;}');
    rules.push('.vdi-slider{position:absolute !important;cursor:pointer !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;background-color:rgba(255,255,255,0.2) !important;transition:.3s !important;border-radius:24px !important;}');
    rules.push('.vdi-slider:before{position:absolute !important;content:"" !important;height:18px !important;width:18px !important;left:3px !important;bottom:3px !important;background-color:white !important;transition:.3s cubic-bezier(0.32, 0.72, 0, 1) !important;border-radius:50% !important;}');
    rules.push('.vdi-switch input:checked + .vdi-slider{background-color:var(--vdi-accent,' + accent + ') !important;}');
    rules.push('.vdi-switch input:checked + .vdi-slider:before{transform:translateX(18px) !important;}');


    rules.push('#vdi-teleport-btn{position:absolute !important;top:10px !important;right:40px !important;width:24px !important;height:24px !important;background:rgba(255,255,255,.08) !important;border:none !important;border-radius:50% !important;display:flex !important;align-items:center !important;justify-content:center !important;cursor:pointer !important;z-index:10 !important;color:rgba(255,255,255,.7) !important;}');
    rules.push('#vdi-teleport-btn svg{width:12px !important;height:12px !important;}');
    rules.push('#vdi-teleport-btn:hover{background:rgba(255,255,255,.15) !important;color:var(--vdi-accent, #fff) !important;}');

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
    rules.push('#vdi-title-row{display:flex;align-items:center;gap:6px;min-width:0;padding-right:62px;box-sizing:border-box;}');
    rules.push('#vdi-title{flex:1;font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}');

    rules.push('#vdi-artist{font-size:11px;color:rgba(255,255,255,.38);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}');

    // ═══════════════════════════════════════════════════════════
    // Progress Bar
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-prog-row{display:flex;align-items:center;gap:5px;}');
    rules.push('.vdi-t{font-size:9px;color:rgba(255,255,255,.5);min-width:22px;}');
    rules.push('#vdi-prog{flex:1;height:12px;display:flex;align-items:center;background:transparent;cursor:pointer;position:relative;}');
    rules.push('#vdi-prog::before{content:"";position:absolute;left:0;right:0;top:5px;height:2px;background:rgba(255,255,255,.2);border-radius:99px;pointer-events:none;}');
    rules.push(
      '#vdi-prog-fill{',
        'position:absolute;top:5px;left:0;height:2px;',
        'width:0%;',
        'background:var(--vdi-accent,' + accent + ');',
        'transition:width .6s linear, background .7s ease;',
        'border-radius:99px;',
        'pointer-events:none;',
      '}'
    );
    rules.push(
      '#vdi-prog-knob{',
        'position:absolute;top:6px;left:0%;transform:translate(-50%, -50%);',
        'width:8px;height:8px;border-radius:50%;',
        'background:var(--vdi-accent,' + accent + ');',
        'transition:left .6s linear, background .7s ease, opacity .2s ease;',
        'pointer-events:none;opacity:0;',
      '}'
    );
    rules.push('#vdi-prog:hover #vdi-prog-knob, .vdi-is-dragging #vdi-prog-knob { opacity: 1; }');

    // ═══════════════════════════════════════════════════════════
    // Control Buttons
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-ctrl-row{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}');
    rules.push('#vdi-ctrl-main{display:flex;align-items:center;gap:6px;}');
    rules.push('#vdi-ctrl-extra{display:flex;align-items:center;gap:3px;}');

    // Hard reset for island buttons to prevent host CSS bleed (fixes Devpost padding/margin bugs)
    rules.push('.vdi-btn, .vdi-icon-btn, #vdi-play, #vdi-settings-btn, #vdi-close-btn, #vdi-teleport-btn, #vdi-romanize-btn { box-sizing: border-box !important; padding: 0 !important; margin: 0 !important; flex-shrink: 0 !important; min-width: 0 !important; min-height: 0 !important; }');
    rules.push('.vdi-btn svg, .vdi-icon-btn svg, #vdi-play svg, #vdi-settings-btn svg, #vdi-romanize-btn svg { flex-shrink: 0 !important; margin: 0 !important; padding: 0 !important; }');

    // Standard button
    rules.push(
      '.vdi-btn{',
        'width:32px !important;height:32px !important;border-radius:50% !important;border:none !important;cursor:pointer !important;',
        'display:flex !important;align-items:center !important;justify-content:center !important;',
        'background:transparent !important;',
        'color:rgba(255,255,255,.75) !important;',
        'transition:color .2s ease,transform .25s cubic-bezier(0.32,0.72,0,1),background .25s ease !important;',
      '}'
    );
    rules.push('.vdi-btn:hover{background:rgba(255,255,255,.08) !important;color:var(--vdi-accent, #fff) !important;transform:scale(1.1) !important;}');
    rules.push('.vdi-btn:active{transform:scale(.92) !important;}');
    rules.push('.vdi-hidden{display:none !important;}');
    rules.push('.vdi-btn svg{width:16px !important;height:16px !important;pointer-events:none !important;}');
    rules.push('.vdi-platform-apple #vdi-shuffle svg, .vdi-platform-apple #vdi-repeat svg { width: 38px !important; height: 34px !important; }');
    rules.push('.vdi-platform-youtube #vdi-shuffle svg, .vdi-platform-youtube #vdi-repeat svg, .vdi-platform-ytmusic #vdi-shuffle svg, .vdi-platform-ytmusic #vdi-repeat svg { width: 22px !important; height: 22px !important; }');
    rules.push('#vdi-shuffle, #vdi-repeat{background:transparent;color:rgba(255,255,255,.35);position:relative;transition:color 0.2s,background 0.2s;}');
    
    // ── Base active: flat vibrant color (inherits accent color) ──
    rules.push('#vdi-shuffle.vdi-active, #vdi-repeat.vdi-active{color: var(--vdi-accent, ' + accent + ') !important;}');
    // ── Spotify: dot below active button ──
    rules.push('.vdi-platform-spotify #vdi-shuffle.vdi-active::after, .vdi-platform-spotify #vdi-repeat.vdi-active::after{content:""; position:absolute; bottom:-1px; left:50%; transform:translateX(-50%); width:4px; height:4px; border-radius:50%; background:var(--vdi-accent,' + accent + '); opacity:1;}');

    

    rules.push('#vdi-repeat{position:relative;}');

    // Icon button (smaller, square-ish)
    rules.push(
      '.vdi-icon-btn{',
        'width:28px !important;height:28px !important;border-radius:8px !important;border:none !important;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(255,255,255,.04) !important;',
        'color:rgba(255,255,255,.55) !important;',
        'transition:color .15s,transform .15s,background .2s;',
      '}'
    );
    rules.push('#vdi-settings-btn:hover{background:rgba(255,255,255,.15) !important;}');
    rules.push('#vdi-settings-btn:hover svg{fill:var(--vdi-accent, #fff) !important;}');
    rules.push('.vdi-icon-btn:hover{background:rgba(255,255,255,.12) !important;color:var(--vdi-accent, #fff) !important;transform:scale(1.08);}');
    rules.push('.vdi-icon-btn.active{color:var(--vdi-accent,' + accent + ') !important;}');
    rules.push('.vdi-icon-btn.loading{pointer-events: none;}');
    rules.push(
      '.vdi-loading-dots{',
        'display:flex;gap:3px;align-items:center;justify-content:center;height:100%;',
      '}'
    );
    rules.push('.vdi-loading-dots span{width:4px;height:4px;background:currentColor;border-radius:50%;animation:vdi-bounce 0.6s infinite alternate;}');
    rules.push('.vdi-loading-dots span:nth-child(2){animation-delay:0.2s;}');
    rules.push('.vdi-loading-dots span:nth-child(3){animation-delay:0.4s;}');
    
    rules.push('@keyframes vdiBreathe{0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.1);opacity:0.8;}}');
    rules.push('@keyframes vdiSteam{0%,100%{opacity:0;transform:translateY(2px);} 50%{opacity:1;transform:translateY(-2px);}}');
    rules.push('@keyframes vdiFlicker{0%,100%{transform:scale(1) rotate(0deg);opacity:1;} 25%{transform:scale(1.05) rotate(2deg);opacity:0.9;} 75%{transform:scale(0.95) rotate(-2deg);opacity:0.9;}}');
    rules.push('@keyframes vdiWobble{0%,100%{transform:rotate(0deg);} 25%{transform:rotate(3deg);} 75%{transform:rotate(-3deg);}}');
    rules.push('@keyframes vdi-bounce{ 0%{transform:translateY(0);} 100%{transform:translateY(-3px);} }');
    rules.push('.vdi-icon-btn svg{width:15px;height:15px;pointer-events:none;}');

    // Play button (premium frosted glass aesthetic - distinct but cohesive)
    rules.push(
      '#vdi-play{',
        'width:44px !important;height:44px !important;border-radius:50% !important;',
        'background:rgba(255,255,255,0.12) !important;',
        'color:#fff !important;',
        'display:flex;align-items:center;justify-content:center;border:none !important;',
        'cursor:pointer;transition:transform .25s cubic-bezier(0.32, 0.72, 0, 1), background .25s ease;',
        'backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);',
        'box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;',
      '}'
    );
    rules.push('#vdi-play:hover{background:rgba(255,255,255,0.22) !important; color:var(--vdi-accent, #fff) !important; transform:scale(1.05);}');
    rules.push('#vdi-play svg{width:20px;height:20px;fill:currentColor !important;}');

    // ═══════════════════════════════════════════════════════════
    // Lyrics Panel\n
    rules.push(
      '#vdi-tasks-panel{',
        'position:fixed;left:50%;transform:translateX(-50%) translateY(-10px);',
        'z-index:2147483646;width:340px;height:380px;border-radius:32px;overflow:hidden;',
        'font-family:system-ui,-apple-system,Inter,Segoe UI,sans-serif;',
        'background:rgba(0,0,0,0.5);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);',
        'border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.6);',
        'opacity:0;pointer-events:none;',
        'transition:opacity 0.4s cubic-bezier(.32,.72,0,1), transform 0.4s cubic-bezier(.32,.72,0,1);',
      '}'
    );
    rules.push('#vdi-tasks-panel.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:all;}');
    
    // Custom task items CSS inside island
    rules.push(
      '.vdi-task-item { display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:8px 12px; transition:all 0.2s; }',
      '.vdi-task-item:hover { background:rgba(255,255,255,0.06); }',
      '.vdi-task-item.completed { opacity: 0.5; }',
      '.vdi-task-item.completed .vdi-task-text { text-decoration: line-through; }',
      '.vdi-task-text { flex:1; font-size:12px; color:#fff; word-break:break-word; }',
      '.vdi-task-checkbox { appearance:none; -webkit-appearance:none; width:16px; height:16px; border:1px solid rgba(255,255,255,0.4); border-radius:4px; cursor:pointer; position:relative; flex-shrink:0; }',
      '.vdi-task-checkbox:checked { background:var(--vdi-accent); border-color:var(--vdi-accent); }',
      '.vdi-task-checkbox:checked::after { content:""; position:absolute; top:2px; left:5px; width:3px; height:6px; border:solid white; border-width:0 2px 2px 0; transform:rotate(45deg); }',
      '.vdi-task-prio { font-size:9px; font-weight:700; text-transform:uppercase; padding:2px 6px; border-radius:4px; }',
      '.vdi-task-del { background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer; padding:2px; transition:color 0.2s; }',
      '.vdi-task-del:hover { color:#fff; }'
    );

    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-lyrics-panel{',
        'position:fixed;left:50%;transform:translateX(-50%) translateY(-10px);',
        'z-index:2147483646;width:400px;height:380px;border-radius:32px;overflow:hidden;',
        'font-family:system-ui,-apple-system,Inter,Segoe UI,sans-serif;',
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
      '.vdi-lyric-word.active-word{color:var(--vdi-accent, #fff);text-shadow:0 0 16px var(--vdi-accent, rgba(255,255,255,0.4));}',
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
        'width:24px !important;height:24px !important;position:absolute !important;top:10px !important;left:10px !important;border-radius:50% !important;',
        'display:flex !important;align-items:center !important;justify-content:center !important;cursor:pointer !important;opacity:0 !important;',
        'transition:all 0.2s !important;background:rgba(255,255,255,0.1) !important;z-index:3 !important;',
      '}',
      '#vdi:hover #vdi-settings-btn{opacity:1 !important;}',
      '#vdi-settings-btn:hover{background:rgba(255,255,255,0.25) !important;transform:rotate(45deg) !important;}',
      '#vdi-settings-btn svg{width:14px;height:14px;fill:rgba(255,255,255,0.8);}',

      '#vdi-stg-tooltip{position:fixed; width:150px; box-sizing: border-box !important; background:rgba(20,20,30,0.9); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; display:none; flex-direction:column; gap:8px; z-index:2147483647; box-shadow:0 10px 20px rgba(0,0,0,0.5); opacity:0; pointer-events:none; transition:opacity 0.3s, transform 0.3s; transform:translateY(-10px); font-family:system-ui,sans-serif;}',
      '#vdi-stg-tooltip.show{opacity:1; pointer-events:all; transform:translateY(0);}',
      '#vdi-stg-tooltip:before{content:""; position:absolute; top:12px; right:-6px; border-top:6px solid transparent; border-bottom:6px solid transparent; border-left:6px solid rgba(20,20,30,0.9);}',
      '#vdi-stg-tooltip span{font-size:12px; color:rgba(255,255,255,0.9); font-weight:500; line-height:1.4;}',
      '#vdi-stg-tooltip-btn{background:var(--vdi-accent, #6366f1); border:none; color:#fff; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit;}',
      '#vdi-stg-tooltip-btn:hover{filter:brightness(1.2);}',

    );
    rules.push('#vdi.vdi-idle #vdi-art{opacity:0 !important; max-width:0 !important; margin:0 !important; overflow:hidden !important; border:none !important;}');

    return rules.join('');
  }

  return {
    generate: generate,
    DEFAULTS: DEFAULTS
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
                for (var j = 0; j < blocklist.length; j++) {
                  if (tab.url.indexOf(blocklist[j]) !== -1 &&
                      tab.url.indexOf('blocked.html') === -1 &&
                      F.bypassedSites.indexOf(blocklist[j]) === -1) {
                    chrome.tabs.update(tab.id, {
                      url: chrome.runtime.getURL('blocked.html?site=' + encodeURIComponent(blocklist[j]))
                    });
                    break;
                  }
                }
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


/**
 * Glance - Shared UI Component
 * Manages the DOM, interactions, and visual updates
 */

var VDI = VDI || {};

VDI.UI = (function() {
  'use strict';

  // URL lockdown moved to core.js media detection — island must render on ALL tabs
  // so users can control music from any page

  var DEFAULTS = VDI.Styles.DEFAULTS;

  var NATIVE_SVGS = {
    spotify: {
      shuffle: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"></path><path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"></path></svg>',
      smartShuffle: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.502 0a.637.637 0 0 1 .634.58 4.84 4.84 0 0 0 .81 2.184c.515.739 1.297 1.356 2.487 1.486a.637.637 0 0 1 0 1.267c-1.19.13-1.972.747-2.487 1.487a4.8 4.8 0 0 0-.81 2.185.637.637 0 0 1-1.268 0 4.8 4.8 0 0 0-.81-2.185C2.543 6.265 1.76 5.648.57 5.518a.637.637 0 0 1 0-1.268c1.19-.13 1.972-.747 2.487-1.486a4.84 4.84 0 0 0 .81-2.185A.637.637 0 0 1 4.502 0m4.765 11.878c.056.065.126.15.198.236l.33.397.013.015A3 3 0 0 0 12.1 13.59h1.009l-.444.443a.75.75 0 0 0 1.061 1.06l2.254-2.253-2.254-2.254a.75.75 0 0 0-1.06 1.06l.443.444H12.1a1.5 1.5 0 0 1-1.146-.533l-.004-.005-.333-.4-.288-.343-.031-.035-.02-.021-.037-.037-.974 1.16Z"></path><path class="vdi-sparkle" d="M12.69 4.196a.75.75 0 0 1 1.06 0l2.254 2.254-2.254 2.254a.75.75 0 0 1-1.06-1.06l.443-.444h-1.008a1.5 1.5 0 0 0-1.15.536l-4.63 5.517c-.344.411-.982 1.021-1.822 1.021v-1.5c.122 0 .371-.124.674-.485l4.63-5.517A3 3 0 0 1 12.125 5.7h1.008l-.443-.443a.75.75 0 0 1 0-1.061"></path></svg>',
      repeat: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75z"></path></svg>',
      repeatOne: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h.75v1.5h-.75A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75zM12.25 2.5a2.25 2.25 0 0 1 2.25 2.25v5A2.25 2.25 0 0 1 12.25 12H9.81l1.018-1.018a.75.75 0 0 0-1.06-1.06L6.939 12.75l2.829 2.828a.75.75 0 1 0 1.06-1.06L9.811 13.5h2.439A3.75 3.75 0 0 0 16 9.75v-5A3.75 3.75 0 0 0 12.25 1h-.75v1.5z"></path><path d="m8 1.85.77.694H6.095V1.488q1.046-.077 1.507-.385.474-.308.583-.913h1.32V8H8z"></path></svg>'
    },
    youtube: {
      shuffle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.293 13.293a1 1 0 011.414 0L22.414 18l-4.707 4.707a1 1 0 01-1.414-1.413L18.586 19H17.21a7.001 7.001 0 01-5.824-3.117l-.186-.278 1.202-1.803.648.972A5.001 5.001 0 0017.21 17h1.375l-2.293-2.293a1 1 0 010-1.414Zm0-12a1 1 0 011.414 0L22.414 6l-4.707 4.707a1 1 0 01-1.414-1.414L18.586 7H17.21a5 5 0 00-4.16 2.227l-4.438 6.656A7 7 0 012.79 19H2a1 1 0 010-2h.79a5 5 0 004.16-2.226l4.437-6.656A7 7 0 0117.21 5h1.375l-2.293-2.292a1 1 0 010-1.415ZM3 10.001a2 2 0 110 4 2 2 0 010-4Zm-.21-5a7 7 0 015.823 3.117l.185.277-1.202 1.803-.647-.971A5 5 0 002.79 7H2a1 1 0 010-2h.79Z"></path></svg>',
      shuffleOff: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.293 13.293a1 1 0 011.414 0L22.414 18l-4.707 4.707a1 1 0 01-1.414-1.413L18.586 19H17.21a7.001 7.001 0 01-5.824-3.117l-.186-.278 1.202-1.803.648.972A5.001 5.001 0 0017.21 17h1.375l-2.293-2.293a1 1 0 010-1.414Zm0-12a1 1 0 011.414 0L22.414 6l-4.707 4.707a1 1 0 01-1.414-1.414L18.586 7H17.21a5 5 0 00-4.16 2.227l-4.438 6.656A7 7 0 012.79 19H2a1 1 0 010-2h.79a5 5 0 004.16-2.226l4.437-6.656A7 7 0 0117.21 5h1.375l-2.293-2.292a1 1 0 010-1.415ZM2.79 5.001a7 7 0 015.823 3.117l.185.277-1.202 1.803-.647-.971A5 5 0 002.79 7H2a1 1 0 010-2h.79Z"></path></svg>',
      repeat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 10a1 1 0 011 1v4a5 5 0 01-5 5H5.414l1.293 1.293a1 1 0 11-1.414 1.414L1.586 19l3.707-3.707a1 1 0 111.414 1.414L5.414 18H17a3 3 0 003-3v-4a1 1 0 011-1Zm-3.707-8.707a1 1 0 011.414 0L22.414 5l-3.707 3.707a1 1 0 11-1.414-1.414L18.586 6H7a3 3 0 00-3 3v4a1 1 0 01-2 0V9a5 5 0 015-5h11.586l-1.293-1.293a1 1 0 010-1.414ZM12 10a2 2 0 110 4 2 2 0 010-4Z"></path></svg>',
      repeatOff: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.293 1.293a1 1 0 000 1.415L18.586 4H7a5 5 0 00-5 5v4a1 1 0 102 0V9a3 3 0 013-3h11.586l-1.293 1.293a1 1 0 001.414 1.415L22.414 5l-3.707-3.707a1 1 0 00-1.414 0ZM21 10a1 1 0 00-1 1v4a3 3 0 01-3 3H5.414l1.293-1.292a1.001 1.001 0 00-1.414-1.415L1.586 19l3.707 3.707a1 1 0 101.414-1.413L5.414 20H17a5 5 0 005-5v-4a1 1 0 00-1-1Z"></path></svg>',
      repeatOne: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.293 1.293a1 1 0 000 1.415L18.586 4H7a5 5 0 00-5 5v4a1 1 0 102 0V9a3 3 0 013-3h11.586l-1.293 1.293a1 1 0 001.414 1.415L22.414 5l-3.707-3.707a1 1 0 00-1.414 0ZM13 15V8h-2.5a1 1 0 000 2h.5v5a1 1 0 002 0Zm8-5a1 1 0 00-1 1v4a3 3 0 01-3 3H5.414l1.293-1.292a1.001 1.001 0 00-1.414-1.415L1.586 19l3.707 3.707a1 1 0 101.414-1.413L5.414 20H17a5 5 0 005-5v-4a1 1 0 00-1-1Z"></path></svg>'
    },
    apple: {
      shuffle: '<svg viewBox="0 0 32 28" fill="currentColor"><path d="M20.767 20.44a.81.81 0 00.49-.183l2.58-2.174c.316-.266.316-.681 0-.955l-2.58-2.183a.81.81 0 00-.49-.183c-.415 0-.673.258-.673.673v1.245h-1.162c-.739 0-1.195-.233-1.718-.847l-1.527-1.801 1.527-1.81c.54-.63.946-.847 1.677-.847h1.203v1.279c0 .407.258.664.673.664a.801.801 0 00.49-.174l2.58-2.175c.316-.266.316-.69 0-.955l-2.58-2.183a.761.761 0 00-.49-.183c-.415 0-.673.258-.673.665v1.386h-1.212c-1.228 0-1.992.34-2.863 1.386l-1.412 1.668-1.469-1.751c-.805-.946-1.569-1.303-2.747-1.303H8.896c-.53 0-.896.348-.896.838s.365.838.896.838h1.437c.697 0 1.162.225 1.685.847l1.519 1.801-1.52 1.81c-.53.623-.954.847-1.643.847H8.896c-.53 0-.896.348-.896.838s.365.838.896.838h1.536c1.179 0 1.901-.356 2.706-1.303l1.478-1.751 1.444 1.718c.822.98 1.627 1.336 2.822 1.336h1.212v1.412c0 .415.258.672.673.672z"></path></svg>',
      repeat: '<svg viewBox="0 0 32 28" fill="currentColor"><path d="M9.545 14.272a.856.856 0 00.863-.855v-.448c0-1.004.706-1.677 1.785-1.677h5.005v1.362c0 .407.258.664.673.664a.745.745 0 00.49-.183l2.581-2.166c.316-.266.316-.69 0-.955l-2.581-2.183a.745.745 0 00-.49-.183c-.415 0-.672.258-.672.665v1.294h-4.881c-2.217 0-3.628 1.254-3.628 3.213v.597c0 .474.382.855.855.855zm4.864 5.952c.407 0 .664-.257.664-.664v-1.303h4.881c2.225 0 3.628-1.254 3.628-3.213v-.597a.854.854 0 10-1.71 0v.448c0 1.004-.714 1.677-1.793 1.677h-5.006v-1.353c0-.407-.257-.664-.664-.664a.767.767 0 00-.498.182l-2.573 2.175c-.324.257-.315.68 0 .946l2.573 2.192a.807.807 0 00.498.174z" fill-rule="nonzero"></path></svg>',
      repeatOne: '<svg viewBox="0 0 32 28" fill="currentColor"><path d="M22.752 12.313c.473 0 .747-.257.747-.771V8.503c0-.54-.357-.904-.888-.904-.44 0-.698.14-1.038.398l-.838.656c-.2.15-.266.299-.266.473 0 .257.19.465.498.465.133 0 .24-.042.349-.125l.614-.514h.058v2.59c0 .514.274.771.764.771zm-13.207 1.96a.84.84 0 00.863-.856v-.448c0-1.004.706-1.677 1.785-1.677h3.403v1.362c0 .407.258.664.673.664a.745.745 0 00.49-.183l2.581-2.166c.316-.266.316-.69 0-.955L16.76 7.831a.745.745 0 00-.49-.183c-.415 0-.673.258-.673.665v1.294h-3.278c-2.217 0-3.628 1.254-3.628 3.213v.597c0 .49.374.855.855.855zm4.864 5.951c.407 0 .664-.257.664-.664v-1.303h4.881c2.225 0 3.628-1.254 3.628-3.213v-.597a.838.838 0 00-.855-.855.833.833 0 00-.855.855v.448c0 1.004-.714 1.677-1.793 1.677h-5.006v-1.353c0-.407-.257-.664-.664-.664a.767.767 0 00-.498.182l-2.573 2.175c-.324.257-.315.68 0 .946l2.573 2.192a.807.807 0 00.498.174z" fill-rule="nonzero"></path></svg>'
    },
    other: {
      shuffle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>',
      repeat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
      repeatOne: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4L13 15z"/></svg>'
    }
  };

  function createIsland(opts) {
    opts = opts || {};

    var island = document.createElement('div');
    island.id = 'vdi';

    island.innerHTML =
      '<div id="vdi-col">' +
        '<div id="vdi-col-media">' +
          '<div id="vdi-eq">' +
            '<div class="vdi-eq-bar b1"></div>' +
            '<div class="vdi-eq-bar b2"></div>' +
            '<div class="vdi-eq-bar b3"></div>' +
          '</div>' +
        '</div>' +
        '<div id="vdi-col-focus" class="vdi-hidden">' +
           '<div id="vdi-hourglass"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-3.99h-.01L18 18l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z"/></svg></div>' +
        '</div>' +
        '<div id="vdi-col-text"><span id="vdi-col-inner">No media</span></div>' +
      '</div>' +
      '<div id="vdi-exp">' +
        '<div id="vdi-settings-btn" title="Settings">' +
          '<svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"></path></svg>' +
        '</div>' +
        '<button id="vdi-close-btn" title="Hide Glance" style="position:absolute; top:12px; right:12px; z-index:100; background:rgba(255,255,255,0.1); border:none; border-radius:50%; width:24px; height:24px; color:rgba(255,255,255,0.6); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
        '</button>' +
        '<button id="vdi-teleport-btn" title="Jump to Media Tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg></button>' +
        '<div id="vdi-pages">' +
          '<div id="vdi-page-media" class="vdi-page active">' +
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
                '<div id="vdi-prog"><div id="vdi-prog-fill"></div><div id="vdi-prog-knob"></div></div>' +
                '<span class="vdi-t" id="vdi-dur" style="text-align:right">0:00</span>' +
              '</div>' +
              '<div id="vdi-ctrl-row">' +
                '<div id="vdi-ctrl-main">' +
                  '<button class="vdi-btn vdi-hidden" id="vdi-shuffle" title="Shuffle"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg></button>' +
                  '<button class="vdi-btn" id="vdi-prev" title="Previous"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>' +
                  '<button class="vdi-btn" id="vdi-play" title="Play/Pause"><svg id="vdi-pp" viewBox="0 0 24 24" fill="currentColor">' + VDI.Core.getPlayIcon(false) + '</svg></button>' +
                  '<button class="vdi-btn" id="vdi-next" title="Next"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>' +
                  '<button class="vdi-btn vdi-hidden" id="vdi-repeat" title="Repeat"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg></button>' +
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
            '<div id="vdi-study-hint" style="' +
              'position:absolute;bottom:10px;right:10px;' +
              'display:none;align-items:center;gap:6px;' +
              'background:color-mix(in srgb, var(--vdi-accent) 18%, rgba(0,0,0,0.6));' +
              'border:1px solid color-mix(in srgb, var(--vdi-accent) 55%, transparent);' +
              'border-radius:99px;padding:4px 11px 4px 8px;' +
              'font-size:11px;font-weight:700;letter-spacing:0.01em;' +
              'color:rgba(255,255,255,0.92);' +
              'cursor:default;transition:opacity 0.3s;white-space:nowrap;' +
              'box-shadow:0 0 12px color-mix(in srgb, var(--vdi-accent) 40%, transparent);' +
              'pointer-events:auto;' +
            '">' +
              '<span style="width:6px;height:6px;border-radius:50%;background:var(--vdi-accent);flex-shrink:0;box-shadow:0 0 6px var(--vdi-accent);"></span>' +
              'Scroll to see Study Mode \u2193' +
            '</div>' +
          '</div>' +
          '<div id="vdi-page-focus" class="vdi-page">' +
            '<div id="vdi-focus-ring-container" class="vdi-ring-hide">' +
              '<div class="vdi-progress-ring exp-ring"></div>' +
              '<div id="vdi-focus-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>' +
            '</div>' +
            '<div id="vdi-focus-inner-pages">' +
              '<div id="vdi-focus-setup">' +
                
                '<div style="display:flex;align-items:center;gap:8px;">' +
                  '<div class="vdi-focus-setup-header">Study Mode</div>' +
                  '<button class="vdi-btn vdi-tasks-btn-el" title="Tasks & Goals" style="width:24px;height:24px;background:rgba(255,255,255,0.1);border-radius:50%;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></button>' +
                '</div>' +

                '<label class="vdi-switch"><input type="checkbox" id="vdi-focus-study-toggle"><span class="vdi-slider"></span></label>' +
              '</div>' +
              '<div id="vdi-focus-track" class="vdi-fade-out">' +
                '<div id="vdi-focus-title-row" style="display:flex;align-items:center;gap:8px;">' +
                  '<div id="vdi-focus-title">Focus Mode</div>' +
                  '<button class="vdi-btn vdi-tasks-btn-el" title="Tasks & Goals" style="width:24px;height:24px;background:rgba(255,255,255,0.1);border-radius:50%;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></button>' +
                '</div>' +
                '<div id="vdi-focus-status">Ready to work</div>' +
                '<div id="vdi-focus-time">25:00</div>' +
                '<div id="vdi-focus-ctrl-row">' +
                  '<button class="vdi-btn" id="vdi-focus-btn-play" title="Play/Pause"><svg viewBox="0 0 24 24" fill="currentColor">' + VDI.Core.getPlayIcon(false) + '</svg></button>' +
                  '<button class="vdi-btn" id="vdi-focus-btn-skip" title="Skip Block"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>' +
                  '<button class="vdi-btn" id="vdi-focus-btn-stop" title="Stop Session"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg></button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    return island;
  }

  
    function getCenterIcon(phase, isRunning) {
      if (!isRunning) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: vdiBreathe 3s infinite ease-in-out; transform-origin: center;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
      }
      if (phase === 'shortBreak' || phase === 'longBreak') {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: vdiWobble 4s infinite ease-in-out; transform-origin: bottom center;"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4" style="animation: vdiSteam 2s infinite ease-in-out;"></line><line x1="10" y1="1" x2="10" y2="4" style="animation: vdiSteam 2s infinite ease-in-out 0.5s;"></line><line x1="14" y1="1" x2="14" y2="4" style="animation: vdiSteam 2s infinite ease-in-out 1s;"></line></svg>';
      }
      // Work Phase: Flame
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: vdiFlicker 1.5s infinite ease-in-out; transform-origin: bottom center;"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>';
    }

  function createSettingsPanel(opts) {
    opts = opts || {};
    // Shadow DOM host for complete CSS isolation from host pages
    var host = document.createElement('div');
    host.id = 'vdi-settings-host';
    host.style.cssText = 'position:fixed !important;top:0 !important;left:0 !important;width:0 !important;height:0 !important;overflow:visible !important;z-index:2147483647 !important;pointer-events:none !important;';
    var shadow = host.attachShadow({ mode: 'open' });

    var panel = document.createElement('div');
    panel.id = 'vdi-settings-panel';
    panel.innerHTML =
      '<div class="vdi-stg-header">Focus Mode</div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Site Blocklist</span><span class="vdi-stg-sub">Manage blocked websites and strict mode</span></div><button id="vdi-stg-focus-btn" class="vdi-shortcuts-btn">Manage</button></div>' +
      '<div style="height:1px;background:rgba(255,255,255,0.1);margin:4px 0;"></div>' +
      '<div class="vdi-stg-header" style="margin-top:8px;">Features</div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">AMOLED Dark Mode <span class="vdi-new-tag">NEW</span></span><span class="vdi-stg-sub">Use pure pitch black background for the glance instead of matching the album color</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-amoled"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Free Placement</span><span class="vdi-stg-sub">Allow dragging anywhere on the screen</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-freeplace"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Keyboard Shortcuts</span><span class="vdi-stg-sub">Manage global hotkeys for media controls</span></div><button id="vdi-stg-shortcuts-btn" class="vdi-shortcuts-btn">Edit</button></div>' +
      '<div class="vdi-stg-header" style="margin-top:8px;">Presets</div>' +
      '<div class="vdi-stg-row" style="justify-content:space-between; margin-top:4px;">' +
        '<button class="vdi-preset-btn" id="vdi-stg-pos-t" title="Snap to Top Center">Top</button>' +
        '<button class="vdi-preset-btn" id="vdi-stg-pos-b" title="Snap to Bottom Center">Bottom</button>' +
        '<button class="vdi-preset-btn" id="vdi-stg-pos-l" title="Snap to Left Edge">Left</button>' +
        '<button class="vdi-preset-btn" id="vdi-stg-pos-r" title="Snap to Right Edge">Right</button>' +
      '</div>' +
      '</div>';

    // Scoped styles inside shadow root — completely isolated from host CSS
    var style = document.createElement('style');
    style.textContent = [
      ':host{all:initial !important;position:fixed !important;top:0 !important;left:0 !important;width:0 !important;height:0 !important;z-index:2147483647 !important;pointer-events:none !important;}',
      '#vdi-settings-panel{',
        'position:fixed;width:300px;padding:16px;box-sizing:border-box;',
        'background:rgba(20,20,30,0.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);',
        'border:1px solid rgba(255,255,255,0.1);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.5);',
        'display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);',
        'z-index:2147483647;font-family:system-ui,-apple-system,sans-serif;font-size:13px;',
        'color:#fff;line-height:normal;letter-spacing:normal;text-align:left;',
      '}',
      '#vdi-settings-panel::-webkit-scrollbar{width:6px;}',
      '#vdi-settings-panel::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.2);border-radius:3px;}',
      '#vdi-settings-panel.show{opacity:1;pointer-events:all;}',
      '.vdi-stg-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}',
      '.vdi-stg-label{color:rgba(255,255,255,0.9);font-size:13px;font-weight:500;}',
      '.vdi-new-tag{background:#ff4757;color:#fff;font-size:8px;padding:2px 4px;border-radius:4px;font-weight:bold;margin-left:6px;letter-spacing:0.5px;vertical-align:middle;}',
      '.vdi-stg-sub{font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px;}',
      '.vdi-switch{position:relative;display:inline-block;width:36px;height:20px;flex-shrink:0;}',
      '.vdi-switch input{opacity:0;width:0;height:0;}',
      '.vdi-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:rgba(255,255,255,0.1);transition:.3s;border-radius:20px;border:1px solid rgba(255,255,255,0.1);}',
      '.vdi-slider:before{position:absolute;content:"";height:14px;width:14px;left:2px;bottom:2px;background-color:rgba(255,255,255,0.6);transition:.3s;border-radius:50%;}',
      '.vdi-switch input:checked + .vdi-slider{background-color:var(--vdi-accent, #6366f1);border-color:transparent;}',
      '.vdi-switch input:checked + .vdi-slider:before{transform:translateX(16px);background-color:#fff;}',
      '.vdi-stg-header{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--vdi-accent, #6366f1);margin-bottom:4px;font-weight:600;opacity:0.8;}',
      '.vdi-preset-btn{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.8);padding:4px 0;width:22%;border-radius:8px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:600;transition:all 0.2s;}',
      '.vdi-preset-btn:hover{background:var(--vdi-accent, #6366f1);color:#fff;border-color:transparent;}',
      '.vdi-offset-btn{background:rgba(255,255,255,0.1);border:none;color:#fff;padding:4px 8px;border-radius:6px;font-size:14px;cursor:pointer;font-family:inherit;}',
      '.vdi-shortcuts-btn{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.8);padding:6px 16px;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.2s;}',
      '.vdi-shortcuts-btn:hover{background:var(--vdi-accent, #6366f1);color:#fff;border-color:transparent;}'
    ].join('');
    shadow.appendChild(style);
    shadow.appendChild(panel);

    // Expose shadow root for external access
    host._shadow = shadow;
    host._panel = panel;
    return host;
  }

  function createSettingsTooltip() {
    var tt = document.createElement('div');
    tt.id = 'vdi-stg-tooltip';
    tt.innerHTML = 
      '<span>Customize the glance here!</span>' +
      '<button id="vdi-stg-tooltip-btn">Got it</button>';
    return tt;
  }

  
  function createTasksPanel(opts) {
    opts = opts || {};
    var panel = document.createElement('div');
    panel.id = 'vdi-tasks-panel';
    panel.innerHTML = 
      '<div style="padding: 16px; display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">' +
        '<div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #fff; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">' +
          '<span>Tasks & Goals</span>' +
          '<button id="vdi-close-tasks" style="background:none; border:none; color:rgba(255,255,255,0.5); cursor:pointer; padding:4px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>' +
        '</div>' +
        '<div style="display: flex; gap: 8px; margin-bottom: 12px;">' +
          '<input type="text" id="vdi-task-input" placeholder="New task..." style="flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; padding: 6px 10px; font-size: 12px; outline: none;">' +
          '<button id="vdi-add-task-btn" style="background: var(--vdi-accent); border: none; border-radius: 8px; color: white; padding: 6px 12px; font-weight: 600; cursor: pointer;">Add</button>' +
        '</div>' +
        '<div id="vdi-tasks-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; padding-right: 4px;"></div>' +
        '<div style="font-size: 10px; color: rgba(255,255,255,0.4); text-align: center; margin-top: auto; line-height: 1.4;">Right-click to change priority &middot; Middle-click to set active goal</div>' +
      '</div>';
    return panel;
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
      '<div id="vdi-lyrics-scroll"></div>';
    return panel;
  }

  function createController(island, lyrPanel, stgPanel, platform, opts) {
    opts = opts || {};
    var stgShadow = stgPanel && stgPanel._shadow ? stgPanel._shadow : null;
    var stgInner = stgPanel && stgPanel._panel ? stgPanel._panel : stgPanel;
    function stg$(id) { return stgShadow ? stgShadow.getElementById(id) : document.getElementById(id); }
    var isVivaldi = opts.isVivaldi || false;
    
    var isTasksPanelOpen = false;
    var toggleTasksPanel = null;
    var currentActiveTaskText = '';

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
      activePage: 'media',
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

    var focusState = {
      phase: 'idle',
      endTime: 0,
      totalMs: 0,
      running: false,
      workMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
      strictMode: true,
      lastText: ''
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
    var ttTimer = null;
    var isDragging = false;
    var isMouseOverIsland = false;
    var tickInterval = opts.tickInterval || 1000;
    var idleDelay = opts.idleDelay || 9000;
    var collapseDelay = opts.collapseDelay || 500;
    var settings = { hideYouTube: false, hideYouTubeMusic: false, hideSpotify: false, hideAppleMusic: false, enableLyrics: true, lyricsOffset: 0.0, freePlacement: true, seenTooltip: false, amoledBlack: false };

    // Helper
    function $(id) { return document.getElementById(id); }

    var cachedWords = null;

    // Theme application
    function applyTheme(c) {
      if (c) {
        // If the color was extracted with an outdated amoledBlack setting, ignore it and re-extract!
        if (c.isAmoled !== undefined && c.isAmoled !== settings.amoledBlack) {
          if (state && state.artwork) {
            VDI.Core.extractVibrant(state.artwork, settings.amoledBlack, applyTheme);
          }
          return;
        }
        state.lastExtractedColor = c;
        // Bug 6 fix: cache accent color for popup (service worker can't extract via DOM)
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({
            'vdi_accent_color': c.accent || null,
            'vdi_glow_color':   c.glow   || null
          });
        }
      }
      c = c || state.lastExtractedColor;

      var accent = c ? c.accent : DEFAULTS.accent;
      var grad = c ? c.gradient : DEFAULTS.gradient;
      var dark = c ? c.dark : (settings.amoledBlack ? '#000000' : DEFAULTS.dark);
      var glow = c ? c.glow : 'rgba(99,102,241,.2)';

      island.style.setProperty('--vdi-accent', accent);
      island.style.setProperty('--vdi-grad', grad);
      island.style.setProperty('--vdi-dark', dark);
      island.style.setProperty('--vdi-glow', glow);
      
      if (typeof stgPanel !== 'undefined' && stgPanel) {
        stgInner.style.setProperty('--vdi-accent', accent);
        stgInner.style.setProperty('--vdi-grad', grad);
        stgInner.style.setProperty('--vdi-dark', dark);
        stgInner.style.setProperty('--vdi-glow', glow);
      }
      var tp = $('vdi-tasks-panel');
      if (tp) {
        tp.style.setProperty('--vdi-accent', accent);
        tp.style.setProperty('--vdi-grad', grad);
        tp.style.setProperty('--vdi-dark', dark);
        tp.style.setProperty('--vdi-glow', glow);
      }
      var lp = $('vdi-lyrics-panel');
      if (lp) {
        lp.style.setProperty('--vdi-accent', accent);
      }
      
      var sp = document.getElementById('vdi-swallow-backdrop');
      if (sp) {
        sp.style.setProperty('--vdi-accent', accent);
        sp.style.setProperty('--vdi-glow', glow);
      }
    }

    var isDraggingProg = false;
    // Update progress bar
    function refreshProgress() {
      if (isDraggingProg) return;
      var pct = state.duration > 0 ? Math.min(100, (state.position / state.duration) * 100) : 0;
      $('vdi-prog-fill').style.width = pct + '%';
      if ($('vdi-prog-knob')) $('vdi-prog-knob').style.left = pct + '%';
      if ($('vdi-prog')) $('vdi-prog').style.setProperty('--vdi-pct', pct + '%');
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
      


      if (playing) island.classList.add('vdi-is-playing');
      else island.classList.remove('vdi-is-playing');
    }

    // Main UI update
    var manuallyClosed = false;

    var lastSavedActivePage = null;
    function updateUI() {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        if (state.activePage !== lastSavedActivePage) {
          lastSavedActivePage = state.activePage;
          chrome.storage.local.set({ 'vdi_active_page': state.activePage });
        }
      }
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

      // Apply platform class every render (not just on artwork change)
      var platform = state.platform || (onSpotify ? 'spotify' : (onAppleMusic ? 'apple' : (onYTM ? 'ytmusic' : (onYT ? 'youtube' : 'other'))));
      island.className = island.className.replace(/\bvdi-platform-\S+/g, '').trim();
      island.classList.add('vdi-platform-' + platform);

      var shouldShowLyrics = settings.enableLyrics && !state.isYouTubeVideo;
      if ($('vdi-lyr-btn')) $('vdi-lyr-btn').style.display = shouldShowLyrics ? '' : 'none';
      if (!shouldShowLyrics && state.lyricsOn) {
        state.lyricsOn = false;
        if ($('vdi-lyr-btn')) $('vdi-lyr-btn').classList.remove('active');
        if (lyrPanel) lyrPanel.classList.remove('show');
      }

      // -----------------------------------------------------
      // Context Switching (Media vs Focus)
      // -----------------------------------------------------
      var pageContainer = $('vdi-pages');
      var pageMedia = $('vdi-page-media');
      var pageFocus = $('vdi-page-focus');
      var colMedia = $('vdi-col-media');
      var colFocus = $('vdi-col-focus');

      if (pageContainer) {
        if (state.activePage === 'focus') {
          if (pageMedia) pageMedia.classList.remove('active');
          if (pageFocus) pageFocus.classList.add('active');
          
          if (colMedia) colMedia.classList.add('vdi-hidden');
          if (colFocus) colFocus.classList.remove('vdi-hidden');
          
          // Focus internal state: Toggle Setup vs Timer Track
          var setupEl = $('vdi-focus-setup');
          var trackEl = $('vdi-focus-track');
          var ringContainer = $('vdi-focus-ring-container');
          var isFocusActive = focusState && focusState.phase !== 'idle';
          
          if (isFocusActive) {
            if (setupEl) setupEl.classList.add('vdi-fade-out');
            if (trackEl) trackEl.classList.remove('vdi-fade-out');
            if (ringContainer) ringContainer.classList.remove('vdi-ring-hide');
          } else {
            if (setupEl) setupEl.classList.remove('vdi-fade-out');
            if (trackEl) trackEl.classList.add('vdi-fade-out');
            if (ringContainer) ringContainer.classList.add('vdi-ring-hide');
          }
        } else {
          if (pageMedia) pageMedia.classList.add('active');
          if (pageFocus) pageFocus.classList.remove('active');
          
          if (colMedia) colMedia.classList.remove('vdi-hidden');
          if (colFocus) colFocus.classList.add('vdi-hidden');
        }
      }
      // -----------------------------------------------------

      var label = [state.title, state.artist].filter(Boolean).join(' \u2014 ') || 'Now Playing';
      if (state.activePage !== 'focus') {
         $('vdi-col-inner').textContent = label;
      }
      $('vdi-title').textContent = state.title || 'Unknown Track';
      $('vdi-artist').textContent = state.artist || 'Unknown Artist';
      


      if ($('vdi-shuffle')) {
        var canShuffle = (platform === 'apple' || platform === 'spotify' || platform === 'ytmusic');
        if (canShuffle) { $('vdi-shuffle').classList.remove('vdi-hidden'); } else { $('vdi-shuffle').classList.add('vdi-hidden'); }
        var p = NATIVE_SVGS[platform] ? platform : (platform === 'ytmusic' ? 'youtube' : 'other');
        var shufOffSvg = NATIVE_SVGS[p].shuffleOff || NATIVE_SVGS[p].shuffle;
        var shufOnSvg = NATIVE_SVGS[p].shuffle;
        var smartShufSvg = NATIVE_SVGS[p].smartShuffle || shufOnSvg;
        
        $('vdi-shuffle').classList.remove('vdi-active', 'vdi-smart-shuffle');
        if (state.shuffleOn) {
          $('vdi-shuffle').classList.add('vdi-active');
          if (state.smartShuffleOn) {
            $('vdi-shuffle').classList.add('vdi-smart-shuffle');
            $('vdi-shuffle').innerHTML = state.shufSvg || smartShufSvg;
            $('vdi-shuffle').title = 'Smart Shuffle On';
          } else {
            $('vdi-shuffle').innerHTML = state.shufSvg || shufOnSvg;
            $('vdi-shuffle').title = 'Shuffle On';
          }
        } else {
          $('vdi-shuffle').innerHTML = state.shufSvg || shufOffSvg;
          $('vdi-shuffle').title = 'Shuffle Off';
        }
      }

      if ($('vdi-repeat')) {
        var canRepeat = (platform === 'apple' || platform === 'spotify' || platform === 'ytmusic');
        if (canRepeat) { $('vdi-repeat').classList.remove('vdi-hidden'); } else { $('vdi-repeat').classList.add('vdi-hidden'); }
        $('vdi-repeat').classList.remove('vdi-active', 'vdi-repeat-one');
        var p = NATIVE_SVGS[platform] ? platform : (platform === 'ytmusic' ? 'youtube' : 'other');
        var repOffSvg = NATIVE_SVGS[p].repeatOff || NATIVE_SVGS[p].repeat;
        var repeatSvg = NATIVE_SVGS[p].repeat;
        var repeatOneSvg = NATIVE_SVGS[p].repeatOne;
        if (state.repeatMode === 'all') {
          $('vdi-repeat').classList.add('vdi-active');
          $('vdi-repeat').innerHTML = state.repSvg || repeatSvg;
          $('vdi-repeat').title = 'Repeat All';
        } else if (state.repeatMode === 'one') {
          $('vdi-repeat').classList.add('vdi-active', 'vdi-repeat-one');
          $('vdi-repeat').innerHTML = state.repSvg || repeatOneSvg;
          $('vdi-repeat').title = 'Repeat One';
        } else {
          $('vdi-repeat').innerHTML = state.repSvg || repOffSvg;
          $('vdi-repeat').title = 'Repeat Off';
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
                  var tempImg = new Image();
                  tempImg.onload = function() {
                    img.src = highResUrl;
                    VDI.Core.extractVibrant(tempImg, settings.amoledBlack, applyTheme);
                  };
                  tempImg.crossOrigin = 'Anonymous';
                  tempImg.src = highResUrl;
                }
              });
            }
          } else {
            loadImg(state.artwork);
          }
          
          VDI.Core.extractVibrant(state.artwork, settings.amoledBlack, applyTheme);
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
      var r = island.getBoundingClientRect();
      var islandTop = r.top;
      var islandLeft = r.left + (r.width / 2);
      var ch = window.innerHeight;
      var expH = 152;
      var isBottomHalf = (islandTop > ch / 2 - (expH / 2));

      var lyr = $('vdi-lyrics-panel');
      if (lyr && state.lyricsOn) {
        lyr.style.left = islandLeft + 'px';
        if (isBottomHalf) {
          lyr.style.top = 'auto';
          lyr.style.bottom = (ch - islandTop + 16) + 'px';
          lyr.style.maxHeight = Math.max(100, islandTop - 32) + 'px';
        } else {
          var islandBottom = islandTop + expH;
          lyr.style.bottom = 'auto';
          lyr.style.top = (islandBottom + 16) + 'px';
          lyr.style.maxHeight = Math.max(100, ch - islandBottom - 32) + 'px';
        }
      }

      var tasksPanel = $('vdi-tasks-panel');
      if (tasksPanel && tasksPanel.classList.contains('show')) {
        tasksPanel.style.left = islandLeft + 'px';
        if (isBottomHalf) {
          tasksPanel.style.top = 'auto';
          tasksPanel.style.bottom = (ch - islandTop + 16) + 'px';
        } else {
          var islandBottom2 = islandTop + expH;
          tasksPanel.style.bottom = 'auto';
          tasksPanel.style.top = (islandBottom2 + 16) + 'px';
        }
      }
    }

    function updateTooltipPosition() {
      var stgTooltip = $('vdi-stg-tooltip');
      if (!stgTooltip) return;
      var r = island.getBoundingClientRect();
      stgTooltip.style.top = (r.top + 4) + 'px';
      stgTooltip.style.left = (r.left - 146) + 'px';
    }

    function updateSettingsPanelPosition() {
      var stgPanel = stgInner;
      if (!stgPanel || !stgPanel.classList.contains('show')) return;
      var r = island.getBoundingClientRect();
      var ch = window.innerHeight;
      var cw = window.innerWidth;
      var expH = 152;
      var panelW = 300;
      var islandTop = r.top;
      
      var isFlipped = (islandTop > ch / 2 - (expH / 2));
      var maxH;
      
      if (isFlipped) {
        // Place above
        stgPanel.style.setProperty('bottom', (ch - islandTop + 16) + 'px', 'important');
        stgPanel.style.setProperty('top', 'auto', 'important');
        maxH = islandTop - 32;
      } else {
        // Place below
        var islandBottom = islandTop + expH;
        stgPanel.style.setProperty('top', (islandBottom + 16) + 'px', 'important');
        stgPanel.style.setProperty('bottom', 'auto', 'important');
        maxH = ch - islandBottom - 32;
      }
      
      stgPanel.style.setProperty('max-height', Math.max(150, maxH) + 'px', 'important');
      stgPanel.style.setProperty('overflow-y', 'auto', 'important');
      
      // Clamp horizontal position to viewport
      var centeredLeft = (r.left + r.width / 2) - (panelW / 2);
      centeredLeft = Math.max(8, Math.min(centeredLeft, cw - panelW - 8));
      stgPanel.style.setProperty('left', centeredLeft + 'px', 'important');
      stgPanel.style.setProperty('transform', 'none', 'important');
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
      if (!state.selectedProvider) state.selectedProvider = 'lrclib';

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
        if (state.lyricsLines[i].time <= pos + lookahead + (settings.lyricsOffset || 0)) {
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
        
        var sp = stgInner;
        if (sp && sp.classList.contains('show')) return; // Never collapse if settings are open

        var tp = $('vdi-tasks-panel');
        if (tp && tp.classList.contains('show')) return; // Never collapse if tasks are open
        
        state.isIdle = true;
        island.classList.add('vdi-idle');
      }, idleDelay);
    }

    // Expand/collapse
    function handleMouseEnter() {
      isMouseOverIsland = true;
      clearTimeout(colTimer);
      if (state.isIdle) {
        state.isIdle = false;
        island.classList.remove('vdi-idle');
      }
      island.classList.add('vdi-expanded');

      if (!settings.seenTooltip && $('vdi-stg-tooltip')) {
        clearTimeout(ttTimer);
        ttTimer = setTimeout(function() {
          if (!settings.seenTooltip && island.classList.contains('vdi-expanded')) {
            settings.seenTooltip = true;
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ 'vdi_cfg_seenTooltip3': true });
            } else {
              localStorage.setItem('vdi_cfg_seenTooltip3', 'true');
            }
            $('vdi-stg-tooltip').style.display = 'flex';
            updateTooltipPosition();
            if ($('vdi-settings-btn')) $('vdi-settings-btn').style.opacity = '1';
            setTimeout(function() {
              $('vdi-stg-tooltip').classList.add('show');
            }, 50);
          }
        }, 1200);
      }

      // Study Mode hint — show once, 1.5s after first hover
      var studyHintEl = $('vdi-study-hint');
      if (studyHintEl && !localStorage.getItem('vdi_seen_study_hint_v2') && state.activePage === 'media') {
        setTimeout(function() {
          if (island.classList.contains('vdi-expanded') && state.activePage === 'media' && !localStorage.getItem('vdi_seen_study_hint_v2')) {
            studyHintEl.style.display = 'flex';
          }
        }, 1500);
      }

      resetIdle();
    }

    function handleMouseLeave() {
      isMouseOverIsland = false;
      if (isDragging) return;
      clearTimeout(colTimer);
      clearTimeout(ttTimer);
      colTimer = setTimeout(function() {
        island.classList.remove('vdi-expanded');
        var sp = stgInner;
        if (sp) sp.classList.remove('show');
        if ($('vdi-stg-tooltip')) {
          $('vdi-stg-tooltip').classList.remove('show');
          setTimeout(function() {
            if ($('vdi-stg-tooltip')) $('vdi-stg-tooltip').style.display = 'none';
            if ($('vdi-settings-btn')) $('vdi-settings-btn').style.opacity = '';
          }, 300);
        }
        // Hide study hint if it hasn't been dismissed yet — don't persist it across sessions
        var sh = $('vdi-study-hint');
        if (sh && sh.style.display !== 'none' && !localStorage.getItem('vdi_seen_study_hint_v2')) {
          sh.style.display = 'none';
        }
        if (state.lyricsOn) {
          state.lyricsOn = false;
          $('vdi-lyr-btn').classList.remove('active');
          lyrPanel.classList.remove('show');
        }
        if (typeof isTasksPanelOpen !== 'undefined' && isTasksPanelOpen) {
          if (typeof toggleTasksPanel === 'function') toggleTasksPanel(false);
          else if ($('vdi-tasks-panel')) $('vdi-tasks-panel').classList.remove('show');
        }
        // Fallback to music if focus is idle
        if (!focusState || focusState.phase === 'idle') {
           if (state.activePage === 'focus') {
              state.activePage = 'media';
              // Force CSS to update immediately without animation delay
              var pageMedia = $('vdi-page-media');
              var pageFocus = $('vdi-page-focus');
              if (pageMedia && pageFocus) {
                 pageFocus.classList.remove('active');
                 pageMedia.classList.add('active');
                 pageFocus.style.transform = '';
                 pageMedia.style.transform = '';
                 updateUI();
              }
           }
        }
      }, collapseDelay);
      if (!state.isIdle) resetIdle(); // Bug 2 fix: don't un-idle on leave triggered by idle shrink
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
        if (e.target.closest('button, svg, #vdi-prog, #vdi-lyrics-scroll, a, input, label')) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        var r = island.getBoundingClientRect();
        startLeftCenter = r.left + (r.width / 2);
        startTop = r.top;
        island.style.setProperty('transition', 'none', 'important');

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
        island.style.setProperty('left', newLeftCenter + 'px', 'important');
        island.style.setProperty('top', newTop + 'px', 'important');
        island.style.setProperty('transform', 'translateX(-50%)', 'important');
        
        updateLyricsPanelPosition();
        updateSettingsPanelPosition();
      });

      document.addEventListener('mouseup', function(e) {
        if (!isDragging) return;
        isDragging = false;
        island.style.removeProperty('transition');
        if ($('vdi-snap-zones')) $('vdi-snap-zones').classList.remove('active');
        
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({
            'vdi_loc_x': island.style.left,
            'vdi_loc_y': island.style.top,
            'vdi_transform': island.style.transform,
            'activePreset': null
          });
        }
      });
      // -----------------------

      island.addEventListener('mouseenter', handleMouseEnter);
      island.addEventListener('mouseleave', handleMouseLeave);
      lyrPanel.addEventListener('mouseenter', handleMouseEnter);
      lyrPanel.addEventListener('mouseleave', handleMouseLeave);

      document.addEventListener('mousemove', function(e) {
        if (!state.hasMedia && (!focusState || focusState.phase === 'idle')) return;
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
      // Bug 7 fix: wake island when tab becomes visible (teleport/tab switch)
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible' && (state.hasMedia || (focusState && focusState.phase !== 'idle'))) {
          clearTimeout(colTimer);
          resetIdle();
        }
      });
      document.addEventListener('vdi-teleport-arrived', function() {
        if (state.hasMedia || (focusState && focusState.phase !== 'idle')) {
          setTimeout(function() {
            resetIdle();
            island.classList.add('vdi-expanded');
            handleMouseLeave(); // Ensures it auto-collapses if mouse is not over it
          }, 50);
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

      // Pager Switching Logic
      var scrollCooldown = false;
      var expContainer = $('vdi-exp');
      if (expContainer) {
        expContainer.addEventListener('wheel', function(e) {
          e.stopPropagation();
          e.preventDefault();
          if (scrollCooldown) return;
          // Dismiss study hint the moment user scrolls
          var sh = $('vdi-study-hint');
          if (sh && sh.style.display !== 'none') {
            sh.style.display = 'none';
            localStorage.setItem('vdi_seen_study_hint_v2', '1');
          }
          
          var direction = (e.deltaY > 0 || e.deltaX > 0) ? -1 : 1;
          var outgoingId = state.activePage === 'media' ? 'vdi-page-media' : 'vdi-page-focus';
          var incomingId = state.activePage === 'media' ? 'vdi-page-focus' : 'vdi-page-media';
          
          var outgoingEl = $(outgoingId);
          var incomingEl = $(incomingId);
          
          if (outgoingEl && incomingEl) {
             // Prepare incoming element at the correct side without animation
             incomingEl.classList.add('vdi-no-transition');
             incomingEl.style.transform = 'translateX(' + (direction * 100) + '%)';
             
             // Force reflow
             void incomingEl.offsetWidth;
             
             // Enable transitions
             incomingEl.classList.remove('vdi-no-transition');
             outgoingEl.style.transition = '';
             
             // Slide outgoing element out
             outgoingEl.style.transform = 'translateX(' + (-direction * 100) + '%)';
             
             state.activePage = state.activePage === 'media' ? 'focus' : 'media';
             updateUI();
          }
          
          scrollCooldown = true;
          setTimeout(function() {
             scrollCooldown = false;
          }, 500);
        }, { passive: false });
      }

      // Dismiss study hint if island collapses before user sees it
      var studyHint = $('vdi-study-hint');
      var STUDY_HINT_KEY = 'vdi_seen_study_hint_v2';
      if (studyHint) {
        studyHint.addEventListener('click', function(e) { e.stopPropagation(); });
      }

      // Focus Mode Controls
      var toggleStudy = $('vdi-focus-study-toggle');
      var btnPlay = $('vdi-focus-btn-play');
      var btnSkip = $('vdi-focus-btn-skip');
      var btnStop = $('vdi-focus-btn-stop');

      if (toggleStudy) {
        toggleStudy.addEventListener('change', function(e) {
          if (e.target.checked) {
             setTimeout(function() {
                if (chrome && chrome.storage && chrome.storage.local) {
                  chrome.storage.local.get({ glance_focus_strict: true }, function(res) {
                    chrome.runtime.sendMessage({ type: 'VDI_FOCUS_START', workMin: 25, strictMode: res.glance_focus_strict });
                  });
                } else {
                  chrome.runtime.sendMessage({ type: 'VDI_FOCUS_START', workMin: 25, strictMode: true });
                }
                // Ensure the toggle is reset in case we drop back to this view
                e.target.checked = false;
             }, 300);
          }
        });
      }

      if (btnPlay) {
        btnPlay.addEventListener('click', function(e) {
          e.stopPropagation();
          if (focusState && focusState.running) {
            chrome.runtime.sendMessage({ type: 'VDI_FOCUS_PAUSE' });
          } else if (focusState && !focusState.running && focusState.phase !== 'idle' && focusState.phase !== 'waiting') {
            chrome.runtime.sendMessage({ type: 'VDI_FOCUS_RESUME' });
          } else {
            if (chrome && chrome.storage && chrome.storage.local) {
              chrome.storage.local.get({ glance_focus_strict: true }, function(res) {
                chrome.runtime.sendMessage({ type: 'VDI_FOCUS_START', workMin: 25, strictMode: res.glance_focus_strict });
              });
            } else {
              chrome.runtime.sendMessage({ type: 'VDI_FOCUS_START', workMin: 25, strictMode: true });
            }
          }
        });
      }
      if (btnSkip) {
        btnSkip.addEventListener('click', function(e) {
          e.stopPropagation();
          chrome.runtime.sendMessage({ type: 'VDI_FOCUS_SKIP' });
        });
      }
      if (btnStop) {
        btnStop.addEventListener('click', function(e) {
          e.stopPropagation();
          chrome.runtime.sendMessage({ type: 'VDI_FOCUS_STOP' });
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
          if (!stgInner.classList.contains('show')) {
            if (state.lyricsOn) $('vdi-lyr-btn').click();
            if (isTasksPanelOpen) toggleTasksPanel(false);
          }
          stgInner.classList.toggle('show');
          if (stgInner.classList.contains('show')) {
            updateSettingsPanelPosition();
          }
          // Sync UI state
          stg$('vdi-stg-amoled').checked = settings.amoledBlack;
          stg$('vdi-stg-freeplace').checked = settings.freePlacement;
        });

        stgInner.addEventListener('mouseleave', function() {
          handleMouseLeave();
        });
        stgInner.addEventListener('mouseenter', function() {
          handleMouseEnter();
        });


        document.addEventListener('click', function(e) {
          if (!island.contains(e.target) && !(stgPanel.contains(e.target) || (stgShadow && stgShadow.contains && e.composedPath().some(function(el){ return el === stgInner; })))) {
            stgInner.classList.remove('show');
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
              if ($('vdi-settings-btn')) $('vdi-settings-btn').style.opacity = '';
            }, 300);
            
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ 'vdi_cfg_seenTooltip3': true });
            } else {
              localStorage.setItem('vdi_cfg_seenTooltip3', 'true');
            }
          });
        }

        var bindStg = function(id, key) {
          var el = stg$(id);
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

        bindStg('vdi-stg-amoled', 'amoledBlack');
        // Immediately force a theme re-extraction when amoled changes
        stg$('vdi-stg-amoled').addEventListener('change', function() {
          if (state.artwork) {
            VDI.Core.extractVibrant(state.artwork, settings.amoledBlack, applyTheme);
          }
        });
        bindStg('vdi-stg-freeplace', 'freePlacement');

        var focusBtn = stg$('vdi-stg-focus-btn');
        if (focusBtn) {
          focusBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
              chrome.runtime.sendMessage({ type: 'VDI_ACTION', act: 'openOptions' });
            }
          });
        }

        var scBtn = stg$('vdi-stg-shortcuts-btn');
        if (scBtn) {
          scBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
              chrome.runtime.sendMessage({ type: 'VDI_ACTION', act: 'openShortcuts' });
            }
          });
        }

        var updatePos = function(left, top, transform) {
          island.style.setProperty('left', left, 'important');
          island.style.setProperty('top', top, 'important');
          island.style.setProperty('transform', transform, 'important');
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ 'vdi_loc_x': left, 'vdi_loc_y': top, 'vdi_transform': transform });
          }
          updateLyricsPanelPosition();
          updateSettingsPanelPosition();
          updateTooltipPosition();
        };

        if (stg$('vdi-stg-pos-t')) stg$('vdi-stg-pos-t').addEventListener('click', function(e) { e.stopPropagation(); updatePos('50%', '10px', 'translateX(-50%)'); });
        if (stg$('vdi-stg-pos-b')) stg$('vdi-stg-pos-b').addEventListener('click', function(e) { e.stopPropagation(); updatePos('50%', (window.innerHeight - 152 - 10) + 'px', 'translateX(-50%)'); });
        if (stg$('vdi-stg-pos-l')) stg$('vdi-stg-pos-l').addEventListener('click', function(e) { e.stopPropagation(); updatePos('210px', (window.innerHeight / 2 - 76) + 'px', 'translateX(-50%)'); });
        if (stg$('vdi-stg-pos-r')) stg$('vdi-stg-pos-r').addEventListener('click', function(e) { e.stopPropagation(); updatePos((window.innerWidth - 210) + 'px', (window.innerHeight / 2 - 76) + 'px', 'translateX(-50%)'); });
      }

      var lastPlayClick = 0;
      $('vdi-play').addEventListener('click', function(e) {
        e.stopPropagation();
        if (!state.hasMedia || !state.tabId) return;
        
        var now = Date.now();
        if (now - lastPlayClick < 150) return; // Prevent inhuman double-clicks/hardware bounces
        lastPlayClick = now;
        
        state.isPlaying = !state.isPlaying;
        setPlayIcon(state.isPlaying);
        
        state.isPlayToggling = true;
        state.playToggleLockTime = Date.now();

        platform.sendAction(state.tabId, 'toggle');
      });

      var dragProgTarget = 0;
      $('vdi-prog').addEventListener('mousedown', function(e) {
        e.stopPropagation();
        if (!state.duration) return;
        isDraggingProg = true;
        island.classList.add('vdi-is-dragging');
        updateDrag(e);
      });
      
      document.addEventListener('mousemove', function(e) {
        if (!isDraggingProg) return;
        updateDrag(e);
      });
      
      document.addEventListener('mouseup', function(e) {
        if (isDraggingProg) {
          isDraggingProg = false;
          island.classList.remove('vdi-is-dragging');
          performSeek(dragProgTarget);
        }
      });
      
      function updateDrag(e) {
        var r = $('vdi-prog').getBoundingClientRect();
        var pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        dragProgTarget = pct * state.duration;
        var pctStr = (pct * 100) + '%';
        $('vdi-prog-fill').style.width = pctStr;
        if ($('vdi-prog-knob')) $('vdi-prog-knob').style.left = pctStr;
        if ($('vdi-prog')) $('vdi-prog').style.setProperty('--vdi-pct', pctStr);
        $('vdi-pos').textContent = VDI.Core.formatTime(dragProgTarget);
      }

      $('vdi-pip-main-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        // Only attempt local togglePiP if we ARE on the media tab (YouTube video page).
        // On any other tab (Twitter, Reddit, GitHub, etc.), local videos would hijack PiP.
        // Always delegate to background script for cross-tab teleport.
        var isOnMediaTab = false;
        try {
          var h = window.location.hostname;
          isOnMediaTab = (h.includes('youtube.com') && !h.includes('music.youtube.com'));
        } catch(ex) {}

        if (isOnMediaTab && !opts.isVivaldi && typeof VDI !== 'undefined' && VDI.Core && VDI.Core.togglePiP) {
          VDI.Core.togglePiP();
        } else if (platform.requestPiP) {
          platform.requestPiP(state.tabId);
        }
      });

      $('vdi-lyr-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        
        state.lyricsOn = !state.lyricsOn;
        $('vdi-lyr-btn').classList.toggle('active', state.lyricsOn);

        if (state.lyricsOn) {
          if (typeof stgPanel !== 'undefined' && stgPanel && stgInner.classList.contains('show')) {
            stgInner.classList.remove('show');
          }
          if (isTasksPanelOpen) {
            toggleTasksPanel(false);
          }
          
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

        // Focus Mode Tick
        if (focusState && focusState.phase !== 'idle') {
          var remaining = (focusState.running || focusState.phase === 'waiting') ? Math.max(0, focusState.endTime - Date.now()) : (focusState.remainingPauseMs || 0);
          
          var rings = island.querySelectorAll('.vdi-progress-ring');
          var timeEl = island.querySelector('#vdi-focus-time');
          var statusEl = island.querySelector('#vdi-focus-status');
          var titleEl = island.querySelector('#vdi-focus-title');
          var centerIcon = island.querySelector('#vdi-focus-icon');
          if (centerIcon && focusState.lastPhase !== focusState.phase + '_' + focusState.running) {
             centerIcon.innerHTML = getCenterIcon(focusState.phase, focusState.running);

             focusState.lastPhase = focusState.phase + '_' + focusState.running;
          }

          
          var displayText = '';
          var titleText = 'Focus Mode';
          var phaseText = '';
          
          if (focusState.phase === 'shortBreak' || focusState.phase === 'longBreak') {
            titleText = 'Break Time';
          }
          if (!focusState.running && focusState.phase !== 'waiting') phaseText = 'Paused';
          
          if (focusState.phase === 'waiting') {
            var secs = Math.ceil(remaining / 1000);
            var t = secs + 's';
            if (focusState.lastText !== t) {
              if (timeEl) timeEl.textContent = t;
              if (statusEl) statusEl.textContent = 'Continue session?';
              if (titleEl) titleEl.textContent = 'Focus Mode';
              focusState.lastText = t;
            }
            var progress = (remaining / 5000);
            rings.forEach(function(r) { r.style.setProperty('--progress', progress); });
            displayText = 'Continue session? ' + t;
          } else {
            var secs = Math.ceil(remaining / 1000);
            var min = Math.floor(secs / 60);
            var sec = secs % 60;
            var t = min + ':' + ('0' + sec).slice(-2);
            
            var displayPhase = phaseText;
            if (!displayPhase) displayPhase = currentActiveTaskText || 'Stay focused';
            
            if (focusState.lastText !== t || focusState.lastPhaseText !== displayPhase || focusState.lastTitleText !== titleText) {
              if (timeEl) timeEl.textContent = t;
              if (statusEl) statusEl.textContent = displayPhase;
              if (titleEl) titleEl.textContent = titleText;
              focusState.lastText = t;
              focusState.lastPhaseText = displayPhase;
              focusState.lastTitleText = titleText;
            }

            var progress = focusState.totalMs > 0 ? (remaining / focusState.totalMs) : 0;
            rings.forEach(function(r) { r.style.setProperty('--progress', progress); });
            var finalSubtitle = phaseText ? phaseText : titleText;
            displayText = t + ' \u2014 ' + finalSubtitle;

          }

          // If active page is focus, override the pill text dynamically
          if (state.activePage === 'focus') {
             var colInner = island.querySelector('#vdi-col-inner');
             if (colInner && colInner.textContent !== displayText) {
                colInner.textContent = displayText;
             }
          }
        } else {
          // Timer idle, if active page is focus, pill text shows Study Mode
          if (state.activePage === 'focus') {
             var colInner = island.querySelector('#vdi-col-inner');
             if (colInner && colInner.textContent !== 'Study Mode') {
                colInner.textContent = 'Study Mode';
             }
          }
        }

        if (state.lyricsOn && state.isPlaying && !state.isSeeking) {
          syncLyrics();
        }
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
    function setFocusState(newFocus) {
      if (!newFocus) return;
      focusState.phase = newFocus.phase || 'idle';
      focusState.endTime = newFocus.endTime || 0;
      focusState.totalMs = newFocus.totalMs || 0;
      focusState.running = newFocus.running || false;
      focusState.workMin = newFocus.workMin || focusState.workMin;
      focusState.shortBreakMin = newFocus.shortBreakMin || focusState.shortBreakMin;
      focusState.longBreakMin = newFocus.longBreakMin || focusState.longBreakMin;
      focusState.strictMode = newFocus.strictMode !== undefined ? newFocus.strictMode : focusState.strictMode;
      focusState.remainingPauseMs = newFocus.remainingPauseMs || 0;
      
      // Update play button icon in focus page
      var focusPlayIcon = island.querySelector('#vdi-focus-btn-play svg');
      if (focusPlayIcon) {
        focusPlayIcon.outerHTML = '<svg viewBox="0 0 24 24" fill="currentColor">' + VDI.Core.getPlayIcon(focusState.running) + '</svg>';
      }
      
      var colFocus = island.querySelector('#vdi-col-focus');
      if (colFocus) {
         if (focusState.running) colFocus.classList.add('running');
         else colFocus.classList.remove('running');
      }
      
      var stgFocusBtn = stgPanel ? stgPanel.shadowRoot.getElementById('vdi-stg-focus-btn') : null;
      if (stgFocusBtn) {
        if (focusState.phase !== 'idle') {
          stgFocusBtn.style.opacity = '0.4';
          stgFocusBtn.style.pointerEvents = 'none';
          stgFocusBtn.textContent = 'Locked';
        } else {
          stgFocusBtn.style.opacity = '1';
          stgFocusBtn.style.pointerEvents = 'auto';
          stgFocusBtn.textContent = 'Manage';
        }
      }
      
      updateUI();
      checkBlocking();
      
      // Guard: DOM changes above (outerHTML replacement of SVG icons) can trigger
      // synthetic mouseleave events. If the mouse is still physically over the island,
      // cancel any pending collapse and re-expand.
      if (isMouseOverIsland) {
        clearTimeout(colTimer);
        island.classList.add('vdi-expanded');
        if (state.isIdle) {
          state.isIdle = false;
          island.classList.remove('vdi-idle');
        }
        resetIdle();
      }
    }

    function setState(newState) {
      if (!newState) return;

      var prevKey = state.title + '|' + state.artist;

      state.hasMedia = newState.hasMedia;
      if (state.isPlayToggling) {
        var timeSinceClick = Date.now() - (state.playToggleLockTime || 0);
        if (timeSinceClick > 600) {
          state.isPlayToggling = false;
          state.isPlaying = newState.isPlaying;
        } else if (timeSinceClick > 250 && newState.isPlaying === state.isPlaying) {
          state.isPlayToggling = false;
        }
      } else {
        state.isPlaying = newState.isPlaying;
      }
      state.title = newState.title;
      state.artist = newState.artist;
      state.artwork = newState.artwork;
      state.duration = newState.duration;
      state.shuffleOn = newState.shuffleOn || false;
      state.smartShuffleOn = newState.smartShuffleOn || false;
      state.repeatMode = newState.repeatMode || 'off';
      state.platform = newState.platform || 'other';
      
      // Use exact clock interpolation instead of dt accumulation
      if (!state.isSeeking) {
        var now = Date.now();
        var newBase = newState.position;
        var elapsed = (now - state.lastSyncTime) / 1000.0;
        var currentPredicted = (state.basePosition || 0) + elapsed;
        
        // Only violently snap the clock if we drifted by more than 0.4s (or if forced).
        // Otherwise, trust our local 60FPS coasting timer to prevent micro-stutters!
        if (!state.lastSyncTime || state.forceNextSync || Math.abs(currentPredicted - newBase) > 0.4) {
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
    // ─── TASKS PANEL LOGIC ───
    var tasksPanel = document.getElementById('vdi-tasks-panel');
    var tasksList = document.getElementById('vdi-tasks-list');
    var tasksInput = document.getElementById('vdi-task-input');
    var tasksAddBtn = document.getElementById('vdi-add-task-btn');
    var closeTasksBtn = document.getElementById('vdi-close-tasks');

    toggleTasksPanel = function(forceState) {
      if (typeof forceState !== 'undefined') isTasksPanelOpen = forceState;
      else isTasksPanelOpen = !isTasksPanelOpen;
      
      var tp = document.getElementById('vdi-tasks-panel');
      
      if (isTasksPanelOpen) {
        if (state.lyricsOn) $('vdi-lyr-btn').click();
        if (stgInner && stgInner.classList.contains('show')) $('vdi-settings-btn').click();
        
        loadIslandTasks();
        if (tp) {
          tp.classList.add('show');
          // Delegate positioning to updateLyricsPanelPosition which handles
          // vertical flip, maxHeight clamping, and scroll-independent placement
          requestAnimationFrame(updateLyricsPanelPosition);
        }
        state.activePage = 'focus';
        updateUI();
      } else {
        if (tp) tp.classList.remove('show');
        if (!focusState.running) {
          state.activePage = 'media';
          updateUI();
        }
      }
    };

    function renderIslandTasks(tasks) {
      if (!tasksList) return;
      tasksList.innerHTML = '';
      
      // Update active task text for the focus timer
      var activeTask = tasks.find(function(t) { return t.active && !t.completed; });
      if (!activeTask) {
        var uncompleted = tasks.filter(function(t) { return !t.completed; });
        var w = {high:3, medium:2, low:1};
        uncompleted.sort(function(a,b) { return w[b.priority] - w[a.priority]; });
        if (uncompleted.length > 0) activeTask = uncompleted[0];
      }
      currentActiveTaskText = activeTask ? activeTask.text : '';

      if (tasks.length === 0) {
        tasksList.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-size:12px;text-align:center;padding:20px 0;">No active tasks.</div>';
        return;
      }
      const sorted = [...tasks].sort((a,b) => {
        if(a.completed !== b.completed) return a.completed ? 1 : -1;
        const w = {high:3, medium:2, low:1};
        return w[b.priority] - w[a.priority];
      });
      sorted.forEach(t => {
        var el = document.createElement('div');
        el.className = 'vdi-task-item' + (t.completed ? ' completed' : '');
        if (t === activeTask) el.style.border = '1px solid var(--vdi-accent)';
        
        var prioStyle = '';
        if(t.priority==='high') prioStyle='color:#ef4444;background:rgba(239,68,68,0.15);';
        else if(t.priority==='medium') prioStyle='color:#f59e0b;background:rgba(245,158,11,0.15);';
        else prioStyle='color:#10b981;background:rgba(16,185,129,0.15);';
        
        el.innerHTML = `
          <input type="checkbox" class="vdi-task-checkbox" ${t.completed ? 'checked' : ''} data-id="${t.id}">
          <div class="vdi-task-text">${t.text}</div>
          <div class="vdi-task-prio" style="${prioStyle}">${t.priority}</div>
          <button class="vdi-task-del" data-id="${t.id}"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        `;
        
        el.querySelector('.vdi-task-checkbox').addEventListener('change', function(e) {
          if (!chrome || !chrome.storage || !chrome.storage.local) return;
          chrome.storage.local.get(['vdiTasks'], function(res) {
            var curr = res.vdiTasks || [];
            var target = curr.find(x => x.id === t.id);
            if(target) { target.completed = e.target.checked; chrome.storage.local.set({vdiTasks: curr}, () => loadIslandTasks()); }
          });
        });
        el.querySelector('.vdi-task-del').addEventListener('click', function() {
          if (!chrome || !chrome.storage || !chrome.storage.local) return;
          chrome.storage.local.get(['vdiTasks'], function(res) {
            var curr = res.vdiTasks || [];
            curr = curr.filter(x => x.id !== t.id);
            chrome.storage.local.set({vdiTasks: curr}, () => loadIslandTasks());
          });
        });
        
        el.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          if (!chrome || !chrome.storage || !chrome.storage.local) return;
          chrome.storage.local.get(['vdiTasks'], function(res) {
            var curr = res.vdiTasks || [];
            var target = curr.find(x => x.id === t.id);
            if(target) { 
              const cycle = { low: 'medium', medium: 'high', high: 'low' };
              target.priority = cycle[target.priority] || 'medium';
              chrome.storage.local.set({vdiTasks: curr}, () => loadIslandTasks()); 
            }
          });
        });

        // Middle-click to Set Active
        el.addEventListener('auxclick', function(e) {
          if (e.button !== 1) return; // Only middle click
          e.preventDefault();
          if (!chrome || !chrome.storage || !chrome.storage.local) return;
          chrome.storage.local.get(['vdiTasks'], function(res) {
            var curr = res.vdiTasks || [];
            curr.forEach(x => x.active = false);
            var target = curr.find(x => x.id === t.id);
            if(target) target.active = true;
            chrome.storage.local.set({vdiTasks: curr}, () => loadIslandTasks());
          });
        });

        
        
        tasksList.appendChild(el);
      });
    }

    function loadIslandTasks() {
      if (!chrome || !chrome.storage || !chrome.storage.local) return;
      chrome.storage.local.get(['vdiTasks'], function(res) {
        renderIslandTasks(res.vdiTasks || []);
      });
    }

    var tasksBtns = document.querySelectorAll('.vdi-tasks-btn-el');
    if (tasksBtns.length > 0) {
      tasksBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleTasksPanel();
        });
      });
    }
    
    if (closeTasksBtn && tasksPanel) {
      closeTasksBtn.addEventListener('click', () => { toggleTasksPanel(false); });
    }
    
    if (tasksPanel) {
      tasksPanel.addEventListener('mouseenter', function() {
        clearTimeout(colTimer);
        resetIdle();
        island.classList.add('vdi-expanded');
      });
      tasksPanel.addEventListener('mouseleave', function() {
        handleMouseLeave();
      });
    }
    
    function addNewTask() {
      if(!tasksInput) return;
      var txt = tasksInput.value.trim();
      if(!txt) return;
      var n = { id: 'task_'+Date.now(), text: txt, completed: false, priority: 'medium' };
      if (!chrome || !chrome.storage || !chrome.storage.local) return;
      chrome.storage.local.get(['vdiTasks'], function(res) {
        var curr = res.vdiTasks || [];
        curr.push(n);
        chrome.storage.local.set({vdiTasks: curr}, () => {
          if(tasksInput) tasksInput.value = '';
          loadIslandTasks();
        });
      });
    }
    if (tasksAddBtn) tasksAddBtn.addEventListener('click', addNewTask);
    if (tasksInput) tasksInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') addNewTask(); });

    var stgTasksBtn = stgPanel ? stgPanel.shadowRoot.getElementById('vdi-stg-tasks-btn') : null;
    if (stgTasksBtn) {
      stgTasksBtn.addEventListener('click', function() {
        if (stgPanel) stgPanel.classList.remove('show');
        isSettingsOpen = false;
        isTasksPanelOpen = true;
        loadIslandTasks();
        if (tasksPanel) {
          tasksPanel.classList.add('show');
          var r = island.getBoundingClientRect();
          tasksPanel.style.top = (r.bottom + 12) + 'px';
        }
      });
    }

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

        island.style.setProperty('left', x, 'important');
        island.style.setProperty('top', y, 'important');
        island.style.setProperty('transform', tf || 'none', 'important');
        
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
        
        island.style.setProperty('left', newLeftCenter + 'px', 'important');
        island.style.setProperty('top', newTop + 'px', 'important');
        
        updateLyricsPanelPosition();
        updateSettingsPanelPosition();
      });
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['vdi_loc_x', 'vdi_loc_y', 'vdi_transform', 'hideYouTube', 'hideYouTubeMusic', 'hideSpotify', 'hideAppleMusic', 'enableLyrics', 'lyricsOffset', 'freePlacement', 'amoledBlack', 'vdi_cfg_seenTooltip3', 'vdi_active_page'], function(res) {
          applyPos(res.vdi_loc_x, res.vdi_loc_y, res.vdi_transform);
          if (res.vdi_active_page) {
            state.activePage = res.vdi_active_page;
          }
          if (res.hideYouTube !== undefined) settings.hideYouTube = res.hideYouTube;
          if (res.hideYouTubeMusic !== undefined) settings.hideYouTubeMusic = res.hideYouTubeMusic;
          
          if (res.amoledBlack !== undefined && res.amoledBlack !== settings.amoledBlack) {
            settings.amoledBlack = res.amoledBlack;
            if (state && state.artwork) {
              VDI.Core.extractVibrant(state.artwork, settings.amoledBlack, applyTheme);
            }
          }

          if (res.hideSpotify !== undefined) settings.hideSpotify = res.hideSpotify;
          if (res.hideAppleMusic !== undefined) settings.hideAppleMusic = res.hideAppleMusic;
          if (res.enableLyrics !== undefined) settings.enableLyrics = res.enableLyrics;
          if (res.lyricsOffset !== undefined) settings.lyricsOffset = res.lyricsOffset;
          if (res.freePlacement !== undefined) settings.freePlacement = res.freePlacement;
          if (res.vdi_cfg_seenTooltip3 !== undefined) settings.seenTooltip = res.vdi_cfg_seenTooltip3;

          stg$('vdi-stg-amoled').checked = settings.amoledBlack;
          stg$('vdi-stg-freeplace').checked = settings.freePlacement;

          // Start loop after settings load to prevent visual glitches
          bindEvents();
          loadIslandTasks();
          startTick();
          setupFullscreen();
          resetIdle();
        });

        chrome.storage.onChanged.addListener(function(changes, namespace) {
          if (namespace === 'local') {
            if (changes.vdiTasks) {
              loadIslandTasks();
            }
            if (changes.vdi_active_page) {
              state.activePage = changes.vdi_active_page.newValue;
              lastSavedActivePage = state.activePage;
              updateUI();
            }
            if (changes.hideYouTube) settings.hideYouTube = changes.hideYouTube.newValue;
            if (changes.hideYouTubeMusic) settings.hideYouTubeMusic = changes.hideYouTubeMusic.newValue;
            if (changes.amoledBlack) {
              settings.amoledBlack = changes.amoledBlack.newValue;
              if (state.artwork) {
                VDI.Core.extractVibrant(state.artwork, settings.amoledBlack, applyTheme);
              }
            }
            if (changes.hideSpotify) settings.hideSpotify = changes.hideSpotify.newValue;
            if (changes.hideAppleMusic) settings.hideAppleMusic = changes.hideAppleMusic.newValue;
            if (changes.enableLyrics) settings.enableLyrics = changes.enableLyrics.newValue;
            if (changes.lyricsOffset) {
              settings.lyricsOffset = changes.lyricsOffset.newValue;
            }
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
        var getFloat = function(key, defaultVal) {
          var val = localStorage.getItem('vdi_cfg_' + key);
          return val !== null ? parseFloat(val) : defaultVal;
        };
        settings.hideYouTube = getBool('hideYouTube', settings.hideYouTube);
        settings.hideYouTubeMusic = getBool('hideYouTubeMusic', settings.hideYouTubeMusic);
        settings.amoledBlack = getBool('amoledBlack', settings.amoledBlack);
        settings.hideSpotify = getBool('hideSpotify', settings.hideSpotify);
        settings.enableLyrics = getBool('enableLyrics', settings.enableLyrics);
        settings.lyricsOffset = getFloat('lyricsOffset', settings.lyricsOffset);
        settings.freePlacement = getBool('freePlacement', settings.freePlacement);
        settings.seenTooltip = getBool('seenTooltip3', settings.seenTooltip);
        
        bindEvents();
        startTick();
        setupFullscreen();
        resetIdle();
      }
    }

    
    
    var swallowOverlay = null;
    function triggerSwallowOverlay() {
      if (swallowOverlay) return;
      document.body.style.overflow = 'hidden';
      
      swallowOverlay = document.createElement('div');
      swallowOverlay.id = 'vdi-swallow-backdrop';
      swallowOverlay.style.position = 'fixed';
      swallowOverlay.style.top = '0';
      swallowOverlay.style.left = '0';
      swallowOverlay.style.width = '100vw';
      swallowOverlay.style.height = '100vh';
      swallowOverlay.style.background = 'radial-gradient(circle at center, var(--vdi-glow, rgba(99,102,241,0.2)) 0%, rgba(0,0,0,0.95) 100%)';
      swallowOverlay.style.zIndex = '2147483645'; // Just underneath the actual island (which is 2147483647)
      swallowOverlay.style.opacity = '0';
      swallowOverlay.style.transition = 'opacity 0.8s ease';
      
      // Close Tab Button (placed at the bottom)
      var closeBtn = document.createElement('button');
      closeBtn.style.position = 'absolute';
      closeBtn.style.bottom = '80px';
      closeBtn.style.left = '50%';
      closeBtn.style.transform = 'translateX(-50%)';
      closeBtn.style.padding = '12px 28px';
      closeBtn.style.background = 'rgba(255,255,255,0.1)';
      closeBtn.style.border = '1px solid rgba(255,255,255,0.2)';
      closeBtn.style.borderRadius = '99px';
      closeBtn.style.color = '#fff';
      closeBtn.style.fontSize = '14px';
      closeBtn.style.fontWeight = '600';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.backdropFilter = 'blur(10px)';
      closeBtn.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      closeBtn.textContent = 'Close this Tab';
      closeBtn.onclick = function() {
        chrome.runtime.sendMessage({ type: 'VDI_CLOSE_TAB' });
      };
      swallowOverlay.appendChild(closeBtn);

      if (!focusState.strictMode) {
        var bypassBtn = document.createElement('button');
        bypassBtn.style.position = 'absolute';
        bypassBtn.style.top = '32px';
        bypassBtn.style.right = '40px';
        bypassBtn.style.background = 'transparent';
        bypassBtn.style.border = 'none';
        bypassBtn.style.color = 'rgba(255,255,255,0.3)';
        bypassBtn.style.fontSize = '14px';
        bypassBtn.style.fontWeight = '500';
        bypassBtn.style.cursor = 'pointer';
        bypassBtn.style.textDecoration = 'underline';
        bypassBtn.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        bypassBtn.style.transition = 'color 0.2s ease';
        bypassBtn.onmouseover = function() { this.style.color = 'rgba(255,255,255,0.8)'; };
        bypassBtn.onmouseout = function() { this.style.color = 'rgba(255,255,255,0.3)'; };
        bypassBtn.textContent = 'I need this for work (Bypass)';
        bypassBtn.onclick = function() {
          chrome.runtime.sendMessage({ type: 'VDI_FOCUS_BYPASS', site: window.location.hostname }, function() {
            window.location.reload();
          });
        };
        swallowOverlay.appendChild(bypassBtn);
      }

      document.body.appendChild(swallowOverlay);
      
      // Transform the ACTUAL island
      if (island) {
        island.classList.add('vdi-swallowed');
      }

      // Force reflow
      void swallowOverlay.offsetWidth;
      swallowOverlay.style.opacity = '1';
    }

    function removeSwallowOverlay() {
      if (swallowOverlay) {
        swallowOverlay.style.opacity = '0';
        setTimeout(function() {
          if (swallowOverlay && swallowOverlay.parentNode) {
            swallowOverlay.parentNode.removeChild(swallowOverlay);
          }
          swallowOverlay = null;
          document.body.style.overflow = '';
        }, 800);
      }
      if (island) {
        island.classList.remove('vdi-swallowed');
      }
    }

    function checkBlocking() {
      if (focusState.phase === 'idle' || (!focusState.running && focusState.phase !== 'waiting')) {
        removeSwallowOverlay();
        return;
      }
      if (typeof chrome === 'undefined' || !chrome.storage) return;
      chrome.storage.local.get(['glance_focus_blocklist'], function(res) {
        var list = res.glance_focus_blocklist || [];
        var h = window.location.hostname;
        var isBlocked = list.some(function(s) { return h === s || h.endsWith('.' + s); });
        
        if (isBlocked) {
          chrome.runtime.sendMessage({ type: 'VDI_FOCUS_REQUEST' }, function(focus) {
            if (focus && focus.bypassedSites && focus.bypassedSites.indexOf(h) !== -1) {
              removeSwallowOverlay();
            } else {
              triggerSwallowOverlay();
            }
          });
        } else {
          removeSwallowOverlay();
        }
      });
    }

    return {
      init: init,
      setState: setState,
      setFocusState: setFocusState,
      getState: getState,
      updateUI: updateUI,
      refreshProgress: refreshProgress
    };
  }

  return {
    createIsland: createIsland,
    createSettingsPanel: createSettingsPanel,
    createSettingsTooltip: createSettingsTooltip,
    createLyricsPanel: createLyricsPanel,    createTasksPanel: createTasksPanel,
    createController: createController
  };
})();



(function() {
  'use strict';

  function initApp() {
    if (document.getElementById('vdi')) return;
    if (!document.body) {
      setTimeout(initApp, 100);
      return;
    }

    // Inject CSS
    var css = document.createElement('style');
    css.id = 'vdi-css';
    css.textContent = VDI.Styles.generate({ islandTop: 10 });
    document.head.appendChild(css);

    // Create UI
    var island = VDI.UI.createIsland();
    var lyrPanel = VDI.UI.createLyricsPanel();
    var tskPanel = VDI.UI.createTasksPanel();
    var stgPanel = VDI.UI.createSettingsPanel();
    var stgTooltip = VDI.UI.createSettingsTooltip();
    document.body.appendChild(island);
    document.body.appendChild(lyrPanel);
    document.body.appendChild(tskPanel);
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
    idleDelay: 4000,
    collapseDelay: 500
  });

  ctrl.init();

  // Listen for state updates from background
  VDI.Platform.ChromeExt.onStateUpdate(function(newState) {
    ctrl.setState(newState);
  });

  if (VDI.Platform.ChromeExt.onFocusUpdate) {
    VDI.Platform.ChromeExt.onFocusUpdate(function(newFocus) {
      ctrl.setFocusState(newFocus);
    });
  }

  // Request initial state
  VDI.Platform.ChromeExt.requestState(function(state) {
    if (state) {
      ctrl.setState(state);
    }
  });

  if (VDI.Platform.ChromeExt.requestFocusState) {
    VDI.Platform.ChromeExt.requestFocusState(function(focus) {
      if (focus) {
        ctrl.setFocusState(focus);
      }
    });
  }

  }

  initApp();
})();
