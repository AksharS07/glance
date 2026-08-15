# Developer Notes & Project Knowledge Base
*This file contains critical context, historical bug fixes, architecture quirks, and logic rules for the Vivaldi Dynamic Island project. It is strictly maintained for the AI agent to prevent regressions and understand the complex interaction between the Vivaldi UI, the Chrome Extension wrapper, and YouTube Music.*

## 1. Project Architecture (The Dual-Build System)
This project compiles into TWO distinct platforms from the exact same core codebase (`core.js`, `ui.js`, `styles.js`):
1. **Vivaldi Web Panel Mod**: Injected directly into Vivaldi's `window.html`. Relies on `vivaldi.js` as the platform adapter.
2. **Standard Chrome Extension**: Loaded via `chrome://extensions`. Relies on `chrome-ext.js` as the platform adapter, bundled with a background script (`background.js`) and a content bridge.

**CRITICAL BUILD QUIRK (`sendAction`):**
- `ui.js` always calls `platform.sendAction(tabId, action, value)` (the Vivaldi signature).
- `chrome-ext.js` explicitly expects `sendAction(action, value)` because its background script inherently tracks the `tabId`.
- **HOW IT WORKS:** `build.js` dynamically generates an adapter wrapper for the Chrome Extension that intercepts `platform.sendAction(tabId, action, value)`, strips the `tabId`, and correctly calls `VDI.Platform.ChromeExt.sendAction(action, value)`. 
- **DO NOT CHANGE `chrome-ext.js` TO ACCEPT `tabId`!** Doing so will cause the `build.js` adapter to pass the string action (e.g. `'toggle'`) into the `tabId` slot, completely breaking all media controls.

## 2. The `world: 'MAIN'` Catastrophe & Targeted Execution
**NEVER use `world: 'MAIN'` globally in `execInTab`!**
- *The Problem:* YouTube Music hides its exact millisecond track time inside native JS variables (`window.ytplayer`, `movie_player`). To read these, `getTabMediaState` must run in the `MAIN` world.
- *The Catastrophe:* Originally, `world: 'MAIN'` was applied to all `execInTab` calls. This caused `togglePiP` and `executeMediaAction` to crash because extension APIs (`chrome.runtime`) are completely blocked inside the `MAIN` world by Manifest V3. This killed the media controls and the PiP teleport.
- *The CSP Trap:* An attempt was made to inject a DOM `<script>` tag to read the time, but YouTube Music's strict Content Security Policy (CSP) silently blocked it, causing the time to fall back to the text parser (creating a 1-second lyrics truncation lag).
- *The Ultimate Solution:* `execInTab` in the platform adapters was modified to accept a `world` parameter. We now explicitly pass `'MAIN'` **only** when polling `getTabMediaState`. Action scripts remain safely in the default `ISOLATED` world.

## 3. Lyrics Sync and High-Precision Timing
Because the extension runs in the `ISOLATED` world, it cannot read `window.ytplayer.getCurrentTime()`. 
- *The Fallback Error:* It previously fell back to scraping the DOM progress text (`0:15 / 4:09`). Because this text truncates to whole seconds, `ui.js`'s internal 60fps extrapolator would constantly drift behind the actual music by up to 0.999 seconds, completely breaking the fast-paced sync of LRCLIB lyrics.
- *The Fix:* `getTabMediaState` inside `core.js` now strictly searches for the native HTML5 `<video>` or `<audio>` element (`el.currentTime`) and prioritizes it. The native HTML5 video element provides perfect floating-point millisecond precision inside the `ISOLATED` world, keeping the lyrics buttery smooth.

**Spotify Specific Timing Quirks:**
1. **The Canvas Video Bug**: Spotify injects invisible 8-to-10 second looping Canvas background videos into the DOM. We MUST explicitly filter out elements with `duration < 30` seconds when scraping `el.currentTime`, or the Island timer will violently lock onto the 8-second video loop and jump from 0 to 8 infinitely.
2. **The Delayed DOM**: Spotify Web uses DRM (Widevine) and chunked Media Source Extensions (MSE). As a result, the visible text UI timer (`0:16`) is routinely 1-to-3 seconds delayed from the true hardware playback buffer. Relying on `el.currentTime` is strictly mandatory for Spotify lyrics synchronization.
3. **The Text DOM Mutation Fix (August 15, 2026)**: Because Spotify hides the true `el.currentTime` for the music behind DRM, we must use the text UI timer. However, using CSS progress percentages (`--progress-bar-transform`) creates huge drift if the song duration is off by even milliseconds. The only exact way to get perfect sync is to place a `MutationObserver` on the `0:15` text element, grab the exact `Date.now()` when it mutates, and track the micro-milliseconds from that exact moment. (We also must explicitly pause the elapsed time when `isPlaying` is false to prevent background compound drift).
4. **Latency Interpolator Jitter**: DO NOT attempt to write a complex mathematically-compensated `latency` compensator in `ui.js` using `Date.now() - newState.timestamp`. Cross-process communication in Chromium heavily fluctuates by micro-milliseconds. Compensating for latency causes the 60FPS UI to violently jitter. The Island instead natively accepts the 1000ms delay and purely relies on its own internal clock, using `forceNextSync` ONLY to snap after a buffer seek completes.

