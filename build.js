#!/usr/bin/env node
/**
 * Dynamic Island Build Script
 * Concatenates source modules into standalone browser files
 *
 * Usage: node build.js
 *
 * Outputs:
 *   - dynamic-island.js (Vivaldi mod)
 *   - chrome-extension/dynamic-island.js (Chrome Extension content script)
 *   - chrome-extension/background.js (Chrome Extension background worker)
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const DEST_VIVALDI = path.join(__dirname, 'dynamic-island.js');
const DEST_CHROME_CONTENT = path.join(__dirname, 'chrome-extension', 'dynamic-island.js');
const DEST_CHROME_BG = path.join(__dirname, 'chrome-extension', 'background.js');

function readFile(filename) {
  return fs.readFileSync(path.join(SRC_DIR, filename), 'utf8');
}

function wrapWithIIFE(code) {
  // Pass through so modules share the same scope
  return code;
}

function buildVivaldi() {
  console.log('Building Vivaldi version...');

  const parts = [
    wrapWithIIFE(readFile('core.js')),
    wrapWithIIFE(readFile('styles.js')),
    wrapWithIIFE(readFile(path.join('platform', 'vivaldi.js'))),
    wrapWithIIFE(readFile('ui.js')),
    `
(function() {
  'use strict';

  // Guard: only run once
  if (document.getElementById('vdi')) return;

  // Inject CSS
  var css = document.createElement('style');
  css.id = 'vdi-css';
  css.textContent = VDI.Styles.generate({ islandTop: 54 });
  document.head.appendChild(css);

  // Create UI
  var island = VDI.UI.createIsland();
  var lyrPanel = VDI.UI.createLyricsPanel();
  var stgPanel = VDI.UI.createSettingsPanel();
  var stgTooltip = VDI.UI.createSettingsTooltip();
  document.body.appendChild(island);
  document.body.appendChild(lyrPanel);
  document.body.appendChild(stgPanel);
  document.body.appendChild(stgTooltip);

  // Platform adapter
  var platform = {
    sendAction: function(tabId, action, value) {
      var onUpdate = poll;
      VDI.Platform.Vivaldi.sendAction(tabId, action, value, onUpdate);
    },
    jumpToTab: VDI.Platform.Vivaldi.jumpToTab,
    requestPiP: VDI.Platform.Vivaldi.requestPiP
  };

  // Create controller
  var ctrl = VDI.UI.createController(island, lyrPanel, stgPanel, platform, {
    isVivaldi: true,
    tickInterval: 1000,
    idleDelay: 9000,
    collapseDelay: 500
  });

  ctrl.init();

  function scheduleNextPoll() {
    var state = ctrl.getState();
    var delay = 3000;
    if (state.hasMedia) {
      delay = state.isPlaying ? 1000 : 2000;
    }
    pollTimer = setTimeout(poll, delay);
  }

  function poll() {
    VDI.Platform.Vivaldi.pollMedia(function(tab) {
      var state = ctrl.getState();

      if (!tab) {
        if (state.tabId !== null) {
          VDI.Platform.Vivaldi.getMediaStateFromTab(state.tabId, function(res) {
            if (!res) {
              ctrl.setState({ hasMedia: false });
            } else {
              ctrl.setState({
                isPlaying: res.isPlaying,
                position: res.position,
                duration: res.duration,
                hasMedia: res.hasMedia
              });
            }
            scheduleNextPoll();
          });
        } else {
          if (state.hasMedia) ctrl.setState({ hasMedia: false });
          scheduleNextPoll();
        }
        return;
      }

      state.tabId = tab.id;
      state.windowId = tab.windowId;

      VDI.Platform.Vivaldi.getMediaStateFromTab(tab.id, function(res) {
        if (!res) {
          ctrl.setState({ hasMedia: true, tabId: tab.id, windowId: tab.windowId });
        } else {
          ctrl.setState({
            hasMedia: res.hasMedia || true,
            isPlaying: res.isPlaying,
            title: res.title || tab.title || '',
            artist: res.artist || '',
            artwork: res.artwork,
            duration: res.duration || 0,
            position: res.position || 0,
            supportsPiP: res.pipOk || false,
            isYouTubeVideo: res.isYouTubeVideo || false,
            isMusicApp: res.isMusicApp || false,
            isFullscreen: res.isFullscreen || false,
            shuffleOn: res.shuffleOn || false,
            smartShuffleOn: res.smartShuffleOn || false,
            repeatMode: res.repeatMode || 'off',
            platform: res.platform || 'other',
            shufSvg: res.shufSvg || null,
            repSvg: res.repSvg || null,
            tabId: tab.id,
            windowId: tab.windowId
          });
        }
        scheduleNextPoll();
      });
    });
  }

  poll();

  console.log('[Vivaldi Dynamic Island] Loaded OK');
})();
`
  ];

  const output = parts.join('\n\n');
  fs.writeFileSync(DEST_VIVALDI, output, 'utf8');
  console.log('  -> ' + DEST_VIVALDI);
}

function buildChromeContent() {
  console.log('Building Chrome Extension content script...');

  const parts = [
    wrapWithIIFE(readFile('core.js')),
    wrapWithIIFE(readFile('styles.js')),
    wrapWithIIFE(readFile(path.join('platform', 'chrome-ext.js'))),
    wrapWithIIFE(readFile('ui.js')),
    `
(function() {
  'use strict';

  // Guard: only run once
  if (document.getElementById('vdi')) return;

  // Inject CSS
  var css = document.createElement('style');
  css.id = 'vdi-css';
  css.textContent = VDI.Styles.generate({ islandTop: 10 });
  document.head.appendChild(css);

  // Create UI
  var island = VDI.UI.createIsland();
  var lyrPanel = VDI.UI.createLyricsPanel();
  var stgPanel = VDI.UI.createSettingsPanel();
  var stgTooltip = VDI.UI.createSettingsTooltip();
  document.body.appendChild(island);
  document.body.appendChild(lyrPanel);
  document.body.appendChild(stgPanel);
  document.body.appendChild(stgTooltip);

  // Platform adapter (Chrome Extension)
  var platform = {
    sendAction: function(tabId, action, value) {
      VDI.Platform.ChromeExt.sendAction(action, value);
    },
    jumpToTab: VDI.Platform.ChromeExt.jumpToTab,
    requestPiP: VDI.Platform.ChromeExt.requestPiP
  };

  // Create controller
  var ctrl = VDI.UI.createController(island, lyrPanel, stgPanel, platform, {
    isVivaldi: false,
    tickInterval: 1000,
    idleDelay: 9000,
    collapseDelay: 500
  });

  ctrl.init();

  // Listen for state updates from background
  VDI.Platform.ChromeExt.onStateUpdate(function(newState) {
    ctrl.setState(newState);
  });

  // Request initial state
  VDI.Platform.ChromeExt.requestState(function(state) {
    if (state) {
      ctrl.setState(state);
    }
  });

})();
`
  ];

  const output = parts.join('\n\n');
  fs.writeFileSync(DEST_CHROME_CONTENT, output, 'utf8');
  console.log('  -> ' + DEST_CHROME_CONTENT);
}

function buildChromeBackground() {
  console.log('Building Chrome Extension background script...');

  const parts = [
    wrapWithIIFE(readFile('core.js')),
    wrapWithIIFE(readFile(path.join('platform', 'chrome-ext.js'))),
    `
(function() {
  'use strict';

  var worker = VDI.Platform.ChromeExt.createBackgroundWorker();
  worker.start();

})();
`
  ];

  const output = parts.join('\n\n');
  fs.writeFileSync(DEST_CHROME_BG, output, 'utf8');
  console.log('  -> ' + DEST_CHROME_BG);
}

const { execSync } = require('child_process');

function buildZip() {
  console.log('Building Extension ZIP...');
  const extDir = path.join(__dirname, 'chrome-extension');
  const zipPath = path.join(__dirname, 'dynamic-island-extension-v1.6.zip');
  
  try {
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    
    // Windows
    if (process.platform === 'win32') {
      execSync(`powershell.exe -NoProfile -Command "Compress-Archive -Path '${extDir}\\*' -DestinationPath '${zipPath}' -Force"`);
    } else {
      // Mac/Linux
      execSync(`cd "${extDir}" && zip -r "${zipPath}" ./*`);
    }
    console.log('  -> ' + zipPath);
  } catch (e) {
    console.error('Failed to build ZIP:', e.message);
  }
}

// Run builds
console.log('Dynamic Island Build');
console.log('====================\n');

buildVivaldi();
buildChromeContent();
buildChromeBackground();

console.log('Minifying files using terser...');
try {
  // execSync('npx terser dynamic-island.js -c -m -o dynamic-island.js', { cwd: __dirname });
  execSync('npx terser chrome-extension/dynamic-island.js -c -m -o chrome-extension/dynamic-island.js', { cwd: __dirname });
  execSync('npx terser chrome-extension/background.js -c -m -o chrome-extension/background.js', { cwd: __dirname });
  console.log('  -> Minification successful!');
} catch (e) {
  console.error('  -> Minification failed. Proceeding without minification.', e.message);
}

buildZip();

console.log('\nBuild complete!');
