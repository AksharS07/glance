// --- DATA ---
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

const SHUFFLE_OFF = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>';
const SHUFFLE_ON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.293 13.293a1 1 0 011.414 0L22.414 18l-4.707 4.707a1 1 0 01-1.414-1.413L18.586 19H17.21a7.001 7.001 0 01-5.824-3.117l-.186-.278 1.202-1.803.648.972A5.001 5.001 0 0017.21 17h1.375l-2.293-2.293a1 1 0 010-1.414Zm0-12a1 1 0 011.414 0L22.414 6l-4.707 4.707a1 1 0 01-1.414-1.414L18.586 7H17.21a5 5 0 00-4.16 2.227l-4.438 6.656A7 7 0 012.79 19H2a1 1 0 010-2h.79a5 5 0 004.16-2.226l4.437-6.656A7 7 0 0117.21 5h1.375l-2.293-2.292a1 1 0 010-1.415ZM3 10.001a2 2 0 110 4 2 2 0 010-4Zm-.21-5a7 7 0 015.823 3.117l.185.277-1.202 1.803-.647-.971A5 5 0 002.79 7H2a1 1 0 010-2h.79Z"></path></svg>';
const REPEAT_OFF = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>';
const REPEAT_ALL = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 10a1 1 0 011 1v4a5 5 0 01-5 5H5.414l1.293 1.293a1 1 0 11-1.414 1.414L1.586 19l3.707-3.707a1 1 0 111.414 1.414L5.414 18H17a3 3 0 003-3v-4a1 1 0 011-1Zm-3.707-8.707a1 1 0 011.414 0L22.414 5l-3.707 3.707a1 1 0 11-1.414-1.414L18.586 6H7a3 3 0 00-3 3v4a1 1 0 01-2 0V9a5 5 0 015-5h11.586l-1.293-1.293a1 1 0 010-1.414ZM12 10a2 2 0 110 4 2 2 0 010-4Z"></path></svg>';
const REPEAT_ONE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.293 1.293a1 1 0 000 1.415L18.586 4H7a5 5 0 00-5 5v4a1 1 0 102 0V9a3 3 0 013-3h11.586l-1.293 1.293a1 1 0 001.414 1.415L22.414 5l-3.707-3.707a1 1 0 00-1.414 0ZM13 15V8h-2.5a1 1 0 000 2h.5v5a1 1 0 002 0Zm8-5a1 1 0 00-1 1v4a3 3 0 01-3 3H5.414l1.293-1.292a1.001 1.001 0 00-1.414-1.415L1.586 19l3.707 3.707a1 1 0 101.414-1.413L5.414 20H17a5 5 0 005-5v-4a1 1 0 00-1-1Z"></path></svg>';

// --- DOM REFS ---
const island = document.getElementById('island');
const colText = document.getElementById('vdi-col-inner');
const titleEl = document.getElementById('vdi-title');
const artistEl = document.getElementById('vdi-artist');
const artEl = document.getElementById('vdi-art');
const artImg = document.getElementById('vdi-art-img');
const artPh = document.getElementById('vdi-art-ph');
const fillEl = document.getElementById('vdi-prog-fill');
const posEl = document.getElementById('vdi-pos');
const durEl = document.getElementById('vdi-dur');
const ppIcon = document.getElementById('vdi-pp');
const grid = document.getElementById('track-grid');
const eqBars = document.querySelectorAll('.vdi-eq-bar');
const romDemo = document.getElementById('rom-demo');
const shuffleBtn = document.getElementById('vdi-shuffle');
const repeatBtn = document.getElementById('vdi-repeat');
const amoledCheckbox = document.getElementById('amoled-checkbox');
const closeBtn = document.getElementById('close-btn');

let isPlaying = true;
let progress = 28;
let duration = 202;
let activeIndex = 0;
let shuffleOn = false;
let repeatMode = 'off'; // 'off', 'all', 'one'
let collapseTimeout = null;

const PAUSE = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
const PLAY = '<path d="M8 5v14l11-7z"/>';