## 4. Play/Pause Button Architecture (Spotify Dropped Clicks)
**Never use explicit `play`/`pause` state tracking for the play button! Always use a blind `toggle`.**
- *The Problem:* Spotify natively drops rapid physical DOM clicks (e.g., if you double-click the play button in 100ms, the second click is completely ignored by Spotify). If the extension tries to be "smart" by sending explicit `play` commands based on what it *thinks* the state is, any dropped clicks will cause the Island's UI to become permanently desynced from Spotify. If the Island thinks it's playing but it's actually paused, clicking the island button will send `play`, see that it's "already playing" in the UI, and do absolutely nothing—rendering the button dead.
- *The Solution:* The Island UI button is just a remote control. It applies a 150ms anti-hardware-bounce debounce, and then sends a blind `toggle` command. `core.js` blindly fires `tb.click()`. If Spotify drops a click from spamming, the user can just hit the button again naturally and it will work instantly. Do not attempt to re-engineer an Action Queue or throttle for this.

## 5. Picture-in-Picture (PiP) Teleportation
When a user triggers PiP from the Island while viewing a different tab, the browser must:
1. Teleport the user to the media tab.
2. Display a clickable overlay (because browsers block programmatic PiP without a direct user click).
3. Teleport the user back to their original tab the moment they click the overlay.

**The Teleport Payload (`sourceInfo`):**
- **Vivaldi:** Uses an integer `originalTabId`. The UI listens for `VDI_TELEPORT_BACK` and calls `chrome.tabs.update(msg.source)`.
- **Chrome Extension:** Popups have no `sender.tab`, so the background script queries the `active: true, currentWindow: true` tab to record the user's origin. It passes an object `{tabId, winId}` as `sourceInfo`. The background script listens for `VDI_TELEPORT_BACK` and updates both the tab and the window.
- **Rule:** `core.js` must ALWAYS send `{ type: 'VDI_TELEPORT_BACK', source: sourceInfo }`. Do not change `source:` to `tabId:`, as it breaks the Chrome Extension's object parsing.

## 5. UI Animations & CSS
- **Lyrics Word-by-Word Animation:** The `.vdi-lyric-word` color transition dynamically uses the CSS variable `var(--w-dur, 0.25s)`. This variable represents the exact mathematical duration the singer takes to sing that specific word (injected by the UI renderer). This makes the color fill mimic Apple Music's fluid lyrics, rather than using a static, robotic 0.1s transition.

## 6. Hiding the Island
- The `hideYouTube` and `hideYouTubeMusic` settings are designed to hide the Island ONLY when the user is actively viewing those sites (because they already have native controls). 
- In `ui.js`, `isHiddenByApp` uses `window.location.hostname` to verify the user is actually looking at the site, rather than just checking `state.isYouTubeVideo` (which would falsely hide the Island globally even if the user is on GitHub while YouTube plays in the background).

## 7. Apple Music — `wrappedJSObject` MusicKit Access (CRITICAL)
Apple Music Web (`music.apple.com`) has military-grade CSP that blocks all script injection. Here is the definitive architecture:

### What Fails (Do NOT Try These Again)
1. **Inline `<script>` injection**: Blocked by Apple Music's `script-src` CSP. The script tag is inserted but never executed.
2. **Blob URL injection** (`URL.createObjectURL(new Blob(...))`): Also blocked by CSP. The `#vdi-am-bridge` div will exist in the DOM but its `dataset` will be permanently empty (`DOMStringMap(0)`). This was proven by inspecting the element in DevTools — confirmed dead.
3. **DOM scraping for shuffle/repeat**: Apple Music's `button[aria-label="Shuffle"]` has NO `aria-pressed`, `aria-checked`, or descriptive state in the label. Color-based detection via `getComputedStyle` is too fragile. DO NOT try this.
4. **TreeWalker for duration**: Fragile — only use as last resort fallback on Chrome where nothing else works.

### The Working Solution: `window.wrappedJSObject` (Firefox/Zen)
- Firefox/Zen content scripts run in an `ISOLATED` world but can access the page's main-world objects via `window.wrappedJSObject`.

### Apple Music Repeat Cycle Mapping
Apple Music has a highly unorthodox state mapping for its repeat mode that inverses standard `MusicKit` logic visually.
- The `MusicKit` API enum is: `0 = Off`, `1 = Repeat One`, `2 = Repeat All`.
- The cycle UI natively goes in this order: `Off -> Repeat All -> Repeat One`.
- Mathematically, this means the cycle skips from `0` to `2` to `1` and back to `0`.

If you write a standard modulo fallback `(m.repeatMode + 1) % 3`, the cycle will jump `0 -> 1` (Off to Repeat One), breaking the user experience and desyncing the Island.

**MANDATORY:**
Always use explicit conditional assignments for Apple Music's repeat cycle:
`m.repeatMode = m.repeatMode === 0 ? 2 : (m.repeatMode === 2 ? 1 : 0);`
Do not use `+ 1 % 3` for Apple Music.
- **No script injection needed** — this is a native Firefox security model feature.
- **Bypasses CSP entirely** because we are reading, not injecting.

**Implementation in `core.js`:**
```js
var pageWin = window.wrappedJSObject || window; // Firefox: wrappedJSObject, Vivaldi: window directly
var MK = pageWin.MusicKit;
if (MK && typeof MK.getInstance === 'function') {
  var mk = MK.getInstance();
  uiCur = mk.currentPlaybackTime || 0;
  uiDur = (mk.nowPlayingItem && mk.nowPlayingItem.playbackDuration) ? mk.nowPlayingItem.playbackDuration / 1000 : 0;
  shuffleOn = mk.shuffleMode !== 0;
  var rm = mk.repeatMode;
  repeatMode = rm === 2 ? 'all' : (rm === 1 ? 'one' : 'off');
}
// Action handler (executeMediaAction):
// Standard cycle: off(0) → all(2) → one(1) → off(0)
m.repeatMode = m.repeatMode === 0 ? 2 : (m.repeatMode === 2 ? 1 : 0);
```

