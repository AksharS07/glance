# Known Bugs & Planned Fixes

> **IMPORTANT FOR AI AGENTS:** Read `DEVELOPER_NOTES.md` before making ANY changes.
> The popup (`popup.html`/`popup.js`) and the content script (`ui.js`) communicate
> via `chrome.storage.local`. The in-page settings panel works by directly modifying
> the `settings` object in memory + calling `updateUI()`. The popup relies on the
> `chrome.storage.onChanged` listener in `ui.js` (lines ~1326-1336).

---

## 🟡 OPEN BUGS (Sorted by Severity)



### 4. Island UI gets weird (missing icons in media controls / Play button solid color)
- **Severity:** LOW (Visual/Cosmetic)
- **Description:** The media control buttons (including play/pause, previous, next, like) sometimes render as dark or solid accent-colored circles with their inner icons completely missing or displaying incorrectly (e.g., as a tiny dot).
- **Likely cause:** SVG `fill="currentColor"` inherits the accent color, but the button background is also set to the accent color, making the icon invisible. Or the SVG viewBox/path is rendering incorrectly.
- **Where to fix:** `src/styles.js` (check `.vdi-btn` and `#vdi-play` CSS rules) and `src/ui.js` (check button HTML construction and `setPlayIcon()` function).

### 5. Uncaught (in promise) Error: No tab with id
- **Severity:** LOW (Silent background error)
- **Description:** `Uncaught (in promise) Error: No tab with id: <id>` appears in the `background.js` console (observed in Edge on Windows).
- **Root cause:** The background interval keeps a reference to the active tab's ID. When a tab is closed or discarded, the 1-second interval (`setInterval`) tries to send a message to a tab that no longer exists.
- **Where to fix:** `chrome-extension/background.js` — inside `createBackgroundWorker()` where `setInterval(a, 1e3)` logic runs. Wrap the message/script execution in a try-catch or verify the tab exists before interacting.

### 6. 'background.scripts' manifest warning in Edge (WONTFIX)
- **Severity:** LOW (Configuration Warning)
- **Description:** Edge throws an error: `'background.scripts' requires manifest version of 2 or lower`.
- **Root cause:** The extension uses Manifest V3 (`"manifest_version": 3`) but includes both `service_worker` and `scripts` arrays under `"background"`.
- **Why we can't fix it:** Chrome strictly requires `service_worker` for MV3. Firefox strictly requires `scripts` for MV3 (as it uses Event Pages instead of true service workers). To maintain a single cross-platform `manifest.json`, we MUST include both. We have to accept the warning in Chromium to prevent a fatal crash in Firefox.

### 7. Apple Music Shuffle/Repeat Visual Effects Missing in Chromium (Edge)
- **Severity:** LOW (UI State Desync)
- **Description:** In Edge (and likely other Chromium browsers), Apple Music doesn't show the visual effects (active highlight state) when toggling the shuffle and repeat buttons on the island. However, it works fine in Firefox-based browsers (like Zen).
- **Root cause:** Apple Music's native UI styles differ by browser engine. In Firefox, active buttons turn red. In Edge/Chromium, active buttons turn white. The state parsing logic in `getAppleMusicMediaState()` likely relies on color values or classes that only match the Firefox styling.
- **Where to fix:** `chrome-extension/background.js` (the `getAppleMusicMediaState` function in `VDI.Core`, specifically the color/class parsing logic for `shuffleOn` and `repeatMode`).

### 8. Font inconsistency across operating systems
- **Severity:** LOW (Visual/Cosmetic)
- **Description:** Fonts look inconsistent, especially on Ubuntu/Linux where the default system font differs from Windows/Mac.
- **Where to fix:** `src/styles.js` — add a cross-platform system font stack to the `#vdi` root CSS rules:
  ```css
  #vdi, #vdi * {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;
  }
  ```

### 9. Spotify Smart Shuffle vs Shuffle visual distinction is too subtle
- **Severity:** LOW (Visual/UX)
- **Description:** The visual distinction between the "Shuffle" icon and "Smart Shuffle" icon (with the tiny star/sparkle) is extremely hard to recognize.
- **Root cause:** The sparkle element added to the shuffle SVG is likely too small, has too low opacity, or its color blends in too much.
- **Where to fix:** `src/ui.js` (SVG paths for smart shuffle) and `src/styles.js` (styling/opacity for the smart shuffle sparkle).