// --- MAIN LOGIC ---
function applyTrack(index) {
  const t = tracks[index];
  activeIndex = index;

  // Update CSS Variables
  const root = document.documentElement;
  root.style.setProperty('--vdi-accent', t.c2);
  root.style.setProperty('--vdi-grad', `linear-gradient(135deg, ${t.c1}, ${t.c2})`);
  
  root.style.setProperty('--vdi-dark-original', t.bg);
  if (!amoledCheckbox.checked) {
    root.style.setProperty('--vdi-dark', t.bg);
  }
  root.style.setProperty('--vdi-glow', t.glow);

  // Update Island Data
  colText.textContent = `${t.title} - ${t.artist}`;
  titleEl.textContent = t.title;
  artistEl.textContent = t.artist;
  artEl.style.background = `linear-gradient(135deg, ${t.c1}, ${t.c2})`;

  // Load Album Art (Fade-in)
  if (t.img) {
    artImg.classList.remove('ok');
    artImg.src = t.img;
    artImg.onload = function() {
      artImg.classList.add('ok');
      artPh.style.display = 'none';
    };
    artImg.onerror = function() {
      artPh.style.display = 'flex';
    };
  }

  // Update Cards
  document.querySelectorAll('.track-card').forEach((card, i) => {
    card.classList.toggle('active', i === index);
  });

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

function toggleShuffle() {
  shuffleOn = !shuffleOn;
  shuffleBtn.classList.toggle('vdi-active', shuffleOn);
  shuffleBtn.innerHTML = shuffleOn ? SHUFFLE_ON : SHUFFLE_OFF;
}

function toggleRepeat() {
  if (repeatMode === 'off') repeatMode = 'all';
  else if (repeatMode === 'all') repeatMode = 'one';
  else if (repeatMode === 'one') repeatMode = 'off';

  repeatBtn.classList.remove('vdi-active', 'vdi-repeat-one');
  if (repeatMode === 'all') {
    repeatBtn.classList.add('vdi-active');
    repeatBtn.innerHTML = REPEAT_ALL;
  } else if (repeatMode === 'one') {
    repeatBtn.classList.add('vdi-active', 'vdi-repeat-one');
    repeatBtn.innerHTML = REPEAT_ONE;
  } else {
    repeatBtn.innerHTML = REPEAT_OFF;
  }
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
island.addEventListener('mouseenter', () => {
  clearTimeout(collapseTimeout);
  island.classList.add('vdi-expanded');
});
island.addEventListener('mouseleave', () => {
  clearTimeout(collapseTimeout);
  collapseTimeout = setTimeout(() => {
    island.classList.remove('vdi-expanded');
    collapseTimeout = null;
  }, 500);
});
island.addEventListener('click', (e) => {
  if (e.target.closest('button')) return;
  island.classList.toggle('vdi-expanded');
});

document.getElementById('vdi-play').addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
document.getElementById('vdi-prev').addEventListener('click', (e) => { e.stopPropagation(); applyTrack((activeIndex - 1 + tracks.length) % tracks.length); });
document.getElementById('vdi-next').addEventListener('click', (e) => { e.stopPropagation(); applyTrack((activeIndex + 1) % tracks.length); });
shuffleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleShuffle(); });
repeatBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleRepeat(); });

// --- AMOLED TOGGLE LOGIC ---
amoledCheckbox.addEventListener('change', (e) => {
  const isChecked = e.target.checked;
  document.body.classList.toggle('amoled-mode', isChecked);
  
  const root = document.documentElement;
  const currentTrack = tracks[activeIndex];
  if (isChecked) {
    root.style.setProperty('--vdi-dark', '#000000');
  } else {
    root.style.setProperty('--vdi-dark', currentTrack.bg);
  }
});

// --- 60FPS PROGRESS ---
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

// --- ROMANIZATION INTERACTION ---
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

// --- CLOSE TAB ---
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    window.close();
    setTimeout(() => {
      if (!window.closed) {
        window.location.href = 'about:blank';
      }
    }, 100);
  });
}

// --- INIT ---
applyTrack(0); // Start with Blinding Lights for mass appeal
setTimeout(() => island.classList.add('vdi-visible'), 300);