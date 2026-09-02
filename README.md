# Glance
*(Cross-Browser Extension)*

<p align="center">
  <a href="https://addons.mozilla.org/en-US/firefox/addon/glance-for-web/"><img src="https://img.shields.io/badge/Firefox-Get_the_Add--on-FF7139?style=for-the-badge&logo=Firefox-Browser&logoColor=white" alt="Get the Add-on for Firefox"></a>
  &nbsp;&nbsp;
  <a href="https://microsoftedge.microsoft.com/addons/detail/jhglafdjkeohejcgfdmcfhenniahjgpk"><img src="https://img.shields.io/badge/Edge-Get_it_from_Microsoft_Edge-0078D7?style=for-the-badge&logo=Microsoft-Edge&logoColor=white" alt="Get it for Microsoft Edge"></a>
</p>

<p align="center">
  <a href="https://ko-fi.com/aksharsrijan"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi"></a>
</p>

<p align="center">
  <img src="final_large_promo.jpg" alt="Glance Promo Logo" width="100%">
</p>

A beautifully animated, Apple-style Media controller that lives natively in your browser. It supports Spotify Web, Apple Music, YouTube, & YouTube Music with a 60FPS Deep-Media Timer engine, Universal Picture-in-Picture teleportation, and live time-synced lyrics.

Works on Firefox, Zen Browser, Chrome, Edge, Brave, or any modern Chromium browser. Sits as a fixed overlay at the top of every webpage. Anyone can install it in 30 seconds without touching their browser's internals.

## In Action 🎬

### Welcome Page (v1.6)
![Welcome Page Demo](welcome_page_demo_v1.6.gif)

### Lyrics Panel Teleport (v1.6)
![Lyrics Panel Teleport](lyricspanel_teleport_v1.6.gif)

### AMOLED Black Mode (v1.6)
![AMOLED Black Mode](amoled_black_mode_v1.6.gif)

## Screenshots 📸

<p align="center">
  <img src="edge working image.png" width="48%">
  <img src="yt-video screenshot.png" width="48%">
</p>

---

## What's New in V1.6.2 (The Polish Update) 🚀

*This release includes the massive v1.6 overhaul, plus new v1.6.2 hotfixes for stability and interaction.*

- **Draggable Progress Bar (New in 1.6.2)**: You can now click and drag the dot on the progress bar to smoothly seek through your music! The dot cleanly hides itself when you aren't hovering.
- **Teleport & Settings Fixes (New in 1.6.2)**: Fixed a bug where the Teleport button would sometimes cause the island to glitch or close, and resolved an issue where settings toggles wouldn't save correctly.
- **Shuffle & Repeat Support**: Natively extracts and controls Shuffle and Repeat modes for Spotify, Apple Music, and YouTube Music with platform-native icons.
- **Keyboard Shortcuts**: Global media key support (Play/Pause, Next, Previous) that works from any tab. Fully customizable via the browser's shortcut settings.
- **Quick Playlists**: Save up to 3 favorite playlists in the popup and launch them with one click.
- **AMOLED Black Mode**: Fully integrated pitch-black background mode that re-extracts album accent colors on the fly, saving battery on OLED screens.
- **Manual Lyrics Offset**: Added a customizable ±0.5s lyrics offset stepper in the settings panel to manually fine-tune lyrics synchronization.
- **Ultra-Precise Sync Engine**: Reduced UI drift tolerance to just 400ms, ensuring the 60FPS progress bar remains pixel-perfect with the underlying audio.
- **MV3 Architecture Polish**: Rewrote Apple Music hooks to strictly comply with Manifest V3 sandboxing, routing controls through native DOM clickers.
- **Fortified UI**: Added strict CSS specificity (`!important` constraints) and a 600ms debounce lock on playback toggles to eradicate crossfade desyncs and host-site CSS bleeding.

## What's New in V1.5 🚀

- **Apple Music Support**: The island now fully supports `music.apple.com`! Uses Apple's own public [MusicKit JS](https://developer.apple.com/musickit/) SDK — the official client-side JavaScript API that Apple ships on their web player — to read playback state and control the player natively through Manifest V3 content scripts.
- **Spotify Lyrics Sync Perfected**: Rewrote the Spotify lyrics tracking engine to correctly identify the primary audio element and ignore short looping background Canvas videos, ensuring accurate duration and position tracking.
- **Cross-Platform Architecture Upgrade**: The entire core engine has been upgraded to support multiple execution contexts using standard Manifest V3 content script APIs, allowing the island to adapt its interaction strategy for each supported music platform.