### 10. Island collapses into a weird circle on long press
- **Severity:** Visual / Interaction
- **Description:** When the island is open and the user holds down the mouse button to keep it open, after a few seconds it visually breaks and turns into a small, weird black circle. 
- **Notes:** Could be a timeout/state issue where the island attempts to collapse but the long press interrupts the animation, or a CSS width/height transition glitch when held.
- **User Report:** "when the island is open and i hold my mouse button to keep it open...after few seconds it turns into a weird circle"

### 11. Timer logic broken in Apple Music on Edge
- **Severity:** MEDIUM (Functional/Syncing)
- **Description:** The playback timer/progress logic for Apple Music is broken when tested in Chromium browsers like Edge (Windows), but works flawlessly in Firefox (including seamless lyrics syncing).
- **Root cause:** Similar to the shuffle/repeat bug, `getAppleMusicMediaState()` may be relying on DOM elements or JS context variables that differ between Edge and Firefox for Apple Music. The fact that it works perfectly in Firefox confirms the core logic is sound, it's just the DOM/property extraction in Chromium that is failing.
- **Where to fix:** `chrome-extension/background.js` (`getAppleMusicMediaState` function, specifically the time extraction logic).

### 12. YouTube Music lyrics lag (1-2 sec)
- **Severity:** MEDIUM (Functional/Syncing)
- **Description:** There is a visible lag (1-2 seconds) when viewing lyrics for YouTube Music. This happens in both Firefox and Edge (tested on Windows).
- **Root cause:** Similar to the Spotify playback delay, the 1-second polling interval in the background script or the latency of `chrome.tabs.sendMessage` / `chrome.scripting.executeScript` might be introducing too much lag between the actual DOM time and the island UI time.
- **Where to fix:** `chrome-extension/background.js` (polling interval logic) or `VDI.Core.getTabMediaState()` for YouTube Music specifically.

### 13. Island position shifts when teleporting back and forth
- **Severity:** MEDIUM (Functional/UX)
- **Description:** When teleporting to the media tab and navigating back and forth, the island shifts its position. Tested on Zen Browser in PopOS! (Linux).
- **Root cause:** Likely an issue with how the island's X/Y coordinates (`vdi_loc_x`, `vdi_loc_y`) are being stored, retrieved, or applied upon initialization on a newly focused/teleported tab. The coordinates might be lost, calculated relative to the wrong viewport, or not synced fast enough between `ui.js` and `chrome.storage.local`.
- **Where to fix:** `src/ui.js` (position restoration logic around `applyPos()`, `chrome.storage.local.get` in init, and teleport event handling).
- **User Report:** "when i teleport to the media tab...the island shifts its position when i go back and forth...theres some issue with storing the coordinates i feel (12 august) tested only on zen browser in PopOS! aka linux"

---

## ✅ FIXED (pushed August 6, 2026)

1. **Popup version string outdated**: Updated to v1.5 in `popup.html`.
2. **Popup toggles not working**: Fixed key naming mismatch (removed `vdi_cfg_` prefix) in `src/ui.js`.
3. **Missing Spotify/Apple Music toggles**: Added hide toggles to `popup.html` and `popup.js`.
4. **Preset buttons not moving island**: Synced position storage keys (`vdi_loc_x` / `vdi_loc_y`) between popup and content scripts.
5. **Keyboard shortcuts unusable in Windows**: Fixed by using global media keys as default shortcuts and adding a cross-browser shortcut settings button. *(Note: yet to test in Chromium based browsers)*.
6. **Spotify playback/lyrics delay and seek unreliability**: Replaced CSS-based progress parsing with a precise `MutationObserver` on the playback-position DOM element in `core.js` and removed complex action queues for play/pause in favor of a blind toggle with 150ms debounce.
7. **Island elements get squished/elongated/oval**: Added !important flags to container styles and buttons in `src/styles.js` to prevent host page CSS bleed.
