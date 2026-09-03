(function() {
  var urlParams = new URLSearchParams(window.location.search);
  var site = urlParams.get('site');
  
  if (site) {
    document.getElementById('site-display').textContent = site;
  }

  // Load accent color from storage for styling
  chrome.storage.local.get('vdi_accent_color', function(res) {
    if (res.vdi_accent_color) {
      document.getElementById('accent-icon').style.color = res.vdi_accent_color;
    }
  });

  chrome.runtime.sendMessage({ type: 'VDI_FOCUS_REQUEST' }, function(focus) {
    if (focus) {
      var limits = focus.bypassLimits || {};
      var used = limits[site] || 0;
      var max = focus.strictMode ? 2 : 9999;
      
      if (used < max) {
        document.getElementById('btn-bypass').style.display = 'block';
        if (focus.strictMode) {
          document.getElementById('btn-bypass').textContent = 'Bypass for 5 mins (' + (max - used) + ' left)';
        } else {
          document.getElementById('btn-bypass').textContent = 'Bypass for 5 mins';
        }
      } else {
        document.getElementById('btn-bypass').style.display = 'none';
        
        var msg = document.createElement('div');
        msg.style.color = '#ff4500';
        msg.style.marginTop = '20px';
        msg.style.fontSize = '14px';
        msg.style.fontWeight = '500';
        msg.textContent = 'Bypass limit reached for this session.';
        document.querySelector('.blocked-card').appendChild(msg);
      }
    }
  });

  document.getElementById('btn-close').addEventListener('click', function() {
    if (chrome && chrome.tabs && chrome.tabs.getCurrent) {
      chrome.tabs.getCurrent(function(tab) {
        if (tab) chrome.tabs.remove(tab.id);
        else window.close();
      });
    } else {
      window.close();
    }
  });

  document.getElementById('btn-bypass').addEventListener('click', function() {
    if (site) {
      chrome.runtime.sendMessage({ type: 'VDI_FOCUS_BYPASS', site: site }, function() {
        window.location.href = 'https://' + site;
      });
    }
  });
})();
