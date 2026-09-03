function openOrUpdateTab(url) {
  var domain = new URL(url).hostname;
  chrome.tabs.query({url: '*://' + domain + '/*'}, function(tabs) {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, {url: url, active: true});
    } else {
      chrome.tabs.create({url: url});
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const tglYouTube = document.getElementById('hideYouTube');
  const tglYouTubeMusic = document.getElementById('hideYouTubeMusic');
  const tglSpotify = document.getElementById('hideSpotify');
  const tglAppleMusic = document.getElementById('hideAppleMusic');
  const tglLyrics = document.getElementById('enableLyrics');
  const tglAmoled = document.getElementById('amoledBlack');
  const offsetVal = document.getElementById('vdi-popup-offset-val');
  const offsetDec = document.getElementById('vdi-popup-offset-dec');
  const offsetInc = document.getElementById('vdi-popup-offset-inc');
  const tglShortcuts = document.getElementById('enableShortcuts');
  const tglFree = document.getElementById('freePlacement');
  const tglPreset = document.getElementById('presetPlacement');

  // Onboarding Banner Logic
  const onboardingBanner = document.getElementById('popup-onboarding');
  const dismissBtn = document.getElementById('dismiss-popup-onboarding');
  if (!localStorage.getItem('vdi_seen_popup_onboarding')) {
    onboardingBanner.style.display = 'block';
  }
  dismissBtn?.addEventListener('click', function() {
    localStorage.setItem('vdi_seen_popup_onboarding', 'true');
    onboardingBanner.style.display = 'none';
  });

  // Load current settings
  chrome.storage.local.get({
    hideYouTube: true,
    hideYouTubeMusic: false,
    hideSpotify: false,
    hideAppleMusic: false,
    enableLyrics: true,
    amoledBlack: false,
    lyricsOffset: 0.0,
    enableShortcuts: true,
    freePlacement: true,
    presetPlacement: false,
    activePreset: null
  }, function(res) {
    tglYouTube.checked = res.hideYouTube;
    tglYouTubeMusic.checked = res.hideYouTubeMusic;
    tglSpotify.checked = res.hideSpotify;
    tglAppleMusic.checked = res.hideAppleMusic;
    tglLyrics.checked = res.enableLyrics;
    if (tglAmoled) tglAmoled.checked = res.amoledBlack;
    if (offsetVal) offsetVal.textContent = (res.lyricsOffset > 0 ? '+' : '') + parseFloat(res.lyricsOffset || 0).toFixed(1) + 's';
    window._vdiOffset = parseFloat(res.lyricsOffset || 0);
    if (tglShortcuts) tglShortcuts.checked = res.enableShortcuts !== false;
    tglFree.checked = res.freePlacement;
    if (tglPreset) tglPreset.checked = res.presetPlacement;
    
    updatePresetUI(res.presetPlacement, res.activePreset);
  });

  // Save settings on toggle
  function saveSettings() {
    chrome.storage.local.set({
      hideYouTube: tglYouTube.checked,
      hideYouTubeMusic: tglYouTubeMusic.checked,
      hideSpotify: tglSpotify.checked,
      hideAppleMusic: tglAppleMusic.checked,
      enableLyrics: tglLyrics.checked,
      amoledBlack: tglAmoled ? tglAmoled.checked : false,
      lyricsOffset: window._vdiOffset || 0.0,
      enableShortcuts: tglShortcuts ? tglShortcuts.checked : true,
      freePlacement: tglFree.checked,
      presetPlacement: tglPreset ? tglPreset.checked : !tglFree.checked
    });
  }

  tglYouTube?.addEventListener('change', saveSettings);
  tglYouTubeMusic?.addEventListener('change', saveSettings);
  tglSpotify?.addEventListener('change', saveSettings);
  tglAppleMusic?.addEventListener('change', saveSettings);
  tglLyrics?.addEventListener('change', saveSettings);
  if (tglAmoled) tglAmoled.addEventListener('change', saveSettings);

  if (offsetDec) offsetDec.addEventListener('click', function() {
    window._vdiOffset = parseFloat((window._vdiOffset - 0.5).toFixed(1));
    offsetVal.textContent = (window._vdiOffset > 0 ? '+' : '') + window._vdiOffset.toFixed(1) + 's';
    saveSettings();
  });
  if (offsetInc) offsetInc.addEventListener('click', function() {
    window._vdiOffset = parseFloat((window._vdiOffset + 0.5).toFixed(1));
    offsetVal.textContent = (window._vdiOffset > 0 ? '+' : '') + window._vdiOffset.toFixed(1) + 's';
    saveSettings();
  });
  if (tglShortcuts) tglShortcuts.addEventListener('change', saveSettings);

  
  tglFree?.addEventListener('change', function() {
    if (tglPreset) {
      if (tglFree.checked) tglPreset.checked = false;
      else tglPreset.checked = true;
    }
    saveSettings();
    updatePresetUI(!tglFree.checked);
  });


  
  if (tglPreset) {
    tglPreset?.addEventListener('change', function() {
      if (tglPreset.checked) tglFree.checked = false;
      else tglFree.checked = true;
      saveSettings();
      updatePresetUI(tglPreset.checked);
    });
  }


  function updatePresetUI(isPresetMode, activeId) {
    Object.keys(presets).forEach(id => {
      const btn = document.getElementById(id);
      btn.disabled = !isPresetMode;
      if (activeId) {
        if (id === activeId) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });
  }

  // Position Presets
  const presets = {
    'preset-top': { x: 'CENTER', y: 'TOP', transform: 'translateX(-50%)' },
    'preset-bottom': { x: 'CENTER', y: 'BOTTOM', transform: 'translateX(-50%)' },
    'preset-left': { x: 'LEFT', y: 'TOP', transform: 'translateX(-50%)' },
    'preset-right': { x: 'RIGHT', y: 'TOP', transform: 'translateX(-50%)' }
  };

  Object.keys(presets).forEach(id => {
    document.getElementById(id)?.addEventListener('click', function() {
      if (tglFree.checked) return;
      
      const p = presets[id];
      chrome.storage.local.set({
        vdi_loc_x: p.x,
        vdi_loc_y: p.y,
        vdi_transform: p.transform,
        activePreset: id
      });

      // Update UI instantly
      updatePresetUI(true, id);
    });
  });

  // Fetch now playing state
  chrome.runtime.sendMessage({ type: 'VDI_GET_NOW_PLAYING' }, function(state) {
    const quickLaunch = document.getElementById('quick-launch');
    const npArtist = document.getElementById('np-artist');

    if (state && state.hasMedia) {
      document.getElementById('np-title').textContent = state.title || 'Unknown Title';
      npArtist.textContent = state.artist || 'Unknown Artist';
      npArtist.style.display = 'block';
      if(quickLaunch) quickLaunch.style.display = 'none';
      
      const art = document.getElementById('np-art');
      if (state.artwork) {
        art.src = state.artwork;
        
        // Bug 6 fix: read cached accent from storage (service worker can't extract via DOM in Edge/Chrome MV3)
        chrome.storage.local.get({ vdi_accent_color: null }, function(stg) {
          if (stg.vdi_accent_color) {
            document.documentElement.style.setProperty('--accent-color', stg.vdi_accent_color);
          }
        });
      } else {
        art.src = '';
        document.documentElement.style.removeProperty('--accent-color');
      }
      
      const btn = document.getElementById('np-playpause');
      btn.disabled = false;
      btn.textContent = state.isPlaying ? '⏸' : '▶';
    } else {
      document.getElementById('np-title').textContent = 'No media playing';
      npArtist.style.display = 'none';
      if(quickLaunch) quickLaunch.style.display = 'flex';
    }
  });

  document.getElementById('np-playpause')?.addEventListener('click', function() {
    chrome.runtime.sendMessage({ type: 'VDI_ACTION', act: 'toggle' });
    this.textContent = this.textContent === '⏸' ? '▶' : '⏸';
  });

  // Playlists logic
  chrome.storage.local.get({ playlistShortcuts: [] }, function(res) {
    const lists = res.playlistShortcuts;
    for (let i=0; i<3; i++) {
      if (lists[i]) {
        document.getElementById(`pl-name-${i}`).value = lists[i].name || '';
        document.getElementById(`pl-url-${i}`).value = lists[i].url || '';
      }
      document.getElementById(`pl-go-${i}`)?.addEventListener('click', function() {
        const url = document.getElementById(`pl-url-${i}`).value;
        if (url) chrome.tabs.create({url: url});
      });
    }
  });

  document.getElementById('save-playlists')?.addEventListener('click', function() {
    const lists = [];
    for (let i=0; i<3; i++) {
      lists.push({
        name: document.getElementById(`pl-name-${i}`).value,
        url: document.getElementById(`pl-url-${i}`).value
      });
    }
    chrome.storage.local.set({ playlistShortcuts: lists }, function() {
      const btn = document.getElementById('save-playlists');
      const oldTxt = btn.textContent;
      btn.textContent = 'Saved!';
      setTimeout(() => btn.textContent = oldTxt, 1500);
    });
  });

  // Quick Launch clicks
  document.getElementById('ql-yt')?.addEventListener('click', () => openOrUpdateTab('https://www.youtube.com'));
  document.getElementById('ql-ytm')?.addEventListener('click', () => openOrUpdateTab('https://music.youtube.com'));
  document.getElementById('ql-spot')?.addEventListener('click', () => openOrUpdateTab('https://open.spotify.com'));
  document.getElementById('ql-am')?.addEventListener('click', () => openOrUpdateTab('https://music.apple.com'));

  // Shortcut Link
  document.getElementById('shortcut-link')?.addEventListener('click', function(e) {
    e.preventDefault();
    var isFirefox = navigator.userAgent.includes('Firefox') || navigator.userAgent.includes('Zen');
    var targetUrl = isFirefox ? 'about:addons' : 'chrome://extensions/shortcuts';
    
    var showError = function() {
      var link = document.getElementById('shortcut-link');
      if (link) {
        link.textContent = isFirefox ? 'Go to about:addons to set shortcuts' : 'Could not open shortcuts page';
        link.style.color = '#ff6b6b';
        link.style.cursor = 'default';
        link.style.textDecoration = 'none';
      }
    };

    if (isFirefox) {
      showError();
      return;
    }

    try {
      chrome.tabs.create({url: targetUrl}, function() {
        if (chrome.runtime.lastError) {
          showError();
        }
      });
    } catch(err) {
      showError();
    }
  });

  // Popup Shortcuts Edit Button
  document.getElementById('vdi-popup-shortcuts-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'VDI_ACTION', act: 'openShortcuts' });
    }
  });

  document.getElementById('vdi-focus-blocklist-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    }
  });

  // Ko-fi Support Link
  document.getElementById('kofi-btn')?.addEventListener('click', function() {
    chrome.tabs.create({ url: 'https://ko-fi.com/aksharsrijan' });
  });
});
