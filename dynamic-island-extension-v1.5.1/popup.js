document.addEventListener('DOMContentLoaded', function() {
  const tglYouTube = document.getElementById('hideYouTube');
  const tglYouTubeMusic = document.getElementById('hideYouTubeMusic');
  const tglSpotify = document.getElementById('hideSpotify');
  const tglAppleMusic = document.getElementById('hideAppleMusic');
  const tglLyrics = document.getElementById('enableLyrics');
  const tglFree = document.getElementById('freePlacement');
  const tglPreset = document.getElementById('presetPlacement');

  // Onboarding Banner Logic
  const onboardingBanner = document.getElementById('popup-onboarding');
  const dismissBtn = document.getElementById('dismiss-popup-onboarding');
  if (!localStorage.getItem('vdi_seen_popup_onboarding')) {
    onboardingBanner.style.display = 'block';
  }
  dismissBtn.addEventListener('click', function() {
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
    freePlacement: true,
    presetPlacement: false,
    activePreset: null
  }, function(res) {
    tglYouTube.checked = res.hideYouTube;
    tglYouTubeMusic.checked = res.hideYouTubeMusic;
    tglSpotify.checked = res.hideSpotify;
    tglAppleMusic.checked = res.hideAppleMusic;
    tglLyrics.checked = res.enableLyrics;
    tglFree.checked = res.freePlacement;
    tglPreset.checked = res.presetPlacement;
    
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
      freePlacement: tglFree.checked,
      presetPlacement: tglPreset.checked
    });
  }

  tglYouTube.addEventListener('change', saveSettings);
  tglYouTubeMusic.addEventListener('change', saveSettings);
  tglSpotify.addEventListener('change', saveSettings);
  tglAppleMusic.addEventListener('change', saveSettings);
  tglLyrics.addEventListener('change', saveSettings);

  tglFree.addEventListener('change', function() {
    if (tglFree.checked) tglPreset.checked = false;
    else tglPreset.checked = true;
    saveSettings();
    updatePresetUI(tglPreset.checked);
  });

  tglPreset.addEventListener('change', function() {
    if (tglPreset.checked) tglFree.checked = false;
    else tglFree.checked = true;
    saveSettings();
    updatePresetUI(tglPreset.checked);
  });

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
    document.getElementById(id).addEventListener('click', function() {
      if (!tglPreset.checked) return;
      
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
});
