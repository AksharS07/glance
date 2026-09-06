# Glance Agent Guide (`agents.md`)

This document provides architectural context, engineering standards, development workflows, and operational boundaries for AI agents contributing to **Glance**.

---

## 1. Project Overview

### What is Glance?
**Glance** is an open-source, cross-browser extension (compatible with Chromium browsers such as Chrome, Edge, and Brave, as well as Firefox and Zen Browser, plus a legacy Vivaldi browser UI mod) that renders an Apple-style **Dynamic Island** media controller floating seamlessly on top of every webpage.

Glance functions as a universal media remote and heads-up display with deep player integrations:
- **Supported Media Platforms**: Spotify Web (`open.spotify.com`), Apple Music (`music.apple.com`), YouTube (`youtube.com`), and YouTube Music (`music.youtube.com`).
- **60FPS Progress & Extrapolation Engine**: Mathematical sub-second timer synchronization that eliminates rubber-banding, micro-stutter, and background tab throttling latency.
- **Time-Synced Lyrics & Romanization**: Fetches synced lyrics simultaneously from LRCLIB and LyricsPlus, rendering fluid word/line glow animations and on-the-fly Romanization for non-Latin scripts (Japanese, Korean, Chinese, etc.) via the Google Translate API.
- **Dynamic Color Extraction**: Extracts the most vibrant accent colors from album artwork using an HTML5 Canvas algorithm based on the Golden Ratio of color extraction ($\text{Score} = \sqrt{\text{Area}} \times \text{Chroma}^4$) to theme the island, ambient glow, and progress bars.
- **Universal Picture-in-Picture (PiP) Teleportation**: Bypasses browser user-gesture requirements across tabs by temporarily navigating to the media tab, triggering HTML5 PiP, and instantly returning the user to their origin tab.
- **Customizable In-Page Controls**: Glassmorphic settings panel, AMOLED black mode, draggable free placement with persistent coordinates, snap presets, quick playlists, and configurable global keyboard shortcuts.

### Core Tech Stack
- **Languages**: Vanilla JavaScript (strict mode, ES5/ES6 without heavy frameworks), HTML5, CSS3.
- **APIs & Sandboxing**: WebExtensions Manifest V3 (`chrome.runtime`, `chrome.tabs`, `chrome.scripting`, `chrome.storage.local`, `chrome.commands`), Firefox `window.wrappedJSObject`, HTML5 Canvas API, HTML5 Media Session & Picture-in-Picture APIs.
- **External Services**: LRCLIB & LyricsPlus (lyrics), iTunes Search API (high-resolution cover art), Google Translate API (batch romanization).
- **Build & Development Tooling**: Zero-bundler Node.js build pipeline (`build.js`) utilizing native Node.js APIs (`fs`, `path`, `child_process`) and optional minification via `terser`. Development dependencies also include `sharp` and `jsdom`.

---

## 2. Architecture & File Layout

The codebase separates concerns into pure source modules under `src/`, which are compiled into standalone browser bundles via `build.js`.

```text
glance/
├── src/                                  # AUTHORITATIVE SOURCE MODULES
│   ├── core.js                           # Shared utilities: media state detection, DOM scraping,
│   │                                     #   color extraction, lyrics APIs, romanization, PiP handlers
│   ├── styles.js                         # Dynamic CSS string generator (VDI.Styles.generate) with
│   │                                     #   host-page isolation and spring animations
│   ├── ui.js                             # DOM generation, 60fps controller loop, drag & drop,
│   │                                     #   lyrics rendering, and in-page settings panel
│   └── platform/                         # Platform-specific adapters
│       ├── chrome-ext.js                 # MV3 content script listener & background service worker
│       └── vivaldi.js                    # Direct chrome.tabs/chrome.scripting for Vivaldi browser UI
│
├── chrome-extension/                     # UNPACKED EXTENSION DIRECTORY
│   ├── manifest.json                     # MV3 Manifest (supports Chromium & Firefox/Zen)
│   ├── dynamic-island.js                 # COMPILED: Content script injected on all web pages
│   ├── background.js                     # COMPILED: Background worker polling active media tabs
│   ├── popup.html / popup.js / popup.css # Extension action popup (playlist shortcuts, toggles)
│   ├── welcome.html / welcome.js         # Interactive onboarding & feature showcase
│   ├── patch-notes.html / patch-notes.js # Version release notes & changelog UI
│   └── *.png                             # Extension icons and mock assets
│
├── vivaldi-scripts/                      # Legacy install/update shell scripts for Vivaldi mod
├── build.js                              # Zero-dependency build script (concatenates src/ -> bundles)
├── dynamic-island.js                     # COMPILED: Vivaldi browser-level mod bundle
├── DEVELOPER_NOTES.md                    # CRITICAL: Architectural invariants and historical bug fixes
├── bug_tracker.md                        # Active list of known bugs and resolved issues
├── BUILD_INSTRUCTIONS.md                 # Extension packaging guidelines
├── package.json / package-lock.json      # Node.js dependencies (terser, sharp, jsdom)
└── agents.md                             # Agent operating guide (this file)
```

