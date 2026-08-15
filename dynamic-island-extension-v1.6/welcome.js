
    // --- SIMULATED EXTRACTVIBRANT DATA (Reflects the 5 images shared) ---
    const tracks = [
      { title: 'Blinding Lights', artist: 'The Weeknd', c1: '#4a2000', c2: '#d4820a', bg: '#1a0a00', glow: 'rgba(212,130,10,0.25)', img: 'blinding_lights.png' },
      { title: 'Arabic Kuthu', artist: 'Anirudh', c1: '#3a2000', c2: '#d4a820', bg: '#180a00', glow: 'rgba(212,168,32,0.25)', img: 'arabic_kuthu.png' },
      { title: 'Apna Bana Le', artist: 'Arijit Singh', c1: '#0d2a4a', c2: '#3a8ecc', bg: '#0a1626', glow: 'rgba(58,142,204,0.25)', img: 'apna_bana_le.png' },
      { title: 'Illuminati', artist: 'Sushin Shyam', c1: '#4a1a00', c2: '#d4a020', bg: '#180a00', glow: 'rgba(212,160,32,0.25)', img: 'illuminati.png' },
      { title: 'Abhimanigale', artist: 'Puneeth & Shivarajkumar', c1: '#9e8a66', c2: '#ce1e1e', bg: '#1a1a1a', glow: 'rgba(206,30,30,0.25)', img: 'doddmane_hudga.png' }
    ];

    const langs = [
      { code: 'kn', text: 'ಅಭಿಮಾನಿಗಳೇ', rom: 'Abhimanigale' },
      { code: 'hi', text: 'अपना बना ले', rom: 'Apna Bana Le' },
      { code: 'ta', text: 'அரபிக் குத்து', rom: 'Arabic Kuthu' },
      { code: 'te', text: 'బట్టబొమ్మ', rom: 'Buttabomma' },
      { code: 'ml', text: 'ഇല്ലുമിനാറ്റി', rom: 'Illuminati' }
    ];

    // --- DOM REFS ---
    const island = document.getElementById('island');
    const colText = document.getElementById('vdi-col-inner');
    const titleEl = document.getElementById('vdi-title');
    const artistEl = document.getElementById('vdi-artist');
    const artEl = document.getElementById('vdi-art');
    const fillEl = document.getElementById('vdi-prog-fill');
    const posEl = document.getElementById('vdi-pos');
    const durEl = document.getElementById('vdi-dur');
    const ppIcon = document.getElementById('vdi-pp');
    const grid = document.getElementById('track-grid');
    const eqBars = document.querySelectorAll('.vdi-eq-bar');
    const romDemo = document.getElementById('rom-demo');

    let isPlaying = true;
    let progress = 28;
    let duration = 202;
    let activeIndex = 0;

    const PAUSE = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    const PLAY = '<path d="M8 5v14l11-7z"/>';

    // --- THE EXACT LOGIC: Update the ENTIRE page based on extracted colors ---
    function applyTrack(index) {
      const t = tracks[index];
      activeIndex = index;

      // Update root CSS variables
      const root = document.documentElement;
      root.style.setProperty('--vdi-accent', t.c2);
      root.style.setProperty('--vdi-grad', `linear-gradient(135deg, ${t.c1}, ${t.c2})`);
      root.style.setProperty('--vdi-dark', t.bg);
      root.style.setProperty('--vdi-glow', t.glow);

      // Update Island data
      colText.textContent = `${t.title} · ${t.artist}`;
      titleEl.textContent = t.title;
      artistEl.textContent = t.artist;
      artEl.style.background = `linear-gradient(135deg, ${t.c1}, ${t.c2})`;

      // Update active card
      document.querySelectorAll('.track-card').forEach((card, i) => {
        card.classList.toggle('active', i === index);
      });

      // Reset and expand
      progress = 5 + Math.random() * 30;
      duration = 180 + Math.floor(Math.random() * 60);
      durEl.textContent = VDI_formatTime(duration);
      updateProgress();
      if (!island.classList.contains('vdi-expanded')) {
        island.classList.add('vdi-expanded');
      }
    }

    function updateProgress() {
      const pct = Math.min(100, (progress / duration) * 100);
      fillEl.style.width = pct + '%';
      posEl.textContent = VDI_formatTime(progress);
    }

    function VDI_formatTime(seconds) {
      if (!seconds || seconds < 0) return '0:00';
      const s = Math.round(seconds);
      return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
    }

    function togglePlay() {
      isPlaying = !isPlaying;
      ppIcon.innerHTML = isPlaying ? PLAY : PAUSE;
    }

    // --- BUILD TRACK GRID ---
    tracks.forEach((t, i) => {
      const card = document.createElement('div');
      card.className = 'track-card' + (i === 0 ? ' active' : '');
      card.innerHTML = `
        <div class="track-thumb">
          <img src="${t.img}" alt="${t.title}" onerror="this.style.display='none'">
          <div class="fallback">♪</div>
        </div>
        <div>
          <div style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.title}</div>
          <div style="font-size:11px; color:rgba(255,255,255,0.4);">${t.artist}</div>
        </div>
      `;
      card.addEventListener('click', () => applyTrack(i));
      grid.appendChild(card);
    });

    // --- ISLAND CONTROLS ---
    island.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      island.classList.toggle('vdi-expanded');
    });
    document.getElementById('vdi-play').addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
    document.getElementById('vdi-prev').addEventListener('click', (e) => { e.stopPropagation(); applyTrack((activeIndex - 1 + tracks.length) % tracks.length); });
    document.getElementById('vdi-next').addEventListener('click', (e) => { e.stopPropagation(); applyTrack((activeIndex + 1) % tracks.length); });

    // --- 60FPS PROGRESS ENGINE ---
    let lastTime = 0;
    function tick(time) {
      if (isPlaying) {
        const delta = (time - lastTime) / 1000;
        progress = Math.min(duration, progress + delta * 1.2);
        updateProgress();
      }
      lastTime = time;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // --- EQ VISUALIZER ---
    setInterval(() => {
      eqBars.forEach(bar => {
        bar.style.height = isPlaying ? (3 + Math.floor(Math.random() * 9)) + 'px' : '3px';
      });
    }, 200);

    // --- LANGUAGE DEMO INTERACTION ---
    const langBadges = document.querySelectorAll('.lang-badge');
    langBadges.forEach(badge => {
      badge.addEventListener('click', () => {
        langBadges.forEach(b => b.classList.remove('active'));
        badge.classList.add('active');
        const code = badge.getAttribute('data-lang');
        const data = langs.find(l => l.code === code);
        if (data) {
          romDemo.innerHTML = `<div>${data.text}</div><div style="font-size: 14px; font-weight: 400; color: var(--vdi-accent); margin-top: 4px;">${data.rom}</div>`;
        }
      });
    });

    // --- SCROLL REVEAL ---
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // --- GRACEFUL TAB CLOSING ---
    document.getElementById('close-btn').addEventListener('click', () => {
      // Since this page is opened by chrome.tabs.create, window.close() works flawlessly
      window.close();
      // Fallback just in case it's opened as a normal webpage
      setTimeout(() => {
        if (!window.closed) {
          window.location.href = 'about:blank';
        }
      }, 100);
    });

    // --- INIT ---
    applyTrack(4); // Default to "Abhimanigale" from Doddmane Hudga
    setTimeout(() => island.classList.add('vdi-visible'), 300);
  