**MusicKit API Values (confirmed via DevTools console):**
- `mk.currentPlaybackTime` → seconds (float)
- `mk.nowPlayingItem.playbackDuration` → **milliseconds** (divide by 1000)
- `mk.shuffleMode` → `0` = off, `1` = shuffle songs
- `mk.repeatMode` → `0` = off, `1` = repeat one, `2` = repeat all
- **Actual cycle via wrappedJSObject**: `0 → 1 → 2 → 0` (off → one → all → off)
- **NOTE**: This is the OPPOSITE of what you'd expect (off→all→one). MusicKit's JS setter via wrappedJSObject applies the value but Apple Music internally cycles one-first. Do NOT change this cycle back to 0→2→1 or it will invert again.

**Vivaldi note:** Vivaldi Web Panel runs content scripts in the MAIN world natively, so `window.MusicKit` is directly accessible there too. The `window.wrappedJSObject || window` pattern handles both browsers.

## 8. The Firefox / Zen Optimization Trap (DO NOT CHANGE `<all_urls>`)
**DO NOT ATTEMPT TO RESTRICT `<all_urls>` OR IMPLEMENT LAZY-LOADING FOR FIREFOX.**
- *The Trap:* During local development, hitting "Reload" on the extension in `about:debugging` while having 100+ tabs open will cause Firefox to lag or crash. This is because Firefox instantly parses the 120KB script into all 100 tabs on the same thread. Future developers might be tempted to "fix" this by restricting the manifest `matches` to media sites only.
- *The Consequence:* Doing so breaks the core functionality (the Island disappears from non-media tabs, ruining its use as a universal remote). Even worse, the background script's `sendMessage` polling will fail on those non-media tabs, triggering a fallback `executeScript` call every 1000ms. Spamming `executeScript` across Firefox's IPC bridge triggers severe "Extension is slowing down your browser" warnings and causes total session crashes.
- *The Rule:* The 100-tab reload crash is strictly an artificial local-development quirk. In organic production use, tabs are loaded individually, and the `<all_urls>` injection works flawlessly. Leave it alone.

## 9. YT Music Shuffle/Repeat State Detection (The Localization Catastrophe)
**NEVER search for the English words "shuffle" or "repeat" in YT Music button tooltips to detect state!**
- *The Problem:* YT Music localizes button `title` and `aria-label` attributes based on the user's language. A user with Kannada, Hindi, Japanese, etc. will have buttons with non-English tooltips, causing any `title.includes('shuffle')` check to silently fail and return `false` forever.
- *The Fix (Structural Layout):* The `ytmusic-player-bar` has a `.right-controls-buttons` (or `.right-controls`) container. Inside it, `ytmusic-toggle-button-renderer` elements are placed in a fixed order: **Repeat at index 0, Shuffle at index 1**. We count them by position, not by label.
- *Active State Detection:* YT Music uses Polymer web components. Check these in order:
  1. `aria-pressed="true"` on the element or any child.
  2. `is-toggled="true"` attribute.
  3. `active` attribute present AND not `"false"` (Polymer sets `active="false"` instead of removing it).
  4. Computed CSS `color` of the inner `yt-icon`/`svg` being `rgb(255, 255, 255)` (white = active).
- *Repeat One Detection:* The repeat button cycles through Off → All → One. To detect "One" without relying on localized titles, inspect the SVG `<path>` elements for known `d` attribute fragments that draw the numeral "1" (e.g., `M11.5 14h1v-4h-2v1h1v3z`).
- *Fallback:* If `.right-controls` isn't found (layout A/B test), fall back to searching for `ytmusic-toggle-button-renderer` with English `aria-label` hints, but this is fragile and should not be the primary path.

## 10. Spotify Shuffle — 3-State Detection via SVG Paths (CONFIRMED)
Spotify completely stripped `data-testid`, `aria-checked`, and `aria-pressed` from their shuffle button. 
Historically, we fell back to checking if the `aria-label` contained the word "smart". **DO NOT DO THIS.** Relying on English text (`aria-label="Disable Smart Shuffle for [song]"`) instantly breaks when the user switches Spotify to Spanish or Japanese, as the word "smart" vanishes from the translation.

**The Bulletproof SVG Method:**
The only universally language-agnostic way to detect Spotify's 3-mode shuffle (Off / On / Smart) is to physically inspect the button's DOM structure.
1. **Finding the Button:** We locate the button by searching for the core SVG paths it contains: `document.querySelector('path[d^="M13.151"], path[d^="M4.502"]')`.
2. **Active State Detection:** When Spotify toggles any shuffle mode ON, it strictly applies the `.encore-internal-color-text-bright-accent` class to color the button green.
3. **Smart Shuffle Detection:** When Smart Shuffle activates, the SVG actually morphs. A new `<path>` is dynamically injected to draw the tiny sparkle star. We detect Smart Shuffle exclusively by checking if the button contains this sparkle path (`d="M12.69..."`).

**Implementation:**
```js
var shufPath = document.querySelector('path[d^="M13.151"], path[d^="M4.502"]');
var shufBtn = shufPath ? shufPath.closest('button') : null;
if (shufBtn) {
  shuffleOn = shufBtn.className.includes('encore-internal-color-text-bright-accent');
  isSmartShuffle = !!shufBtn.querySelector('path[d^="M12.69"]');
}
```