## What's New in V1.4 🚀

- **Spotify Web Integration**: The island now fully supports `open.spotify.com`! It reads the current track, artist, album art, duration, and playback position from Spotify's public DOM elements (data-testid attributes). Play, pause, and seek controls work by dispatching standard click events to Spotify's own UI buttons.
- **Improved Timer Sync**: Solved timer desynchronization bugs caused by multiple `<audio>` and `<video>` elements on the page. The island now correctly identifies the primary media element by filtering out short looping background videos.
- **Micro-Stutter Latency Fix**: Eradicated an issue where the background script's polling latency caused the Island's 60FPS UI progress bar to violently jitter back and forth. The Island now natively compensates for cross-process communication delays.
- **Absolute Logic Isolation**: We rebuilt the core engine to strictly partition media platforms. This mathematically guarantees that the new Spotify integration will *never* interfere with or break our highly-tuned YouTube and YouTube Music logic!
- **Gapless Playback Fix**: Fixed a major bug where YouTube Music's hidden gapless playback buffer caused the island's time tracking to desync and violently jitter. The 60FPS sync engine now smoothly bridges these buffer gaps.
- **Drag & Drop Persistence**: Fixed an issue where free-dragged positions wouldn't save correctly. If you drag the island to a custom spot on your screen, it will now correctly remember that exact position.
- **File Minification**: The extension is now heavily minified, drastically shrinking the core file size for snappier loading times and a lighter memory footprint!

## What's New in V1.3 🚀

- **Multi-Provider Lyrics Engine**: Fetches lyrics from both LyricsPlus and LRCLib simultaneously.
- **Glassmorphic Provider Menu**: A sleek, interactive UI menu to swap between lyrics providers on the fly.
- **Smart Fallback**: The island intelligently disables the lyrics button if no providers find matching lyrics for the playing track.
- **Improved Performance**: Bugfixes and performance improvements for media synchronization.

## What's New in V1.2 🚀

- **Cinematic Lyrics:** Lyrics now feature a stunning, ultra-smooth full-line glow animation that naturally fades into focus instead of a harsh word-by-word sweep.
- **Universal Picture-in-Picture:** Improved PiP integration that navigates between tabs to trigger the standard HTML5 `requestPictureInPicture()` API, then returns you to your original tab. Pop out your video from any tab, anytime.
- **Zero Jitter Engine:** The playback progress bar is now mathematically smoothed to perfectly glide across your screen, completely eliminating rubber-banding and lag caused by background tab throttling.
- **Smart Caching & Unified Tools:** Opening new tabs will now load lyrics instantly from memory! The lyrics panel also features a sleek, transparent floating Romanization toggle.

---

## Features

- **Media Playback Control:** Play, pause, skip, and scrub through tracks directly from the island. Double-click the island to jump directly to the media tab.
- **Time-Synced Lyrics & Romanization:** Fetches beautifully animated, time-synced lyrics in their original language. For non-Latin scripts (Japanese, Korean, Chinese, etc.), click the floating orb to silently query the Google Translate API and instantly provide highly accurate Romanization underneath! Click any lyric line to instantly seek to that part of the song.
- **Instrumental Progress Bar:** During instrumental sections (♪/♫), the lyrics panel displays a buttery-smooth music note that fills up seamlessly like a progress bar, perfectly synced to the duration of the instrumental break.
- **High-Res Artwork Fetching:** Automatically cross-references YouTube and Spotify tracks with the public iTunes Search API to fetch crisp, high-resolution album art!
- **In-App Settings Panel:** A sleek glassmorphic settings menu accessible directly from a gear icon on the island. Toggle features like Lyrics Engine, Free Placement, and blacklist specific sites (like YouTube or YouTube Music) on the fly. It also includes 4 instant Snap Preset buttons to park the island neatly on the edges of your screen. All settings sync via Local Storage.
- **Auto-Collapse & Idle State:** Expands on hover to show album art and controls. When inactive, it automatically shrinks into a tiny, unobtrusive dot so it stays completely out of your way.
- **Context-Aware PiP:** Includes a Picture-in-Picture (PiP) button. On standard YouTube videos, the lyrics icon intelligently hides itself to give priority to the PiP button. 
- **Cross-Tab PiP:** Because Chromium requires a user gesture on the same tab to trigger PiP, the island briefly switches to the media tab, requests PiP via the standard HTML5 API, and then switches back to your original tab — all within milliseconds.
- **Vibrant Theming:** Automatically extracts the dominant color from the album art and seamlessly themes the entire island—background, glow, accent, and progress bar—to match perfectly.

