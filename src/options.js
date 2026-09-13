(function() {
  // ─── ICONS (meticulously sourced & verified) ───
  const ICONS = {
    youtube: `<svg viewBox="0 0 24 24"><path d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3-5.2 3z"/></svg>`,
    instagram: `<svg viewBox="0 0 24 24"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 017.8 2zm-.2 2A3.6 3.6 0 004 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 003.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6zm9.65 1.5a1.25 1.25 0 011.25 1.25A1.25 1.25 0 0117.25 8 1.25 1.25 0 0116 6.75a1.25 1.25 0 011.25-1.25zM12 7a5 5 0 015 5 5 5 0 01-5 5 5 5 0 01-5-5 5 5 0 015-5zm0 2a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3z"/></svg>`,
    facebook: `<svg viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>`,
    x: `<svg viewBox="0 0 24 24"><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/></svg>`,
    reddit: `<svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"/></svg>`,
    tiktok: `<svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
    snapchat: `<svg viewBox="0 0 24 24"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/></svg>`,
    linkedin: `<svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    pinterest: `<svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.087-.791-.167-2.005.035-2.868.182-.78 1.172-4.971 1.172-4.971s-.299-.599-.299-1.484c0-1.391.807-2.43 1.812-2.43.854 0 1.267.641 1.267 1.409 0 .858-.546 2.141-.828 3.329-.236.996.499 1.807 1.481 1.807 1.777 0 3.143-1.874 3.143-4.579 0-2.394-1.72-4.068-4.177-4.068-2.845 0-4.516 2.134-4.516 4.34 0 .859.331 1.781.745 2.281.082.099.093.186.069.286-.076.317-.245.994-.279 1.132-.044.184-.146.223-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.472 6.165 5.776 0 3.447-2.173 6.22-5.189 6.22-1.013 0-1.966-.527-2.292-1.148 0 0-.501 1.908-.623 2.376-.226.869-.835 1.958-1.244 2.621.937.289 1.931.445 2.963.445 5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>`,
    netflix: `<svg viewBox="0 0 24 24"><path d="m5.398 0 8.348 23.602c2.346.059 4.856.398 4.856.398L10.113 0H5.398zm8.489 0v9.172l4.715 13.33V0h-4.715zM5.398 1.5V24c1.873-.225 2.81-.312 4.715-.398V14.83L5.398 1.5z"/></svg>`,
    primevideo: `<img class="invert-on-active" src="https://www.freelogovectors.net/wp-content/uploads/2023/11/amazon-prime-video-logo-freelogovectors.net_.png" alt="Prime Video" style="width: 28px; height: 28px; object-fit: contain;">`,
    jiohotstar: `<img src="https://cdn.jiostar.com/jiostar/wp-content/uploads/2025/08/Jio-Hotstar-Logo-2.jpg" alt="JioHotstar" style="width: 32px; height: 32px; object-fit: contain; filter: invert(1); mix-blend-mode: screen; transform: scale(1.2);">`,
    sonyliv: `<img class="invert-on-active" src="https://www.freelogovectors.net/wp-content/uploads/2021/12/sonyliv-logo-freelogovectors.net_.png" alt="SonyLIV" style="width: 28px; height: 28px; object-fit: contain;">`,
    discord: `<svg viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.045-.32 13.579.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`,
    whatsapp: `<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`,
    telegram: `<svg viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`
  };

  // ─── CATEGORIES (Researched: Global + India focus) ───
  const CATEGORIES = [
    {
      title: 'Social Media',
      items: [
        { name: 'YouTube', domain: 'youtube.com', color: '#ff0000', icon: ICONS.youtube },
        { name: 'Instagram', domain: 'instagram.com', color: '#e1306c', icon: ICONS.instagram },
        { name: 'Facebook', domain: 'facebook.com', color: '#1877f2', icon: ICONS.facebook },
        { name: 'X / Twitter', domain: 'x.com', color: '#000000', icon: ICONS.x },
        { name: 'Reddit', domain: 'reddit.com', color: '#ff4500', icon: ICONS.reddit },
        { name: 'TikTok', domain: 'tiktok.com', color: '#000000', icon: ICONS.tiktok },
        { name: 'Snapchat', domain: 'snapchat.com', color: '#fffc00', icon: ICONS.snapchat },
        { name: 'LinkedIn', domain: 'linkedin.com', color: '#0a66c2', icon: ICONS.linkedin },
        { name: 'Pinterest', domain: 'pinterest.com', color: '#e60023', icon: ICONS.pinterest }
      ]
    },
    {
      title: 'Video & Streaming',
      items: [
        { name: 'Netflix', domain: 'netflix.com', color: '#e50914', icon: ICONS.netflix },
        { name: 'Prime Video', domain: 'primevideo.com', color: '#00a8e1', icon: ICONS.primevideo },
        { name: 'JioHotstar', domain: 'jiohotstar.com', color: '#0f3cc9', icon: ICONS.jiohotstar },
        { name: 'SonyLIV', domain: 'sonyliv.com', color: '#E40046', icon: ICONS.sonyliv }
      ]
    },
    {
      title: 'Messaging',
      items: [
        { name: 'WhatsApp', domain: 'web.whatsapp.com', color: '#25d366', icon: ICONS.whatsapp },
        { name: 'Telegram', domain: 'web.telegram.org', color: '#0088cc', icon: ICONS.telegram },
        { name: 'Discord', domain: 'discord.com', color: '#5865f2', icon: ICONS.discord }
      ]
    }
  ];

  // ─── State ───
  let blocklist = [];
  let strictMode = true;

  const categoriesContainer = document.getElementById('categories-container');
  const customTagsContainer = document.getElementById('custom-tags');
  const customInput = document.getElementById('custom-domain-input');
  const customBtn = document.getElementById('add-custom-btn');
  const strictToggle = document.getElementById('strict-mode-cb');

  // Close options button
  const closeBtn = document.getElementById('close-options-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length > 0) chrome.tabs.remove(tabs[0].id);
        else window.close();
      });
    });
  }

  // ─── Helpers ───
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function save() {
    if (sessionActive) return;

    chrome.storage.local.set({
      glance_focus_blocklist: blocklist,
      glance_focus_strict: strictMode
    });
  }

  function isBlocked(domain) {
    return blocklist.indexOf(domain) !== -1;
  }

  function toggleDomain(domain, forceState) {
    const idx = blocklist.indexOf(domain);
    const target = forceState !== undefined ? forceState : (idx === -1);
    if (target && idx === -1) {
      blocklist.push(domain);
    } else if (!target && idx !== -1) {
      blocklist.splice(idx, 1);
    }
    save();
    renderAll();
  }

  function getAllPresetDomains() {
    const domains = [];
    CATEGORIES.forEach(c => c.items.forEach(i => domains.push(i.domain)));
    return domains;
  }

  // ─── Render Functions ───
  function renderCategories() {
    categoriesContainer.innerHTML = '';
    CATEGORIES.forEach((cat, index) => {
      const section = document.createElement('div');
      section.className = 'category-sec reveal';
      section.style.animationDelay = `${0.2 + index * 0.1}s`;

      const header = document.createElement('div');
      header.className = 'cat-header';
      header.innerHTML = `
        <h2>${cat.title}</h2>
        <div class="cat-actions">
          <button data-action="block-all">Block all</button>
          <button data-action="unblock-all">Unblock all</button>
        </div>
      `;
      header.querySelector('[data-action="block-all"]').addEventListener('click', () => {
        cat.items.forEach(item => toggleDomain(item.domain, true));
      });
      header.querySelector('[data-action="unblock-all"]').addEventListener('click', () => {
        cat.items.forEach(item => toggleDomain(item.domain, false));
      });

      const grid = document.createElement('div');
      grid.className = 'card-grid';

      cat.items.forEach(item => {
        const blocked = isBlocked(item.domain);
        const card = document.createElement('div');
        card.className = `block-card${blocked ? ' active' : ''}`;
        card.style.setProperty('--card-accent', item.color);
        card.style.setProperty('--card-glow', hexToRgba(item.color, 0.2));
        card.style.setProperty('--card-bg', hexToRgba(item.color, 0.05));

        card.innerHTML = `
          <div class="card-left">
            <div class="card-icon">${item.icon}</div>
            <div>
              <div class="card-name">${item.name}</div>
              <div class="card-domain">${item.domain}</div>
            </div>
          </div>
          <label class="apple-switch">
            <input type="checkbox" ${blocked ? 'checked' : ''}>
            <span class="apple-slider"></span>
          </label>
        `;

        const cb = card.querySelector('input');
        // Click on card toggles switch (but not if clicking the switch itself)
        card.addEventListener('click', (e) => {
          if (e.target !== cb && !e.target.closest('.apple-slider')) {
            cb.checked = !cb.checked;
            toggleDomain(item.domain, cb.checked);
          }
        });
        cb.addEventListener('change', (e) => {
          toggleDomain(item.domain, e.target.checked);
        });

        grid.appendChild(card);
      });

      section.appendChild(header);
      section.appendChild(grid);
      categoriesContainer.appendChild(section);
    });
  }

  function renderCustomTags() {
    customTagsContainer.innerHTML = '';
    const presets = getAllPresetDomains();
    blocklist.forEach(domain => {
      if (presets.indexOf(domain) === -1) {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.innerHTML = `<span>${domain}</span><button title="Remove">✕</button>`;
        tag.querySelector('button').addEventListener('click', () => {
          toggleDomain(domain, false);
        });
        customTagsContainer.appendChild(tag);
      }
    });
  }

  function renderAll() {
    renderCategories();
    renderCustomTags();
  }

  
  // ─── Session Lock Polling ───
  let sessionActive = false;
  const lockOverlay = document.getElementById('lock-overlay');
  
  function checkSession() {
    chrome.runtime.sendMessage({ type: 'VDI_FOCUS_REQUEST' }, (res) => {
      if (res && res.phase && res.phase !== 'idle') {
        if (!sessionActive) {
          sessionActive = true;
          lockOverlay.classList.add('active');
        }
      } else {
        if (sessionActive) {
          sessionActive = false;
          lockOverlay.classList.remove('active');
          // Reload settings when session ends just in case
          chrome.storage.local.get(['glance_focus_blocklist', 'glance_focus_strict'], (res) => {
            if (res.glance_focus_blocklist) blocklist = res.glance_focus_blocklist;
            if (res.glance_focus_strict !== undefined) {
              strictMode = res.glance_focus_strict;
              strictToggle.checked = strictMode;
            }
            renderAll();
          });
        }
      }
    });
  }
  
  // Initial check and start polling
  checkSession();
  setInterval(checkSession, 2000);

  // ─── Event Listeners ───
  customBtn.addEventListener('click', () => {
    let d = customInput.value.trim().toLowerCase();
    d = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (d && !isBlocked(d)) {
      toggleDomain(d, true);
      customInput.value = '';
    }
  });
  customInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') customBtn.click();
  });

  strictToggle.addEventListener('change', (e) => {
    strictMode = e.target.checked;
    save();
  });

  const topCloseBtn = document.getElementById('close-options-btn');
  if (topCloseBtn) {
    topCloseBtn.addEventListener('click', () => {
      chrome.tabs.getCurrent((tab) => {
        if (tab) chrome.tabs.remove(tab.id);
      });
    });
  }

  const bottomCloseBtn = document.getElementById('close-options-bottom-btn');
  if (bottomCloseBtn) {
    bottomCloseBtn.addEventListener('click', () => {
      chrome.tabs.getCurrent((tab) => {
        if (tab) chrome.tabs.remove(tab.id);
      });
    });
  }

  chrome.storage.local.get(
    { glance_focus_blocklist: [], glance_focus_strict: true,  },
    (res) => {
      blocklist = res.glance_focus_blocklist;
      strictMode = res.glance_focus_strict;
      strictToggle.checked = strictMode;

      // Ensure the accent color matches the logo/extension style
      const accent = '#818cf8';
      document.documentElement.style.setProperty('--accent', accent);
      document.documentElement.style.setProperty('--accent-glow', hexToRgba(accent, 0.25));

      renderAll();
    }
  );
})();