## 11. Apple Music Repeat — DOM Class Detection (CONFIRMED)
The Apple Music repeat button lives inside a **shadow DOM** (Svelte component) with **no `aria-label` and no `data-testid`**. It is identified purely by CSS class.

**Confirmed class pattern:**
- `button--repeat mode--0` = Repeat OFF
- `button--repeat mode--1` = Repeat ONE (song)
- `button--repeat mode--2` = Repeat ALL (playlist)

**State reading** (via `deepQueryOne` to pierce shadow DOM):
```js
var repBtn = VDI.Core.deepQueryOne('.button--repeat');
var rc = repBtn ? (repBtn.className || '') : '';
repeatMode = rc.includes('mode--2') ? 'all' : (rc.includes('mode--1') ? 'one' : 'off');
```

**Actions:** Click the native button via `deepQueryOne('.button--repeat').click()`. The native Apple Music cycle is **off → one → all** (their internal design choice). The `wrappedJSObject` setter (`m.repeatMode = value`) is **silently ignored** by MusicKit — do not attempt to set it directly.

**MusicKit API values** (for reading only via `wrappedJSObject`): `0=off, 1=one, 2=all`. Use DOM class as primary source of truth.

## 12. The Golden Ratio of Color Extraction
The dynamic island mathematically extracts the most vibrant accent color from the album art. Because the Island itself is always black/dark, the accent color does **not** need to contrast against the dominant background hue (unlike Apple Music's full-screen player).

**The Math (The Golden Ratio):**
```js
var score = Math.sqrt(Area) * Math.pow(Chroma, 4);
```
- **Area (`Math.sqrt(bkt.n)`)**: We use the square root of the pixel count. This prevents massive, slightly-vibrant backgrounds from mathematically obliterating tiny, pure logos.
- **Purity (`Math.pow(avgC, 4)`)**: We heavily reward pure, neon colors. This allows tiny elements (like Spider-Man's pure red ring) to mathematically defeat massive but washed-out elements (like Spider-Man's pale blue lens reflections).

**Why we removed `cMult` (Contrast Multiplier):**
Initially, we used a contrast multiplier (`cMult = 0.0` for hues matching the dominant background) to force the algorithm to pick a *secondary* color. This backfired on albums like *Jawan* and *Osthe*, where the user *wanted* the dominant red/gold background to be the accent color, but the contrast penalty forced the algorithm to artificially boost microscopic blue logos/text instead. Since the Island's background is dark, we just want the purest, largest color — regardless of whether it matches the album's main background!

**Noise Rejection:**
Before scoring, any color bucket with fewer than `25` pixels is instantly discarded. This gracefully destroys single-pixel anti-aliasing artifacts and JPEG compression noise (which otherwise score artificially high in Chroma).

## 13. UI Components & Host CSS Isolation
**The Host CSS Bleeding Problem**: Because the Island is injected into arbitrary host websites (like Devpost, GitHub, YouTube), it is highly susceptible to aggressive global CSS resets from the host.
**The Hard Reset Solution**: Never rely on generic `*` selectors (they can break the Island's own internal flex layouts). Instead, target specific control buttons (`.vdi-btn`, `#vdi-romanize-btn`, `#vdi-play`, etc.) and aggressively apply `box-sizing: border-box !important`, `padding: 0 !important`, `margin: 0 !important`, `min-width: 0 !important` and `min-height: 0 !important`.

## 14. Tooltips and User Onboarding
**Dynamic Placement Pitfalls**: Tooltips pointing to specific elements (like the settings gear) must perfectly calculate offsets accounting for both the tooltip's width and the target element's internal padding. The arrow pointer uses `border` pseudo-elements. The gear icon is at `r.left + 10` and `r.top + 10`. To correctly place a 150px wide tooltip to the left of the gear, its left coordinate is `r.left - 146` (leaving a 4px overlap with the island edge). The arrow at `right: -6px` perfectly bridges the gap to `r.left + 10`.
**Visibility Timing**: Tooltips should not trigger instantly. Adding a `1200ms` hover delay prevents them from flashing when the user accidentally brushes past the Island.
**State Saving**: A "seen" boolean must be pushed to `chrome.storage.local` the exact millisecond the tooltip is rendered, not just when the user clicks a "Dismiss/Got it" button. Otherwise, moving the mouse away simply hides the tooltip without saving state, causing it to spam the user on every new tab.
**Visual Stability**: If a tooltip points to an auto-hiding element (like the gear icon which appears only on hover), the element's opacity MUST be forcibly pinned (`opacity: 1`) via inline styles while the tooltip is active so it doesn't look like it's pointing to empty space.

## 15. Spotify Scoping Bug (August 10, 2026)
**The Giant Playlist Button Bug**: On Spotify playlist pages, there is often a massive green "Smart Shuffle" or "Shuffle" play button at the very top of the page.
- *The Bug*: If you use a global `document.querySelector('button[aria-label*="shuffle" i]')` to find the shuffle button, it will find this giant playlist button instead of the actual small shuffle control in the bottom playbar!
- *The Consequence*: `getTabMediaState` will constantly read the text of the giant button (which physically says "Smart Shuffle") and falsely assume Smart Shuffle is always active (displaying the green star). Worse, `executeMediaAction` will programmatically `.click()` this giant button when the user taps Shuffle in the island. If the playlist is already playing, clicking the giant button often does absolutely nothing, making the island button feel completely dead.
- *The Fix*: ALL Spotify DOM queries in `core.js` (for both reading state and executing actions) MUST be strictly scoped to the playbar using `document.querySelector('[data-testid="player-controls"], .now-playing-bar')`. Never do a global `document.querySelector` for media controls on Spotify.

## 16. Spotify SVG Paths (Do Not Modify)
These are the exact, pixel-perfect paths directly from Spotify's Encore design system. Never "guess" or "hand-draw" these vectors, especially the `repeatOne` which uses a specific broken loop approach.

**Shuffle:**
```xml
<svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"></path><path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"></path></svg>
```
## 16. Spotify SVG Paths
For reference to prevent regressions, these are the exact pixel-perfect native Spotify control SVGs (viewBox="0 0 16 16"):
- **Shuffle**: `<path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75 13.15.922zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"></path><path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-1.77-2.109z"></path>`
- **Smart Shuffle**: `<path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75 13.15.922zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"></path><path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-1.77-2.109z"></path><path d="M7.155 1.941c.205-.839 1.485-.839 1.69 0l.458 1.868a1.2 1.2 0 0 0 .888.888l1.868.458c.839.205.839 1.485 0 1.69l-1.868.458a1.2 1.2 0 0 0-.888.888l-.458 1.868c-.205.839-1.485.839-1.69 0l-.458-1.868a1.2 1.2 0 0 0-.888-.888l-1.868-.458c-.839-.205-.839-1.485 0-1.69l1.868-.458a1.2 1.2 0 0 0 .888-.888l.458-1.868z"></path>`
- **Repeat**: `<path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75z"></path>`
- **Repeat One**: `<path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h.75v1.5h-.75A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75zM12.25 2.5a2.25 2.25 0 0 1 2.25 2.25v5A2.25 2.25 0 0 1 12.25 12H9.81l1.018-1.018a.75.75 0 0 0-1.06-1.06L6.939 12.75l2.829 2.828a.75.75 0 1 0 1.06-1.06L9.811 13.5h2.439A3.75 3.75 0 0 0 16 9.75v-5A3.75 3.75 0 0 0 12.25 1h-.75v1.5z"></path><path d="m8 1.85.77.694H6.095V1.488q1.046-.077 1.507-.385.474-.308.583-.913h1.32V8H8z"></path><path d="M8.77 2.544 8 1.85v.693z"></path>`

### 17. YouTube Music SVG Paths
For reference, these are the native YouTube Music SVGs (viewBox="0 0 24 24"), utilizing specific inner dots for active states:
- **Shuffle (Off)**: `<path d="M16.293 13.293a1 1 0 011.414 0L22.414 18l-4.707 4.707a1 1 0 01-1.414-1.413L18.586 19H17.21a7.001 7.001 0 01-5.824-3.117l-.186-.278 1.202-1.803.648.972A5.001 5.001 0 0017.21 17h1.375l-2.293-2.293a1 1 0 010-1.414Zm0-12a1 1 0 011.414 0L22.414 6l-4.707 4.707a1 1 0 01-1.414-1.414L18.586 7H17.21a5 5 0 00-4.16 2.227l-4.438 6.656A7 7 0 012.79 19H2a1 1 0 010-2h.79a5 5 0 004.16-2.226l4.437-6.656A7 7 0 0117.21 5h1.375l-2.293-2.292a1 1 0 010-1.415ZM2.79 5.001a7 7 0 015.823 3.117l.185.277-1.202 1.803-.647-.971A5 5 0 002.79 7H2a1 1 0 010-2h.79Z"></path>`
- **Shuffle (On)**: `<path d="M16.293 13.293a1 1 0 011.414 0L22.414 18l-4.707 4.707a1 1 0 01-1.414-1.413L18.586 19H17.21a7.001 7.001 0 01-5.824-3.117l-.186-.278 1.202-1.803.648.972A5.001 5.001 0 0017.21 17h1.375l-2.293-2.293a1 1 0 010-1.414Zm0-12a1 1 0 011.414 0L22.414 6l-4.707 4.707a1 1 0 01-1.414-1.414L18.586 7H17.21a5 5 0 00-4.16 2.227l-4.438 6.656A7 7 0 012.79 19H2a1 1 0 010-2h.79a5 5 0 004.16-2.226l4.437-6.656A7 7 0 0117.21 5h1.375l-2.293-2.292a1 1 0 010-1.415ZM3 10.001a2 2 0 110 4 2 2 0 010-4Zm-.21-5a7 7 0 015.823 3.117l.185.277-1.202 1.803-.647-.971A5 5 0 002.79 7H2a1 1 0 010-2h.79Z"></path>`
- **Repeat (Off)**: `<path d="M17.293 1.293a1 1 0 000 1.415L18.586 4H7a5 5 0 00-5 5v4a1 1 0 102 0V9a3 3 0 013-3h11.586l-1.293 1.293a1 1 0 001.414 1.415L22.414 5l-3.707-3.707a1 1 0 00-1.414 0ZM21 10a1 1 0 00-1 1v4a3 3 0 01-3 3H5.414l1.293-1.292a1.001 1.001 0 00-1.414-1.415L1.586 19l3.707 3.707a1 1 0 101.414-1.413L5.414 20H17a5 5 0 005-5v-4a1 1 0 00-1-1Z"></path>`
- **Repeat (All)**: `<path d="M21 10a1 1 0 011 1v4a5 5 0 01-5 5H5.414l1.293 1.293a1 1 0 11-1.414 1.414L1.586 19l3.707-3.707a1 1 0 111.414 1.414L5.414 18H17a3 3 0 003-3v-4a1 1 0 011-1Zm-3.707-8.707a1 1 0 011.414 0L22.414 5l-3.707 3.707a1 1 0 11-1.414-1.414L18.586 6H7a3 3 0 00-3 3v4a1 1 0 01-2 0V9a5 5 0 015-5h11.586l-1.293-1.293a1 1 0 010-1.414ZM12 10a2 2 0 110 4 2 2 0 010-4Z"></path>`
- **Repeat (One)**: `<path d="M17.293 1.293a1 1 0 000 1.415L18.586 4H7a5 5 0 00-5 5v4a1 1 0 102 0V9a3 3 0 013-3h11.586l-1.293 1.293a1 1 0 001.414 1.415L22.414 5l-3.707-3.707a1 1 0 00-1.414 0ZM13 15V8h-2.5a1 1 0 000 2h.5v5a1 1 0 002 0Zm8-5a1 1 0 00-1 1v4a3 3 0 01-3 3H5.414l1.293-1.292a1.001 1.001 0 00-1.414-1.415L1.586 19l3.707 3.707a1 1 0 101.414-1.413L5.414 20H17a5 5 0 005-5v-4a1 1 0 00-1-1Z"></path>`

### 18. Apple Music Native SVG Paths
These are the native paths extracted from Apple Music's Shadow DOM (viewBox="0 0 32 28").
Because the paths are drawn very small inside the large 32x28 canvas, the Island forces them to `width: 38px; height: 34px;` so they scale up to match the visual size of Spotify's 16x16 SVGs.
- **Shuffle**: `<path d="M20.767 20.44a.81.81 0 00.49-.183l2.58-2.174c.316-.266.316-.681 0-.955l-2.58-2.183a.81.81 0 00-.49-.183c-.415 0-.673.258-.673.673v1.245h-1.162c-.739 0-1.195-.233-1.718-.847l-1.527-1.801 1.527-1.81c.54-.63.946-.847 1.677-.847h1.203v1.279c0 .407.258.664.673.664a.801.801 0 00.49-.174l2.58-2.175c.316-.266.316-.69 0-.955l-2.58-2.183a.761.761 0 00-.49-.183c-.415 0-.673.258-.673.665v1.386h-1.212c-1.228 0-1.992.34-2.863 1.386l-1.412 1.668-1.469-1.751c-.805-.946-1.569-1.303-2.747-1.303H8.896c-.53 0-.896.348-.896.838s.365.838.896.838h1.437c.697 0 1.162.225 1.685.847l1.519 1.801-1.52 1.81c-.53.623-.954.847-1.643.847H8.896c-.53 0-.896.348-.896.838s.365.838.896.838h1.536c1.179 0 1.901-.356 2.706-1.303l1.478-1.751 1.444 1.718c.822.98 1.627 1.336 2.822 1.336h1.212v1.412c0 .415.258.672.673.672z"></path>`
- **Repeat (All)**: `<path d="M9.545 14.272a.856.856 0 00.863-.855v-.448c0-1.004.706-1.677 1.785-1.677h5.005v1.362c0 .407.258.664.673.664a.745.745 0 00.49-.183l2.581-2.166c.316-.266.316-.69 0-.955l-2.581-2.183a.745.745 0 00-.49-.183c-.415 0-.672.258-.672.665v1.294h-4.881c-2.217 0-3.628 1.254-3.628 3.213v.597c0 .474.382.855.855.855zm4.864 5.952c.407 0 .664-.257.664-.664v-1.303h4.881c2.225 0 3.628-1.254 3.628-3.213v-.597a.854.854 0 10-1.71 0v.448c0 1.004-.714 1.677-1.793 1.677h-5.006v-1.353c0-.407-.257-.664-.664-.664a.767.767 0 00-.498.182l-2.573 2.175c-.324.257-.315.68 0 .946l2.573 2.192a.807.807 0 00.498.174z" fill-rule="nonzero"></path>`
- **Repeat (One)**: `<path d="M22.752 12.313c.473 0 .747-.257.747-.771V8.503c0-.54-.357-.904-.888-.904-.44 0-.698.14-1.038.398l-.838.656c-.2.15-.266.299-.266.473 0 .257.19.465.498.465.133 0 .24-.042.349-.125l.614-.514h.058v2.59c0 .514.274.771.764.771zm-13.207 1.96a.84.84 0 00.863-.856v-.448c0-1.004.706-1.677 1.785-1.677h3.403v1.362c0 .407.258.664.673.664a.745.745 0 00.49-.183l2.581-2.166c.316-.266.316-.69 0-.955L16.76 7.831a.745.745 0 00-.49-.183c-.415 0-.673.258-.673.665v1.294h-3.278c-2.217 0-3.628 1.254-3.628 3.213v.597c0 .49.374.855.855.855zm4.864 5.951c.407 0 .664-.257.664-.664v-1.303h4.881c2.225 0 3.628-1.254 3.628-3.213v-.597a.838.838 0 00-.855-.855.833.833 0 00-.855.855v.448c0 1.004-.714 1.677-1.793 1.677h-5.006v-1.353c0-.407-.257-.664-.664-.664a.767.767 0 00-.498.182l-2.573 2.175c-.324.257-.315.68 0 .946l2.573 2.192a.807.807 0 00.498.174z" fill-rule="nonzero"></path>`

## 19. Full SVG Dictionary
Here is the exact, pristine `NATIVE_SVGS` block containing all the updated icons without any glitch artifacts:

```javascript
  var NATIVE_SVGS = {
    spotify: {
      shuffle: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"></path><path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"></path></svg>',
      smartShuffle: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.502 0a.637.637 0 0 1 .634.58 4.84 4.84 0 0 0 .81 2.184c.515.739 1.297 1.356 2.487 1.486a.637.637 0 0 1 0 1.267c-1.19.13-1.972.747-2.487 1.487a4.8 4.8 0 0 0-.81 2.185.637.637 0 0 1-1.268 0 4.8 4.8 0 0 0-.81-2.185C2.543 6.265 1.76 5.648.57 5.518a.637.637 0 0 1 0-1.268c1.19-.13 1.972-.747 2.487-1.486a4.84 4.84 0 0 0 .81-2.185A.637.637 0 0 1 4.502 0m4.765 11.878c.056.065.126.15.198.236l.33.397.013.015A3 3 0 0 0 12.1 13.59h1.009l-.444.443a.75.75 0 0 0 1.061 1.06l2.254-2.253-2.254-2.254a.75.75 0 0 0-1.06 1.06l.443.444H12.1a1.5 1.5 0 0 1-1.146-.533l-.004-.005-.333-.4-.288-.343-.031-.035-.02-.021-.037-.037-.974 1.16Z"></path><path class="vdi-sparkle" d="M12.69 4.196a.75.75 0 0 1 1.06 0l2.254 2.254-2.254 2.254a.75.75 0 0 1-1.06-1.06l.443-.444h-1.008a1.5 1.5 0 0 0-1.15.536l-4.63 5.517c-.344.411-.982 1.021-1.822 1.021v-1.5c.122 0 .371-.124.674-.485l4.63-5.517A3 3 0 0 1 12.125 5.7h1.008l-.443-.443a.75.75 0 0 1 0-1.061"></path></svg>',
      repeat: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75z"></path></svg>',
      repeatOne: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h.75v1.5h-.75A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75zM12.25 2.5a2.25 2.25 0 0 1 2.25 2.25v5A2.25 2.25 0 0 1 12.25 12H9.81l1.018-1.018a.75.75 0 0 0-1.06-1.06L6.939 12.75l2.829 2.828a.75.75 0 1 0 1.06-1.06L9.811 13.5h2.439A3.75 3.75 0 0 0 16 9.75v-5A3.75 3.75 0 0 0 12.25 1h-.75v1.5z"></path><path d="m8 1.85.77.694H6.095V1.488q1.046-.077 1.507-.385.474-.308.583-.913h1.32V8H8z"></path></svg>'
    },
    youtube: {
      shuffle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.293 13.293a1 1 0 011.414 0L22.414 18l-4.707 4.707a1 1 0 01-1.414-1.413L18.586 19H17.21a7.001 7.001 0 01-5.824-3.117l-.186-.278 1.202-1.803.648.972A5.001 5.001 0 0017.21 17h1.375l-2.293-2.293a1 1 0 010-1.414Zm0-12a1 1 0 011.414 0L22.414 6l-4.707 4.707a1 1 0 01-1.414-1.414L18.586 7H17.21a5 5 0 00-4.16 2.227l-4.438 6.656A7 7 0 012.79 19H2a1 1 0 010-2h.79a5 5 0 004.16-2.226l4.437-6.656A7 7 0 0117.21 5h1.375l-2.293-2.292a1 1 0 010-1.415ZM3 10.001a2 2 0 110 4 2 2 0 010-4Zm-.21-5a7 7 0 015.823 3.117l.185.277-1.202 1.803-.647-.971A5 5 0 002.79 7H2a1 1 0 010-2h.79Z"></path></svg>',
      shuffleOff: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.293 13.293a1 1 0 011.414 0L22.414 18l-4.707 4.707a1 1 0 01-1.414-1.413L18.586 19H17.21a7.001 7.001 0 01-5.824-3.117l-.186-.278 1.202-1.803.648.972A5.001 5.001 0 0017.21 17h1.375l-2.293-2.293a1 1 0 010-1.414Zm0-12a1 1 0 011.414 0L22.414 6l-4.707 4.707a1 1 0 01-1.414-1.414L18.586 7H17.21a5 5 0 00-4.16 2.227l-4.438 6.656A7 7 0 012.79 19H2a1 1 0 010-2h.79a5 5 0 004.16-2.226l4.437-6.656A7 7 0 0117.21 5h1.375l-2.293-2.292a1 1 0 010-1.415ZM2.79 5.001a7 7 0 015.823 3.117l.185.277-1.202 1.803-.647-.971A5 5 0 002.79 7H2a1 1 0 010-2h.79Z"></path></svg>',
      repeat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 10a1 1 0 011 1v4a5 5 0 01-5 5H5.414l1.293 1.293a1 1 0 11-1.414 1.414L1.586 19l3.707-3.707a1 1 0 111.414 1.414L5.414 18H17a3 3 0 003-3v-4a1 1 0 011-1Zm-3.707-8.707a1 1 0 011.414 0L22.414 5l-3.707 3.707a1 1 0 11-1.414-1.414L18.586 6H7a3 3 0 00-3 3v4a1 1 0 01-2 0V9a5 5 0 015-5h11.586l-1.293-1.293a1 1 0 010-1.414ZM12 10a2 2 0 110 4 2 2 0 010-4Z"></path></svg>',
      repeatOff: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.293 1.293a1 1 0 000 1.415L18.586 4H7a5 5 0 00-5 5v4a1 1 0 102 0V9a3 3 0 013-3h11.586l-1.293 1.293a1 1 0 001.414 1.415L22.414 5l-3.707-3.707a1 1 0 00-1.414 0ZM21 10a1 1 0 00-1 1v4a3 3 0 01-3 3H5.414l1.293-1.292a1.001 1.001 0 00-1.414-1.415L1.586 19l3.707 3.707a1 1 0 101.414-1.413L5.414 20H17a5 5 0 005-5v-4a1 1 0 00-1-1Z"></path></svg>',
      repeatOne: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.293 1.293a1 1 0 000 1.415L18.586 4H7a5 5 0 00-5 5v4a1 1 0 102 0V9a3 3 0 013-3h11.586l-1.293 1.293a1 1 0 001.414 1.415L22.414 5l-3.707-3.707a1 1 0 00-1.414 0ZM13 15V8h-2.5a1 1 0 000 2h.5v5a1 1 0 002 0Zm8-5a1 1 0 00-1 1v4a3 3 0 01-3 3H5.414l1.293-1.292a1.001 1.001 0 00-1.414-1.415L1.586 19l3.707 3.707a1 1 0 101.414-1.413L5.414 20H17a5 5 0 005-5v-4a1 1 0 00-1-1Z"></path></svg>'
    },
    apple: {
      shuffle: '<svg viewBox="0 0 32 28" fill="currentColor"><path d="M20.767 20.44a.81.81 0 00.49-.183l2.58-2.174c.316-.266.316-.681 0-.955l-2.58-2.183a.81.81 0 00-.49-.183c-.415 0-.673.258-.673.673v1.245h-1.162c-.739 0-1.195-.233-1.718-.847l-1.527-1.801 1.527-1.81c.54-.63.946-.847 1.677-.847h1.203v1.279c0 .407.258.664.673.664a.801.801 0 00.49-.174l2.58-2.175c.316-.266.316-.69 0-.955l-2.58-2.183a.761.761 0 00-.49-.183c-.415 0-.673.258-.673.665v1.386h-1.212c-1.228 0-1.992.34-2.863 1.386l-1.412 1.668-1.469-1.751c-.805-.946-1.569-1.303-2.747-1.303H8.896c-.53 0-.896.348-.896.838s.365.838.896.838h1.437c.697 0 1.162.225 1.685.847l1.519 1.801-1.52 1.81c-.53.623-.954.847-1.643.847H8.896c-.53 0-.896.348-.896.838s.365.838.896.838h1.536c1.179 0 1.901-.356 2.706-1.303l1.478-1.751 1.444 1.718c.822.98 1.627 1.336 2.822 1.336h1.212v1.412c0 .415.258.672.673.672z"></path></svg>',
      repeat: '<svg viewBox="0 0 32 28" fill="currentColor"><path d="M9.545 14.272a.856.856 0 00.863-.855v-.448c0-1.004.706-1.677 1.785-1.677h5.005v1.362c0 .407.258.664.673.664a.745.745 0 00.49-.183l2.581-2.166c.316-.266.316-.69 0-.955l-2.581-2.183a.745.745 0 00-.49-.183c-.415 0-.672.258-.672.665v1.294h-4.881c-2.217 0-3.628 1.254-3.628 3.213v.597c0 .474.382.855.855.855zm4.864 5.952c.407 0 .664-.257.664-.664v-1.303h4.881c2.225 0 3.628-1.254 3.628-3.213v-.597a.854.854 0 10-1.71 0v.448c0 1.004-.714 1.677-1.793 1.677h-5.006v-1.353c0-.407-.257-.664-.664-.664a.767.767 0 00-.498.182l-2.573 2.175c-.324.257-.315.68 0 .946l2.573 2.192a.807.807 0 00.498.174z" fill-rule="nonzero"></path></svg>',
      repeatOne: '<svg viewBox="0 0 32 28" fill="currentColor"><path d="M22.752 12.313c.473 0 .747-.257.747-.771V8.503c0-.54-.357-.904-.888-.904-.44 0-.698.14-1.038.398l-.838.656c-.2.15-.266.299-.266.473 0 .257.19.465.498.465.133 0 .24-.042.349-.125l.614-.514h.058v2.59c0 .514.274.771.764.771zm-13.207 1.96a.84.84 0 00.863-.856v-.448c0-1.004.706-1.677 1.785-1.677h3.403v1.362c0 .407.258.664.673.664a.745.745 0 00.49-.183l2.581-2.166c.316-.266.316-.69 0-.955L16.76 7.831a.745.745 0 00-.49-.183c-.415 0-.673.258-.673.665v1.294h-3.278c-2.217 0-3.628 1.254-3.628 3.213v.597c0 .49.374.855.855.855zm4.864 5.951c.407 0 .664-.257.664-.664v-1.303h4.881c2.225 0 3.628-1.254 3.628-3.213v-.597a.838.838 0 00-.855-.855.833.833 0 00-.855.855v.448c0 1.004-.714 1.677-1.793 1.677h-5.006v-1.353c0-.407-.257-.664-.664-.664a.767.767 0 00-.498.182l-2.573 2.175c-.324.257-.315.68 0 .946l2.573 2.192a.807.807 0 00.498.174z" fill-rule="nonzero"></path></svg>'
    },
    other: {
      shuffle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>',
      repeat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
      repeatOne: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4L13 15z"/></svg>'
    }
  };
```