---

## Steps to Download & Install

### Install from the Store (Recommended)
- **Firefox / Zen Browser**: Install from the [Firefox Add-ons Store](https://addons.mozilla.org/en-US/firefox/addon/glance-for-web/).
- **Microsoft Edge**: Install from the [Edge Add-ons Store](https://microsoftedge.microsoft.com/addons/detail/jhglafdjkeohejcgfdmcfhenniahjgpk).
- **Google Chrome**: (Coming soon to the Chrome Web Store). In the meantime, use the manual installation below.

### Manual Installation (For Chrome, Brave, or Developers):
1. Download the latest release zip from the repository.
2. Extract the folder to a safe location on your computer.
3. Open `chrome://extensions` (or `edge://extensions` or `about:debugging` in Firefox/Zen).
4. Enable **Developer Mode** using the toggle in the top right.
5. Click **Load unpacked** and select the folder you extracted.

No build step, no dependencies, no account required.

---

## How this was actually built

I am a 3nd-year CS/IoT/Cybersecurity engineering student. I do not enjoy frontend development. I did not write the HTML, CSS, or JS syntax for this project — that was handled by agentic AI (Google's Antigravity 2.0 and Claude).

What I did do: defined the product, made every architectural decision, and acted as QA throughout. I caught bugs the AI missed repeatedly — a silent `ReferenceError` that was killing color theming entirely, a JavaScript closure bug that bound every lyrics click listener to the last line instead of the correct one, an infinite loop in the Apple Music metadata fetcher, and Chromium's strict User Gesture requirements that required a cross-tab navigation approach for PiP. The AI generated code; I decided what the code was supposed to do and whether it actually did it.

This is what AI-assisted development actually looks like in practice. It is a lot of iterative debugging and knowing when the output is wrong.

---

## Known Limitations & Technical Challenges

- **Platform Support:** Currently optimized and actively tested for **Apple Music, YouTube, YouTube Music, and Spotify Web Player**. Native desktop apps (like the standalone Spotify PC client) cannot be supported due to strict browser extension sandbox rules.
- **Fake Visualizer:** The EQ visualizer animates randomly rather than reacting to actual audio. There is no browser API that securely exposes raw audio waveform data from an arbitrary tab to an external script. 
- **Lyrics Availability:** Depends on the combined databases of lrclib.net and LyricsPlus. Mainstream and regional tracks work surprisingly well; obscure tracks often do not. While translations are not provided, accurate romanization is fetched on-the-fly.
- **Chromium Throttling:** When the media tab isn't focused, Chromium aggressively throttles its JavaScript, which can cause minor desyncs or lag when skipping tracks.
- **Extension Restrictions:** The Chrome Extension cannot appear on `chrome://` internal pages, the new tab page, or heavily restricted Web Store pages due to browser security restrictions. It works on every normal webpage.
- **Color Extraction:** Occasionally picks a muted color depending on album art composition, though this has been optimized.

---

## Development

The codebase is modularized in `src/` for easier maintenance:

```
src/
  core.js           # Shared: time formatting, color extraction, lyrics API
  styles.js         # CSS generation with configurability
  ui.js             # DOM creation and controller logic
  platform/
    chrome-ext.js   # Extension messaging
```

Run `node build.js` to regenerate the output files and the release `.zip` archive. No bundler required.

---

## Contributions

Pull requests are highly welcome. The modular structure makes it easy to work with: CSS edits belong in `src/styles.js`, core logic in `src/core.js`, and browser-specific code in `src/platform/`.