### Types & Testing
- **Types**: There are no TypeScript types or schema compilers. The project relies on plain JavaScript objects with strict defensive programming, runtime type guards, and schema consistency documented in `DEVELOPER_NOTES.md`.
- **Tests**: The project does not currently use an automated testing framework (e.g., Jest, Vitest). Verification is performed via build validation (`node build.js`), local browser loading, and agentic UI verification using the `/browser` agent.

---

## 3. Agent Role & Persona

The agent acts as an **Expert Open-Source Contributor and Senior Browser Extension Engineer**.

### Key Mindsets & Behaviors:
1. **Precision & Modularity**: Focus on clean, modular additions. Prefer surgical bug fixes over broad, uncontrolled refactors.
2. **Platform & Sandbox Awareness**: Understand the strict constraints of browser extensions:
   - Manifest V3 execution contexts (`ISOLATED` vs `MAIN` world).
   - Strict Content Security Policies (CSP) on platforms like Apple Music and YouTube.
   - Cross-process IPC serialization and background service worker lifecycle.
3. **Respect for Invariants**: Always consult `DEVELOPER_NOTES.md` before touching media detection, timing synchronization, or CSS isolation logic. Many lines in `src/` exist specifically to prevent elusive platform bugs discovered in production.
4. **Clean Codebase Hygiene**: Maintain the existing vanilla architecture without introducing unsolicited external libraries, transpilers, or complex build tooling.

---

## 4. Development Workflow & Boundaries

### Git Worktrees & Branching Rules
- **ALWAYS use an isolated Git worktree (`New Worktree Mode` or `git worktree add`) when introducing new features.** Never implement new features or architectural experiments directly in the primary working tree or `master` branch.
- Bug fixes, documentation updates, or minor polish may be worked on directly in the active branch only when deemed low-risk and explicitly aligned with the user.

### Planning & Review Requirement
- **Before making significant file modifications or executing terminal commands, draft a brief implementation plan for user review.**
- The plan must clearly state:
  1. The target problem and files to be touched in `src/`.
  2. Potential regression risks across supported platforms (Chromium vs Firefox/Zen).
  3. The build and compilation steps required.
  4. Step-by-step verification procedure (local browser testing or `/browser` agent inspection).
- Wait for explicit user confirmation before executing major refactors or modifying shared contracts.

### Source vs. Compiled File Invariant
- **`src/` is the single source of truth.**
  - Never edit `chrome-extension/dynamic-island.js`, `chrome-extension/background.js`, or root `dynamic-island.js` directly.
  - Any direct edit to compiled files will be overwritten the next time `node build.js` runs.
  - Always make changes in `src/core.js`, `src/styles.js`, `src/ui.js`, or `src/platform/chrome-ext.js`, then run `node build.js` to compile.

### Critical Platform & Architecture Invariants (DO NOT BREAK)
1. **`sendAction` Parameter Signature**:
   - `src/ui.js` always calls `platform.sendAction(tabId, action, value)`.
   - `src/platform/chrome-ext.js` explicitly defines `sendAction(action, value)` because the background service worker automatically resolves the active media tab.
   - `build.js` dynamically generates the adapter wrapper that strips `tabId`. **Never change `chrome-ext.js` to accept `tabId`**, as doing so breaks all media controls.
