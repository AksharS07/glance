
  // Fetch now playing state
  chrome.runtime.sendMessage({ type: 'VDI_GET_NOW_PLAYING' }, function(state) {
    if (state && state.hasMedia) {
      document.getElementById('np-title').textContent = state.title || 'Unknown Title';
      document.getElementById('np-artist').textContent = state.artist || 'Unknown Artist';
      
      const art = document.getElementById('np-art');
      if (state.artwork) {
        art.src = state.artwork;
      } else {
        art.src = '';
      }
      
      const btn = document.getElementById('np-playpause');
      btn.disabled = false;
      btn.textContent = state.isPlaying ? '⏸' : '▶';
    }
  });

  document.getElementById('np-playpause').addEventListener('click', function() {
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
      document.getElementById(`pl-go-${i}`).addEventListener('click', function() {
        const url = document.getElementById(`pl-url-${i}`).value;
        if (url) chrome.tabs.create({ url: url });
      });
    }
  });

  document.getElementById('save-playlists').addEventListener('click', function() {
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
