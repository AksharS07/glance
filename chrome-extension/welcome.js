document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('close-btn');
  if (btn) {
    btn.addEventListener('click', function() {
      window.close();
      try {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.getCurrent) {
          chrome.tabs.getCurrent(function(tab) {
            if (tab && tab.id) chrome.tabs.remove(tab.id);
          });
        }
      } catch(e) {}
    });
  }
});
