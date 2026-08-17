
    // --- TASTER INTERACTION (Mimics color extraction) ---
    const tasterCards = document.querySelectorAll('.taster-card');
    const root = document.documentElement;
    const container = document.querySelector('.container');

    tasterCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        const accent = card.getAttribute('data-color');
        const bg = card.getAttribute('data-bg');
        root.style.setProperty('--vdi-accent', accent);
        root.style.setProperty('--vdi-grad', `linear-gradient(135deg, ${accent}, ${bg})`);
        root.style.setProperty('--vdi-glow', accent + '40');
        root.style.setProperty('--vdi-dark', bg);
        container.style.borderColor = accent + '60';
      });
    });

    // --- CLOSE TAB LOGIC ---
    document.getElementById('close-btn').addEventListener('click', function() {
      window.close();
      setTimeout(function() {
        if (!window.closed) {
          if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.getCurrent) {
            chrome.tabs.getCurrent(function(tab) {
              if (tab && tab.id) chrome.tabs.remove(tab.id);
            });
          }
        }
      }, 100);
    });
  