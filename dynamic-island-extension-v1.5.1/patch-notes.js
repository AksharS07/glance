document.addEventListener('DOMContentLoaded', function() {
  var closeBtn = document.getElementById('close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.getCurrent) {
        chrome.tabs.getCurrent(function(tab) {
          if (tab && tab.id) chrome.tabs.remove(tab.id);
          else window.close();
        });
      } else {
        window.close();
      }
    });
  }
});