2. **`world: 'MAIN'` Sandboxing**:
   - Manifest V3 blocks extension APIs (`chrome.runtime`) in the `MAIN` world.
   - **Never globally set `world: 'MAIN'` in `execInTab`**.
   - Pass `'MAIN'` **only** when polling media state that requires reading page-owned JS variables (e.g., YouTube Music's `movie_player`). Media actions and PiP triggers must remain in the `ISOLATED` world.
3. **Apple Music CSP & Repeat Cycle**:
   - Apple Music strictly blocks inline scripts and Blob URL injection. Use `window.wrappedJSObject` (Firefox) and Shadow DOM queries (`deepQueryOne`).
   - The native repeat cycle is `off (0) -> repeat all (2) -> repeat one (1) -> off (0)`. Do not use standard modulo `(mode + 1) % 3`.
   - Apple Music's JS setter (`m.repeatMode = ...`) is silently ignored by MusicKit; actions must click the native button via DOM click.
4. **Spotify Polling & Control Clicks**:
   - Always filter out background looping canvas videos (`duration < 30s`) to prevent the timer from locking to 8-second loops.
   - Never infer `play` or `pause` state when clicking the island play button. Always dispatch a blind `toggle` click with a 150ms debounce.
   - Always scope Spotify DOM queries to `[data-testid="player-controls"], .now-playing-bar` to avoid mistakenly clicking playlist headers.
5. **Localization-Agnostic State Detection**:
   - Never search for English tooltip strings like `"shuffle"` or `"repeat"` in YouTube Music or Spotify.
   - Use layout position (e.g., index 0 for Repeat, index 1 for Shuffle inside `.right-controls`) and exact SVG `<path d="...">` definitions.
6. **Host Page CSS Isolation**:
   - Always enforce `!important` on reset rules for `#vdi` and `.vdi-*` buttons to prevent host pages from breaking the island layout.
   - For runtime JavaScript positioning and dragging in `src/ui.js`, always use `element.style.setProperty('left', val, 'important')`. Standard assignment (`element.style.left = ...`) silently fails against `!important` stylesheets.
7. **Content Script Scope**:
   - Keep `<all_urls>` matching in `manifest.json`. Do not restrict to media domains; Glance must exist on regular tabs to control background audio.

---

## 5. Coding & Style Rules

### Syntax & Paradigms
- **Vanilla JavaScript**: Write standards-compliant, browser-compatible ES5/ES6 JavaScript. Run in strict mode (`'use strict';`).
- **Namespace Pattern**: Use the established `VDI` namespace pattern with IIFEs:
  ```javascript
  var VDI = VDI || {};
  VDI.MyModule = (function() {
    'use strict';
    // private declarations
    return {
      // public methods
    };
  })();
  ```
- **No Heavy Bundlers**: Do not introduce Webpack, Vite, Rollup, or TypeScript without explicit project-wide approval. Glance relies on transparent concatenation.

### Naming Conventions
- **Namespaces / Modules**: PascalCase (e.g., `VDI.Core`, `VDI.UI`, `VDI.Styles`, `VDI.Platform.ChromeExt`).
- **Functions & Variables**: camelCase (e.g., `formatTime`, `extractVibrant`, `getTabMediaState`, `isYouTubeVideo`).
- **Constants**: UPPER_SNAKE_CASE (e.g., `NATIVE_SVGS`, `ICONS`, `DEFAULTS`).
- **DOM IDs & Classes**: Prefixed with `vdi-` or `#vdi` (e.g., `#vdi`, `#vdi-col`, `.vdi-btn`, `.vdi-idle`, `#vdi-lyrics-panel`).

### Error Handling & Defensive Programming
- Always guard against missing DOM elements, null pointers, and unsupported APIs:
  ```javascript
  var el = document.querySelector('.some-element');
  if (!el) return null;
  ```
- Check `chrome.runtime.lastError` in every extension callback to suppress noisy, unhandled browser warnings:
  ```javascript
  chrome.tabs.sendMessage(tabId, message, function(response) {
    if (chrome.runtime.lastError) {
      // Gracefully suppress expected disconnected listener errors
    }
  });
  ```
- Wrap cross-tab script injections and fragile third-party scrapers in `try / catch` blocks.
- Fail closed to safe defaults: return `null`, `0`, or default fallback colors. Never allow a scraper failure on an external website to throw an unhandled exception that impacts the host page.
- Use `console.warn('[VDI] ...')` or `console.debug('[VDI] ...')` for diagnostic logging; never pollute production consoles with excessive spam.

---

## 6. Testing & Verification

Because Glance interacts directly with real browser tabs and audio players, verification combines compilation checks, manual browser tests, and browser automation.

### 1. Build Verification
Always run the build script after modifying any files in `src/`:
```bash
node build.js
```
A successful build will:
1. Concatenate `src/` modules into `dynamic-island.js`.
2. Concatenate `src/` modules into `chrome-extension/dynamic-island.js`.
3. Concatenate `src/` modules into `chrome-extension/background.js`.
4. Package release ZIP archives for Firefox and Chromium.
5. Restore the development `chrome-extension/manifest.json`.

Check `git status` or `git diff` to ensure only intended files were modified and no temporary build artifacts leaked.

### 2. Local Manual Testing
- **Chromium Browsers (Chrome, Edge, Brave)**:
  1. Navigate to `chrome://extensions` or `edge://extensions`.
  2. Enable **Developer mode**.
  3. Click **Load unpacked** and select the `chrome-extension/` directory.
  4. Test media playback on Spotify Web, YouTube, or Apple Music in one tab, and verify the island appears and controls playback on a different tab (e.g., GitHub or Wikipedia).
- **Firefox / Zen Browser**:
  1. Navigate to `about:debugging#/runtime/this-firefox`.
  2. Click **Load Temporary Add-on...** and select `chrome-extension/manifest.json`.
  3. Confirm that `window.wrappedJSObject` hooks function properly on Apple Music.

### 3. Using the `/browser` Agent
When verifying frontend, styling, or layout changes, leverage the `/browser` tool:
- **Test Local Pages**: Navigate to extension pages such as `chrome-extension/welcome.html` or `chrome-extension/patch-notes.html`.
- **Visual Inspection**:
  - Verify that `#vdi` renders at the top center with appropriate glassmorphic shadows and borders.
  - Check that the idle state collapses into a compact dot/pill and expands smoothly on hover without layout jumping.
  - Verify that the settings panel scales appropriately on smaller viewports and does not overflow offscreen.
  - Confirm that dragging moves the island cleanly and coordinates persist correctly across reloads.
  - Check developer console logs for any `[VDI]` errors or uncaught promises.
- **Host Page CSS Leak Tests**: Load test pages with aggressive global CSS resets (e.g., `* { box-sizing: content-box; margin: 20px; }`) and verify that the island retains its exact geometric dimensions and button alignment.