# Source Module Structure

The Glance codebase has been modularized for maintainability while remaining dependency-free for end users.

## Architecture

```
src/
  core.js           # Shared utilities: time formatting, color extraction, lyrics API
  styles.js         # CSS generation with configurability
  ui.js             # DOM creation and controller logic
  platform/
    vivaldi.js      # Vivaldi-specific: chrome.tabs/chrome.scripting directly
    chrome-ext.js   # Chrome Extension: content script + background worker communication
```

## Build Process

Run `node build.js` to generate the standalone files:

- `dynamic-island.js` — Vivaldi browser mod (injected into window.html)
- `chrome-extension/dynamic-island.js` — Content script for Chrome/Edge/Brave
- `chrome-extension/background.js` — Service worker for Chrome Extension

## Key Benefits

**Reduced duplication** — Color extraction, lyrics fetching, and media state logic are written once and shared across both versions.

**Cleaner CSS** — Styles are generated as structured rules instead of a 100-line inline string, making them easier to modify.

**Platform abstraction** — The Vivaldi and Chrome Extension versions use different APIs to accomplish the same tasks:
- Vivaldi: Direct `chrome.tabs` and `chrome.scripting` access from browser UI
- Chrome Extension: Message passing between content script and background worker

**Build-free for users** — The generated output files have zero dependencies. Users just load the extension/unzip the Vivaldi mod.

**Developer-friendly** — Contributors can modify source modules and run `node build.js`. No bundler, no config files, no `node_modules` required.

## Making Changes

1. Edit the relevant source file(s) in `src/`
2. Run `node build.js`
3. Copy the generated files to their destinations (or use the install scripts)

For CSS changes, edit `src/styles.js`. The `generate()` function takes an options object:
```js
VDI.Styles.generate({ islandTop: 54 });  // Vivaldi (in browser title bar)
VDI.Styles.generate({ islandTop: 10 });  // Chrome Extension (overlay on page)
```
