/**
 * Dynamic Island - Shared UI Component
 * Manages the DOM, interactions, and visual updates
 */

var VDI = VDI || {};

VDI.UI = (function() {
  'use strict';

  // URL lockdown moved to core.js media detection — island must render on ALL tabs
  // so users can control music from any page

  var DEFAULTS = VDI.Styles.DEFAULTS;

  var NATIVE_SVGS = {
    spotify: {
      shuffle: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"></path><path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"></path></svg>',
      smartShuffle: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.502 0a.637.637 0 0 1 .634.58 4.84 4.84 0 0 0 .81 2.184c.515.739 1.297 1.356 2.487 1.486a.637.637 0 0 1 0 1.267c-1.19.13-1.972.747-2.487 1.487a4.8 4.8 0 0 0-.81 2.185.637.637 0 0 1-1.268 0 4.8 4.8 0 0 0-.81-2.185C2.543 6.265 1.76 5.648.57 5.518a.637.637 0 0 1 0-1.268c1.19-.13 1.972-.747 2.487-1.486a4.84 4.84 0 0 0 .81-2.185A.637.637 0 0 1 4.502 0m4.765 11.878c.056.065.126.15.198.236l.33.397.013.015A3 3 0 0 0 12.1 13.59h1.009l-.444.443a.75.75 0 0 0 1.061 1.06l2.254-2.253-2.254-2.254a.75.75 0 0 0-1.06 1.06l.443.444H12.1a1.5 1.5 0 0 1-1.146-.533l-.004-.005-.333-.4-.288-.343-.031-.035-.02-.021-.037-.037-.974 1.16Z"></path><path class="vdi-sparkle" d="M12.69 4.196a.75.75 0 0 1 1.06 0l2.254 2.254-2.254 2.254a.75.75 0 0 1-1.06-1.06l.443-.444h-1.008a1.5 1.5 0 0 0-1.15.536l-4.63 5.517c-.344.411-.982 1.021-1.822 1.021v-1.5c.122 0 .371-.124.674-.485l4.63-5.517A3 3 0 0 1 12.125 5.7h1.008l-.443-.443a.75.75 0 0 1 0-1.061"></path></svg>',
      repeat: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75z"></path></svg>',
      repeatOne: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h.75v1.5h-.75A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75zM12.25 2.5a2.25 2.25 0 0 1 2.25 2.25v5A2.25 2.25 0 0 1 12.25 12H9.81l1.018-1.018a.75.75 0 0 0-1.06-1.06L6.939 12.75l2.829 2.828a.75.75 0 1 0 1.06-1.06L9.811 13.5h2.439A3.75 3.75 0 0 0 16 9.75v-5A3.75 3.75 0 0 0 12.25 1h-.75v1.5z"></path><path d="m8 1.85.77.694H6.095V1.488q1.046-.077 1.507-.385.474-.308.583-.913h1.32V8H8z"></path><path d="M8.77 2.544 8 1.85v.693z"></path></svg>'
    },
    youtube: {
      shuffle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.293 13.293a1 1 0 011.414 0L22.414 18l-4.707 4.707a1 1 0 01-1.414-1.413L18.586 19H17.21a7.001 7.001 0 01-5.824-3.117l-.186-.278 1.202-1.803.648.972A5.001 5.001 0 0017.21 17h1.375l-2.293-2.293a1 1 0 010-1.414Zm0-12a1 1 0 011.414 0L22.414 6l-4.707 4.707a1 1 0 01-1.414-1.414L18.586 7H17.21a5 5 0 00-4.16 2.227l-4.438 6.656A7 7 0 012.79 19H2a1 1 0 010-2h.79a5 5 0 004.16-2.226l4.437-6.656A7 7 0 0117.21 5h1.375l-2.293-2.292a1 1 0 010-1.415ZM3 10.001a2 2 0 110 4 2 2 0 010-4Zm-.21-5a7 7 0 015.823 3.117l.185.277-1.202 1.803-.647-.971A5 5 0 002.79 7H2a1 1 0 010-2h.79Z"></path></svg>',
      shuffleOff: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.293 13.293a1 1 0 011.414 0L22.414 18l-4.707 4.707a1 1 0 01-1.414-1.413L18.586 19H17.21a7.001 7.001 0 01-5.824-3.117l-.186-.278 1.202-1.803.648.972A5.001 5.001 0 0017.21 17h1.375l-2.293-2.293a1 1 0 010-1.414Zm0-12a1 1 0 011.414 0L22.414 6l-4.707 4.707a1 1 0 01-1.414-1.414L18.586 7H17.21a5 5 0 00-4.16 2.227l-4.438 6.656A7 7 0 012.79 19H2a1 1 0 010-2h.79a5 5 0 004.16-2.226l4.437-6.656A7 7 0 0117.21 5h1.375l-2.293-2.292a1 1 0 010-1.415ZM2.79 5.001a7 7 0 015.823 3.117l.185.277-1.202 1.803-.647-.971A5 5 0 002.79 7H2a1 1 0 010-2h.79Z"></path></svg>',
      repeat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 10a1 1 0 011 1v4a5 5 0 01-5 5H5.414l1.293 1.293a1 1 0 11-1.414 1.414L1.586 19l3.707-3.707a1 1 0 111.414 1.414L5.414 18H17a3 3 0 003-3v-4a1 1 0 011-1Zm-3.707-8.707a1 1 0 011.414 0L22.414 5l-3.707 3.707a1 1 0 11-1.414-1.414L18.586 6H7a3 3 0 00-3 3v4a1 1 0 01-2 0V9a5 5 0 015-5h11.586l-1.293-1.293a1 1 0 010-1.414ZM12 10a2 2 0 110 4 2 2 0 010-4Z"></path></svg>',
      repeatOff: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.293 1.293a1 1 0 000 1.415L18.586 4H7a5 5 0 00-5 5v4a1 1 0 102 0V9a3 3 0 013-3h11.586l-1.293 1.293a1 1 0 001.414 1.415L22.414 5l-3.707-3.707a1 1 0 00-1.414 0ZM21 10a1 1 0 00-1 1v4a3 3 0 01-3 3H5.414l1.293-1.292a1.001 1.001 0 00-1.414-1.415L1.586 19l3.707 3.707a1 1 0 101.414-1.413L5.414 20H17a5 5 0 005-5v-4a1 1 0 00-1-1Z"></path></svg>',
      repeatOne: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.293 1.293a1 1 0 000 1.415L18.586 4H7a5 5 0 00-5 5v4a1 1 0 102 0V9a3 3 0 013-3h11.586l-1.293 1.293a1 1 0 001.414 1.415L22.414 5l-3.707-3.707a1 1 0 00-1.414 0ZM13 15V8h-2.5a1 1 0 000 2h.5v5a1 1 0 002 0Zm8-5a1 1 0 00-1 1v4a3 3 0 01-3 3H5.414l1.293-1.292a1.001 1.001 0 00-1.414-1.415L1.586 19l3.707 3.707a1 1 0 101.414-1.413L5.414 20H17a5 5 0 005-5v-4a1 1 0 00-1-1Z"></path></svg>'
    },
    apple: {
      shuffle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>',
      repeat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
      repeatOne: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4L13 15z"/></svg>'
    },
    other: {
      shuffle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>',
      repeat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
      repeatOne: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4L13 15z"/></svg>'
    }
  };

  function createIsland(opts) {
    opts = opts || {};

    var island = document.createElement('div');
    island.id = 'vdi';

    island.innerHTML =
      '<div id="vdi-col">' +
        '<div id="vdi-eq">' +
          '<div class="vdi-eq-bar b1"></div>' +
          '<div class="vdi-eq-bar b2"></div>' +
          '<div class="vdi-eq-bar b3"></div>' +
        '</div>' +
        '<div id="vdi-col-text"><span id="vdi-col-inner">No media</span></div>' +
        '<div id="vdi-col-btn"><svg id="vdi-col-icon" viewBox="0 0 24 24" fill="white" width="10" height="10">' + VDI.Core.getPlayIcon(false) + '</svg></div>' +
      '</div>' +
      '<div id="vdi-exp">' +
        '<div id="vdi-settings-btn" title="Settings">' +
          '<svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"></path></svg>' +
        '</div>' +
        '<button id="vdi-close-btn" title="Hide Island" style="position:absolute; top:12px; right:12px; z-index:100; background:rgba(255,255,255,0.1); border:none; border-radius:50%; width:24px; height:24px; color:rgba(255,255,255,0.6); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
        '</button>' +
        '<button id="vdi-teleport-btn" title="Jump to Media Tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg></button>' +
        '<div id="vdi-art">' +
          '<div id="vdi-art-ph">\uD83C\uDFB5</div>' +
          '<img id="vdi-art-img" src="" alt="" crossorigin="anonymous"/>' +
        '</div>' +
        '<div id="vdi-track">' +
          '<div id="vdi-title-row">' +
            '<div id="vdi-title">No media</div>' +
          '</div>' +
          '<div id="vdi-artist">Open a media tab</div>' +
          '<div id="vdi-prog-row">' +
            '<span class="vdi-t" id="vdi-pos">0:00</span>' +
            '<div id="vdi-prog"><div id="vdi-prog-fill"></div></div>' +
            '<span class="vdi-t" id="vdi-dur" style="text-align:right">0:00</span>' +
          '</div>' +
          '<div id="vdi-ctrl-row">' +
            '<div id="vdi-ctrl-main">' +
              '<button class="vdi-btn" id="vdi-shuffle" title="Shuffle" style="display:none;"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg></button>' +
              '<button class="vdi-btn" id="vdi-prev" title="Previous"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>' +
              '<button class="vdi-btn" id="vdi-play" title="Play/Pause"><svg id="vdi-pp" viewBox="0 0 24 24" fill="currentColor">' + VDI.Core.getPlayIcon(false) + '</svg></button>' +
              '<button class="vdi-btn" id="vdi-next" title="Next"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>' +
              '<button class="vdi-btn" id="vdi-repeat" title="Repeat" style="display:none;"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg></button>' +
            '</div>' +
            '<div id="vdi-ctrl-extra">' +
              '<button class="vdi-icon-btn" id="vdi-lyr-btn" title="Lyrics">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>' +
              '</button>' +
              '<button class="vdi-icon-btn" id="vdi-pip-main-btn" title="Picture-in-Picture" style="display:none;">' +
                '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 7H9c-1.1 0-2 .9-2 2v3H5v3h2v3c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 10H9v-3h4v-3h6v6z"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    return island;
  }

  function createSettingsPanel(opts) {
    opts = opts || {};
    var panel = document.createElement('div');
    panel.id = 'vdi-settings-panel';
    panel.innerHTML =
      '<div class="vdi-stg-header">General</div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Hide on YouTube</span><span class="vdi-stg-sub">Hides the island completely while on YouTube</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-hideyt"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Hide on YT Music</span><span class="vdi-stg-sub">Hides the island completely while on YT Music</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-hideytm"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Hide on Spotify</span><span class="vdi-stg-sub">Hides the island completely while on Spotify</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-hidespotify"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Hide on Apple Music</span><span class="vdi-stg-sub">Hides the island completely on Apple Music</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-hideapplemusic"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-header" style="margin-top:8px;">Features</div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">AMOLED Black Mode <span class="vdi-new-tag">NEW</span></span><span class="vdi-stg-sub">Use pure pitch black background for the island instead of matching the album color</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-amoled"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Enable Lyrics Engine</span><span class="vdi-stg-sub">Fetch and display time-synced lyrics</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-enlyrics"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Free Placement</span><span class="vdi-stg-sub">Allow dragging anywhere on the screen</span></div><label class="vdi-switch"><input type="checkbox" id="vdi-stg-freeplace"><span class="vdi-slider"></span></label></div>' +
      '<div class="vdi-stg-row"><div style="display:flex;flex-direction:column;"><span class="vdi-stg-label">Keyboard Shortcuts</span><span class="vdi-stg-sub">Manage global hotkeys for media controls</span></div><button id="vdi-stg-shortcuts-btn" style="background:rgba(255,255,255,0.1);border:none;color:#fff;padding:6px 12px;border-radius:12px;font-size:11px;cursor:pointer;">Edit</button></div>' +
      '<div class="vdi-stg-header" style="margin-top:8px;">Presets</div>' +
      '<div class="vdi-stg-row" style="justify-content:space-between; margin-top:4px;">' +
        '<button class="vdi-preset-btn" id="vdi-stg-pos-t" title="Snap to Top Center">Top</button>' +
        '<button class="vdi-preset-btn" id="vdi-stg-pos-b" title="Snap to Bottom Center">Bottom</button>' +
        '<button class="vdi-preset-btn" id="vdi-stg-pos-l" title="Snap to Left Edge">Left</button>' +
        '<button class="vdi-preset-btn" id="vdi-stg-pos-r" title="Snap to Right Edge">Right</button>' +
      '</div>' +
      '</div>';
    return panel;
  }

  function createSettingsTooltip() {
    var tt = document.createElement('div');
    tt.id = 'vdi-stg-tooltip';
    tt.innerHTML = 
      '<span>Customize the island here!</span>' +
      '<button id="vdi-stg-tooltip-btn">Got it</button>';
    return tt;
  }

  function createLyricsPanel(opts) {
    opts = opts || {};
    var panel = document.createElement('div');
    panel.id = 'vdi-lyrics-panel';
    panel.innerHTML = 
      '<button id="vdi-romanize-btn" title="Show Romanization (KR/JP)" style="display:none; position:absolute; top:12px; right:12px; z-index:100; background:rgba(255,255,255,0.1); border:none; border-radius:50%; width:32px; height:32px; color:rgba(255,255,255,0.6); cursor:pointer; align-items:center; justify-content:center; transition:all 0.2s;">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">' +
          '<path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>' +
        '</svg>' +
      '</button>' +
      '<button id="vdi-resume-scroll-btn">Resume Autoscroll</button>' +
      '<div id="vdi-lyrics-scroll"></div>' +
      '<div id="vdi-prov-menu">' +
        '<div class="vdi-prov-btn" id="vdi-prov-lp"><span class="vdi-prov-dot"></span> LyricsPlus</div>' +
        '<div class="vdi-prov-btn" id="vdi-prov-lrc"><span class="vdi-prov-dot"></span> LRCLib</div>' +
      '</div>';
    return panel;
  }

  function createController(island, lyrPanel, stgPanel, platform, opts) {
    opts = opts || {};
    var isVivaldi = opts.isVivaldi || false;

    var state = {
      isPlaying: false,
      title: '',
      artist: '',
      artwork: null,
      duration: 0,
      position: 0,
      hasMedia: false,
      tabId: null,
      windowId: null,
      lastArtwork: null,
      lastArtTitle: null,
      supportsPiP: false,
      lyricsOn: false,
      autoscroll: true,
      isSeeking: false,
      isPlayToggling: false,
      shuffleOn: false,
      repeatMode: 'off',
      lyricsLines: [],
      lyricsIdx: -1,
      lastLyricsKey: '',
      isIdle: false,
      lyricsSynced: false,
      romanizeOn: false,
      hasNonLatin: false
    };

    function performSeek(targetPos) {
      state.isSeeking = true;
      if (state.seekTimeout) clearTimeout(state.seekTimeout);
      state.seekTimeout = setTimeout(function() {
        state.isSeeking = false;
        state.forceNextSync = true;
      }, 2000);
      
      state.position = targetPos;
      state.basePosition = targetPos;
      state.lastSyncTime = Date.now();
      
      refreshProgress();
      syncLyrics();
      platform.sendAction(state.tabId, 'seek', targetPos);
    }

    var idleTimer = null;
    var colTimer = null;
    var ttTimer = null;
    var isDragging = false;
    var tickInterval = opts.tickInterval || 1000;
    var idleDelay = opts.idleDelay || 9000;
    var collapseDelay = opts.collapseDelay || 500;
    var settings = { hideYouTube: false, hideYouTubeMusic: false, hideSpotify: false, hideAppleMusic: false, enableLyrics: true, freePlacement: true, seenTooltip: false, amoledBlack: false };

    // Helper
    function $(id) { return document.getElementById(id); }

    var cachedWords = null;

    // Theme application
    function applyTheme(c) {
      if (c) {
        // If the color was extracted with an outdated amoledBlack setting, ignore it and re-extract!
        if (c.isAmoled !== undefined && c.isAmoled !== settings.amoledBlack) {
          if (state && state.artwork) {
            VDI.Core.extractVibrant(state.artwork, settings.amoledBlack, applyTheme);
          }
          return;
        }
        state.lastExtractedColor = c;
      }
      c = c || state.lastExtractedColor;

      var accent = c ? c.accent : DEFAULTS.accent;
      var grad = c ? c.gradient : DEFAULTS.gradient;
      var dark = c ? c.dark : (settings.amoledBlack ? '#000000' : DEFAULTS.dark);
      var glow = c ? c.glow : 'rgba(99,102,241,.2)';

      island.style.setProperty('--vdi-accent', accent);
      island.style.setProperty('--vdi-grad', grad);
      island.style.setProperty('--vdi-dark', dark);
      island.style.setProperty('--vdi-glow', glow);
      
      if (typeof stgPanel !== 'undefined' && stgPanel) {
        stgPanel.style.setProperty('--vdi-accent', accent);
        stgPanel.style.setProperty('--vdi-grad', grad);
        stgPanel.style.setProperty('--vdi-dark', dark);
        stgPanel.style.setProperty('--vdi-glow', glow);
      }
    }

    // Update progress bar
    function refreshProgress() {
      var pct = state.duration > 0 ? Math.min(100, (state.position / state.duration) * 100) : 0;
      $('vdi-prog-fill').style.width = pct + '%';
      $('vdi-pos').textContent = VDI.Core.formatTime(state.position);
      $('vdi-dur').textContent = VDI.Core.formatTime(state.duration);

      // Dynamically fill instrumental notes based on exact seek position
      var instWrappers = document.querySelectorAll('.vdi-instrumental-wrapper');
      for (var i = 0; i < instWrappers.length; i++) {
        var start = parseFloat(instWrappers[i].getAttribute('data-start'));
        var dur = parseFloat(instWrappers[i].getAttribute('data-dur'));
        if (dur > 0) {
          var progress = (state.position - start) / dur;
          progress = Math.max(0, Math.min(1, progress));
          var fill = instWrappers[i].querySelector('.vdi-note-fill');
          if (fill) fill.style.clipPath = 'inset(' + (100 - (progress * 100)) + '% 0 0 0)';
        }
      }
    }

    // Update play/pause icons
    function setPlayIcon(playing) {
      var svg = VDI.Core.getPlayIcon(playing);
      if ($('vdi-pp')) $('vdi-pp').innerHTML = svg;
      if ($('vdi-col-icon')) $('vdi-col-icon').innerHTML = svg;
    }

    // Main UI update
    var manuallyClosed = false;

    function updateUI() {
      var isBrowserFs = document.getElementById('browser') && document.getElementById('browser').classList.contains('fullscreen');
      
      var onYTM = opts.isVivaldi ? state.isMusicApp : window.location.hostname.includes('music.youtube.com');
      var onYT = opts.isVivaldi ? state.isYouTubeVideo : (window.location.hostname.includes('youtube.com') && !window.location.hostname.includes('music.youtube.com'));
      var onSpotify = window.location.hostname.includes('spotify.com');
      var onAppleMusic = window.location.hostname.includes('music.apple.com');
      
      var isHiddenByApp = (state.isMusicApp && settings.hideYouTubeMusic && onYTM) || 
                          (state.isYouTubeVideo && settings.hideYouTube && onYT) ||
                          (settings.hideSpotify && onSpotify) ||
                          (settings.hideAppleMusic && onAppleMusic);
      
      var hideIsland = !state.hasMedia || state.isFullscreen || isBrowserFs || document.fullscreenElement || manuallyClosed || isHiddenByApp;

      if (hideIsland) {
        island.style.display = 'none';
        if (lyrPanel) lyrPanel.style.display = 'none';
        return;
      }
      island.style.display = '';
      if (lyrPanel) lyrPanel.style.display = '';
      island.classList.add('vdi-visible');

      // Apply platform class every render (not just on artwork change)
      var platform = state.platform || (onSpotify ? 'spotify' : (onAppleMusic ? 'apple' : (onYTM ? 'ytmusic' : (onYT ? 'youtube' : 'other'))));
      island.className = island.className.replace(/\bvdi-platform-\S+/g, '').trim();
      island.classList.add('vdi-platform-' + platform);

      var shouldShowLyrics = settings.enableLyrics && !state.isYouTubeVideo;
      if ($('vdi-lyr-btn')) $('vdi-lyr-btn').style.display = shouldShowLyrics ? '' : 'none';
      if (!shouldShowLyrics && state.lyricsOn) {
        state.lyricsOn = false;
        if ($('vdi-lyr-btn')) $('vdi-lyr-btn').classList.remove('active');
        if (lyrPanel) lyrPanel.classList.remove('show');
      }

      var label = [state.title, state.artist].filter(Boolean).join(' \u2014 ') || 'Now Playing';
      $('vdi-col-inner').textContent = label;
      $('vdi-title').textContent = state.title || 'Unknown Track';
      $('vdi-artist').textContent = state.artist || 'Unknown Artist';

      if ($('vdi-shuffle')) {
        $('vdi-shuffle').style.display = (state.isYouTubeVideo || !state.isMusicApp) ? 'none' : '';
        var p = NATIVE_SVGS[platform] ? platform : (platform === 'ytmusic' ? 'youtube' : 'other');
        var shufOffSvg = NATIVE_SVGS[p].shuffleOff || NATIVE_SVGS[p].shuffle;
        var shufOnSvg = NATIVE_SVGS[p].shuffle;
        var smartShufSvg = NATIVE_SVGS[p].smartShuffle || shufOnSvg;
        
        $('vdi-shuffle').classList.remove('vdi-active', 'vdi-smart-shuffle');
        if (state.shuffleOn) {
          $('vdi-shuffle').classList.add('vdi-active');
          if (state.smartShuffleOn) {
            $('vdi-shuffle').classList.add('vdi-smart-shuffle');
            $('vdi-shuffle').innerHTML = state.shufSvg || smartShufSvg;
            $('vdi-shuffle').title = 'Smart Shuffle On';
          } else {
            $('vdi-shuffle').innerHTML = state.shufSvg || shufOnSvg;
            $('vdi-shuffle').title = 'Shuffle On';
          }
        } else {
          $('vdi-shuffle').innerHTML = state.shufSvg || shufOffSvg;
          $('vdi-shuffle').title = 'Shuffle Off';
        }
      }

      if ($('vdi-repeat')) {
        $('vdi-repeat').style.display = (state.isYouTubeVideo || !state.isMusicApp) ? 'none' : '';
        $('vdi-repeat').classList.remove('vdi-active', 'vdi-repeat-one');
        var p = NATIVE_SVGS[platform] ? platform : (platform === 'ytmusic' ? 'youtube' : 'other');
        var repOffSvg = NATIVE_SVGS[p].repeatOff || NATIVE_SVGS[p].repeat;
        var repeatSvg = NATIVE_SVGS[p].repeat;
        var repeatOneSvg = NATIVE_SVGS[p].repeatOne;
        if (state.repeatMode === 'all') {
          $('vdi-repeat').classList.add('vdi-active');
          $('vdi-repeat').innerHTML = state.repSvg || repeatSvg;
          $('vdi-repeat').title = 'Repeat All';
        } else if (state.repeatMode === 'one') {
          $('vdi-repeat').classList.add('vdi-active', 'vdi-repeat-one');
          $('vdi-repeat').innerHTML = state.repSvg || repeatOneSvg;
          $('vdi-repeat').title = 'Repeat One';
        } else {
          $('vdi-repeat').innerHTML = state.repSvg || repOffSvg;
          $('vdi-repeat').title = 'Repeat Off';
        }
      }

      setPlayIcon(state.isPlaying);

      if (state.supportsPiP && !state.isMusicApp) {
        $('vdi-pip-main-btn').style.display = 'flex';
      } else {
        $('vdi-pip-main-btn').style.display = 'none';
      }

      // Lyrics button is handled by settings.enableLyrics above
      // Album art
      if (state.artwork && (state.artwork !== state.lastArtwork || state.title !== state.lastArtTitle)) {
        // If we already fetched high res for this exact title, and the background gave us the low res again, ignore it!
        var skipArtUpdate = (state.highResFetchedFor === state.title && state.artwork.includes('i.ytimg.com'));

        if (!skipArtUpdate) {
          state.lastArtwork = state.artwork;
          state.lastArtTitle = state.title;
          var img = $('vdi-art-img');
          img.classList.remove('ok');
          
          var loadImg = function(url) {
            img.src = url;
            img.onload = function() {
              img.classList.add('ok');
              $('vdi-art-ph').style.display = 'none';
            };
            img.onerror = function() {
              $('vdi-art-ph').style.display = 'flex';
            };
          };

          if (state.artwork.includes('i.ytimg.com') || state.artwork.includes('hqdefault')) {
            loadImg(state.artwork); // Load low res first
            if (VDI.Core.fetchHighResArt && state.highResFetchedFor !== state.title) {
              state.highResFetchedFor = state.title; // Mark as fetched immediately to prevent race conditions
              VDI.Core.fetchHighResArt(state.title, state.artist, function(highResUrl) {
                if (highResUrl) {
                  state.artwork = highResUrl;
                  state.lastArtwork = highResUrl;
                  var tempImg = new Image();
                  tempImg.onload = function() {
                    img.src = highResUrl;
                    VDI.Core.extractVibrant(tempImg, settings.amoledBlack, applyTheme);
                  };
                  tempImg.crossOrigin = 'Anonymous';
                  tempImg.src = highResUrl;
                }
              });
            }
          } else {
            loadImg(state.artwork);
          }
          
          VDI.Core.extractVibrant(state.artwork, settings.amoledBlack, applyTheme);
        }
      } else if (!state.artwork && state.lastArtwork) {
        state.lastArtwork = null;
        var im2 = $('vdi-art-img');
        im2.classList.remove('ok');
        im2.src = '';
        $('vdi-art-ph').style.display = 'flex';
        applyTheme(null);
      }

      refreshProgress();
    }

    function updateLyricsPanelPosition() {
      var lyr = $('vdi-lyrics-panel');
      if (!lyr || !state.lyricsOn) return;
      
      var r = island.getBoundingClientRect();
      var islandTop = r.top;
      var islandLeft = r.left + (r.width / 2);
      var expH = 152;
      
      var ch = window.innerHeight;
      
      // Horizontal: center with island (left is already centered via transform)
      lyr.style.left = islandLeft + 'px';
      
      // Vertical: flip based on screen half
      if (islandTop > ch / 2 - (expH / 2)) {
        // Bottom half: put above
        lyr.style.top = 'auto';
        lyr.style.bottom = (ch - islandTop + 16) + 'px';
        lyr.style.maxHeight = Math.max(100, islandTop - 32) + 'px';
      } else {
        // Top half: put below the fully expanded island
        var islandBottom = islandTop + expH;
        lyr.style.bottom = 'auto';
        lyr.style.top = (islandBottom + 16) + 'px';
        lyr.style.maxHeight = Math.max(100, ch - islandBottom - 32) + 'px';
      }
    }

    function updateTooltipPosition() {
      var stgTooltip = $('vdi-stg-tooltip');
      if (!stgTooltip) return;
      var r = island.getBoundingClientRect();
      stgTooltip.style.top = (r.top + 4) + 'px';
      stgTooltip.style.left = (r.left - 146) + 'px';
    }

    function updateSettingsPanelPosition() {
      var stgPanel = $('vdi-settings-panel');
      if (!stgPanel || !stgPanel.classList.contains('show')) return;
      var r = island.getBoundingClientRect();
      var ch = window.innerHeight;
      var expH = 152;
      var islandTop = r.top;
      
      if (islandTop > ch / 2 - (expH / 2)) {
        stgPanel.style.top = 'auto';
        stgPanel.style.bottom = (ch - islandTop + 16) + 'px';
      } else {
        var islandBottom = islandTop + expH;
        stgPanel.style.bottom = 'auto';
        stgPanel.style.top = (islandBottom + 16) + 'px';
      }
      stgPanel.style.left = (r.left + r.width / 2) + 'px';
    }

    // Lyrics handling
    function fetchAndRenderLyrics() {
      var key = state.title + '|' + state.artist;
      state.lastLyricsKey = key;
      state.lyricsLines = [];
      state.lyricsIdx = -1;
      state.lyricsSynced = false;
      state.hasLyrics = undefined;
      state.multiLyrics = null;
      if (!state.selectedProvider) state.selectedProvider = 'lyricsplus';

      $('vdi-lyr-btn').classList.add('loading');
      $('vdi-lyr-btn').style.pointerEvents = 'auto'; // Reset
      $('vdi-lyr-btn').innerHTML = '<div class="vdi-loading-dots"><span></span><span></span><span></span></div>';
      $('vdi-lyrics-scroll').innerHTML = '<div class="vdi-lyric-line unsynced" style="text-align:center;margin-top:50px;">Loading lyrics...</div>';

      function handleMultiResult(res, k) {
        if (k !== state.lastLyricsKey) return;
        if (!res) res = { lyricsplus: null, lrclib: null };
        state.multiLyrics = res;
        
        // Auto-select provider
        if (state.selectedProvider === 'lyricsplus' && !res.lyricsplus && res.lrclib) {
          state.selectedProvider = 'lrclib';
        } else if (state.selectedProvider === 'lrclib' && !res.lrclib && res.lyricsplus) {
          state.selectedProvider = 'lyricsplus';
        } else if (!res.lyricsplus && !res.lrclib) {
          state.selectedProvider = 'lyricsplus'; // Default on total failure
        }
        
        renderLyricsData(key);
      }

      try {
        var cached = localStorage.getItem('vdi_lyr_multi_' + key);
        if (cached) {
          var data = JSON.parse(cached);
          if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
            handleMultiResult(data.payload, key);
            return;
          }
        }
      } catch(e) {}

      var handleFetchResult = function(result) {
        if (result) {
          try {
            localStorage.setItem('vdi_lyr_multi_' + key, JSON.stringify({ 
              payload: result,
              timestamp: Date.now() 
            }));
          } catch (e) {}
        }
        handleMultiResult(result, key);
      };

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'VDI_FETCH_LYRICS',
          title: state.title,
          artist: state.artist,
          duration: state.duration
        }, handleFetchResult);
      } else {
        VDI.Core.fetchLyrics(state.title, state.artist, state.duration, handleFetchResult);
      }
    }

    window.vdiSwitchProvider = function(prov) {
      if (!state.multiLyrics || !state.multiLyrics[prov]) return; // Cannot switch to null provider
      state.selectedProvider = prov;
      renderLyricsData(state.lastLyricsKey);
    };

    function renderLyricsData(key) {
        if (key !== state.lastLyricsKey) return;
        var m = state.multiLyrics || { lyricsplus: null, lrclib: null };
        var provData = m[state.selectedProvider];
        var lines = provData ? provData.lines : [];
        var synced = provData ? provData.synced : false;
        var shouldShowLyrics = settings.enableLyrics && !state.isYouTubeVideo;

        $('vdi-lyr-btn').classList.remove('loading');
        $('vdi-lyr-btn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';

        var hasAny = (m.lyricsplus !== null || m.lrclib !== null);

        if (!hasAny) {
          state.hasLyrics = false;
          $('vdi-lyr-btn').style.display = shouldShowLyrics ? 'flex' : 'none';
          $('vdi-lyr-btn').style.opacity = '0.2';
          $('vdi-lyr-btn').style.pointerEvents = 'none'; // Completely disable
          
          $('vdi-lyrics-scroll').innerHTML = '<div class="vdi-lyric-line unsynced" style="text-align:center;margin-top:50px;color:rgba(255,255,255,0.4);font-size:16px;">Lyrics not found for this track.</div>';
          var romBtn = $('vdi-romanize-btn');
          if (romBtn) romBtn.style.display = 'none';
          return;
        }

        // We have lyrics on at least one provider.
        state.hasLyrics = true;
        $('vdi-lyr-btn').style.opacity = '1';
        $('vdi-lyr-btn').style.pointerEvents = 'auto';
        $('vdi-lyr-btn').style.display = shouldShowLyrics ? 'flex' : 'none';
        
        state.lyricsLines = lines;
        state.lyricsSynced = synced;
        state.hasWords = provData ? provData.hasWords : false;

        // Update provider menu UI
        var btnLp = $('vdi-prov-lp');
        var btnLrc = $('vdi-prov-lrc');
        if (btnLp && btnLrc) {
          btnLp.className = 'vdi-prov-btn' + (m.lyricsplus ? ' has-lyr' : '') + (state.selectedProvider === 'lyricsplus' ? ' active' : '');
          btnLrc.className = 'vdi-prov-btn' + (m.lrclib ? ' has-lyr' : '') + (state.selectedProvider === 'lrclib' ? ' active' : '');
        }
        
        // Detect if any lines have non-Latin script
        var anyNonLatin = false;
        var hasKanjiOrKana = function(t) {
          for (var i = 0; i < t.length; i++) {
            var c = t.charCodeAt(i);
            if (c >= 0x0400 && c <= 0x04FF) return true; // Cyrillic
            if (c >= 0x0900 && c <= 0x0D7F) return true; // Indic
            if (c >= 0xAC00 && c <= 0xD7A3) return true; // Hangul
            if (c >= 0x3040 && c <= 0x9FFF) return true; // CJK
          }
          return false;
        };

        for (var c = 0; c < lines.length; c++) {
          if (hasKanjiOrKana(lines[c].text || '')) {
            anyNonLatin = true;
            break;
          }
        }
        state.hasNonLatin = anyNonLatin;

        var html = '';
        for (var k = 0; k < lines.length; k++) {
          var cls = 'vdi-lyric-line';
          if (state.hasWords && lines[k].words && lines[k].words.length > 0) cls += ' has-words';
          if (!synced) cls += ' unsynced';
          var text = lines[k].text || '&nbsp;';
          var wordsHtml = '&nbsp;';
          
          var duration = 2; // default fallback
          if (synced && k < lines.length - 1) {
            duration = lines[k+1].time - lines[k].time;
            if (duration < 0.5) duration = 0.5;
          } else if (synced) {
            duration = 4; // last line
          }

          var isInst = text.indexOf('♪') > -1 || text.indexOf('♫') > -1 || !lines[k].text || lines[k].text.trim() === '';
          if (isInst) {
            var notePath = 'M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z';
            wordsHtml = '<div class="vdi-instrumental-wrapper" data-start="' + lines[k].time + '" data-dur="' + duration + '"><div class="vdi-instrumental">' +
              '<svg class="vdi-note-bg" viewBox="0 0 24 24"><path d="' + notePath + '"/></svg>' +
              '<svg class="vdi-note-fill" viewBox="0 0 24 24"><path d="' + notePath + '"/></svg>' +
            '</div></div>';
            cls += ' vdi-lyr-inst vdi-instrumental-break';
          } else {
            // Full line highlight or word-by-word highlight
            if (state.hasWords && lines[k].words && lines[k].words.length > 0) {
              wordsHtml = '';
              for (var w = 0; w < lines[k].words.length; w++) {
                var word = lines[k].words[w];
                wordsHtml += '<span class="vdi-lyric-word" data-start="' + word.time + '" style="--w-dur: ' + Math.max(0.2, word.duration) + 's;">' + word.text + '</span>';
              }
            } else {
              wordsHtml = text.replace(/\n/g, '<br>');
            }
          }

          var transHtml = '';
          if (lines[k].translation) {
            transHtml = '<div class="vdi-lyric-translation">' + lines[k].translation + '</div>';
          }

          html += '<div class="' + cls + '" id="vdi-lyr-' + k + '">' + wordsHtml + transHtml + '</div>';
        }
        $('vdi-lyrics-scroll').innerHTML = html;
        $('vdi-lyr-btn').style.display = shouldShowLyrics ? 'flex' : 'none';

        // Async fetch romanization if needed
        if (anyNonLatin && VDI.Core.batchRomanize) {
          var handleRomanizeResult = function(roms) {
            if (key !== state.lastLyricsKey) return;
            for (var r = 0; r < roms.length; r++) {
              var romText = roms[r];
              var lineEl = document.getElementById('vdi-lyr-' + r);
              var origText = lines[r].text || '';
              if (lineEl && romText && romText.toLowerCase() !== origText.toLowerCase() && origText.indexOf('♪') === -1) {
                var romDiv = document.createElement('div');
                romDiv.className = 'vdi-lyric-roman';
                romDiv.textContent = romText;
                romDiv.style.display = state.romanizeOn ? 'block' : 'none';
                
                var transDiv = lineEl.querySelector('.vdi-lyric-translation');
                if (transDiv) {
                  lineEl.insertBefore(romDiv, transDiv);
                } else {
                  lineEl.appendChild(romDiv);
                }
              }
            }
          };

          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
              type: 'VDI_BATCH_ROMANIZE',
              lines: lines
            }, handleRomanizeResult);
          } else {
            VDI.Core.batchRomanize(lines, handleRomanizeResult);
          }
        }

        // Show/hide romanize toggle
        var romBtn = $('vdi-romanize-btn');
        if (romBtn) {
          romBtn.style.display = anyNonLatin ? 'flex' : 'none';
          romBtn.classList.toggle('active', state.romanizeOn);
          romBtn.onclick = function() {
            state.romanizeOn = !state.romanizeOn;
            romBtn.classList.toggle('active', state.romanizeOn);
            var allRoman = document.querySelectorAll('.vdi-lyric-roman');
            for (var r = 0; r < allRoman.length; r++) {
              allRoman[r].style.display = state.romanizeOn ? 'block' : 'none';
            }
            // Re-scroll to active line after layout shift
            setTimeout(function() {
              var activeLine = document.querySelector('.vdi-lyric-line.active');
              if (activeLine) {
                activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 50);
          };
          // Apply initial state
          var allRoman = document.querySelectorAll('.vdi-lyric-roman');
          for (var r = 0; r < allRoman.length; r++) {
            allRoman[r].style.display = state.romanizeOn ? 'block' : 'none';
          }
        }

        if (state.lyricsOn) lyrPanel.classList.add('show');

        // Bind click handlers for synced lyrics
        if (synced) {
          for (var n = 0; n < lines.length; n++) {
            (function(tTarget, idx) {
              var lineEl = document.getElementById('vdi-lyr-' + idx);
              if (lineEl) {
                lineEl.addEventListener('click', function(e) {
                  e.stopPropagation();
                  performSeek(tTarget);
                });
              }
            })(lines[n].time, n);
          }
        }
      }

    function syncLyrics() {
      if (!state.lyricsLines.length || !state.lyricsSynced) return;

      var pos = state.position;
      // Add a tiny lookahead so CSS transitions finish exactly on the sung word
      var lookahead = 0.1;
      
      var idx = -1;

      for (var i = state.lyricsLines.length - 1; i >= 0; i--) {
        if (state.lyricsLines[i].time <= pos + 0.1) {
          idx = i;
          break;
        }
      }

      if (idx !== state.lyricsIdx) {
        var prevActive = document.querySelector('.vdi-lyric-line.active');
        if (prevActive) {
          prevActive.classList.remove('active');
          if (state.hasWords) {
            var activeWords = prevActive.querySelectorAll('.vdi-lyric-word.active-word');
            for (var j = 0; j < activeWords.length; j++) {
              activeWords[j].classList.remove('active-word');
            }
          }
        }

        var newActive = $('vdi-lyr-' + idx);
        if (newActive) {
          newActive.classList.add('active');
          if (state.lyricsOn && state.autoscroll) {
            newActive.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }

          if (state.hasWords) {
            var wEls = newActive.querySelectorAll('.vdi-lyric-word');
            cachedWords = [];
            for (var w = 0; w < wEls.length; w++) {
              cachedWords.push({
                el: wEls[w],
                start: parseFloat(wEls[w].getAttribute('data-start')),
                isActive: false
              });
            }
          }
        } else {
          cachedWords = null;
        }
      }

      if (state.hasWords && cachedWords) {
        for (var w = 0; w < cachedWords.length; w++) {
          if (cachedWords[w].start <= pos + lookahead) {
            if (!cachedWords[w].isActive) {
              cachedWords[w].el.classList.add('active-word');
              cachedWords[w].isActive = true;
            }
          } else {
            if (cachedWords[w].isActive) {
              cachedWords[w].el.classList.remove('active-word');
              cachedWords[w].isActive = false;
            }
          }
        }
      }

      state.lyricsIdx = idx;
    }

    // Idle handling
    function resetIdle() {
      clearTimeout(idleTimer);
      if (state.isIdle) {
        state.isIdle = false;
        island.classList.remove('vdi-idle');
      }
      idleTimer = setTimeout(function() {
        if (!state.hasMedia) return;
        if (state.lyricsOn) return; // Never collapse if lyrics are open
        
        var sp = $('vdi-settings-panel');
        if (sp && sp.classList.contains('show')) return; // Never collapse if settings are open
        
        state.isIdle = true;
        island.classList.add('vdi-idle');
      }, idleDelay);
    }

    // Expand/collapse
    function handleMouseEnter() {
      clearTimeout(colTimer);
      if (state.isIdle) {
        state.isIdle = false;
        island.classList.remove('vdi-idle');
      }
      island.classList.add('vdi-expanded');

      if (!settings.seenTooltip && $('vdi-stg-tooltip')) {
        clearTimeout(ttTimer);
        ttTimer = setTimeout(function() {
          if (!settings.seenTooltip && island.classList.contains('vdi-expanded')) {
            settings.seenTooltip = true;
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ 'vdi_cfg_seenTooltip3': true });
            } else {
              localStorage.setItem('vdi_cfg_seenTooltip3', 'true');
            }
            $('vdi-stg-tooltip').style.display = 'flex';
            updateTooltipPosition();
            if ($('vdi-settings-btn')) $('vdi-settings-btn').style.opacity = '1';
            setTimeout(function() {
              $('vdi-stg-tooltip').classList.add('show');
            }, 50);
          }
        }, 1200);
      }

      resetIdle();
    }

    function handleMouseLeave() {
      if (isDragging) return;
      clearTimeout(colTimer);
      clearTimeout(ttTimer);
      colTimer = setTimeout(function() {
        island.classList.remove('vdi-expanded');
        var sp = $('vdi-settings-panel');
        if (sp) sp.classList.remove('show');
        if ($('vdi-stg-tooltip')) {
          $('vdi-stg-tooltip').classList.remove('show');
          setTimeout(function() {
            if ($('vdi-stg-tooltip')) $('vdi-stg-tooltip').style.display = 'none';
            if ($('vdi-settings-btn')) $('vdi-settings-btn').style.opacity = '';
          }, 300);
        }
        if (state.lyricsOn) {
          state.lyricsOn = false;
          $('vdi-lyr-btn').classList.remove('active');
          lyrPanel.classList.remove('show');
        }
      }, collapseDelay);
      resetIdle();
    }

    // Event binding
    function bindEvents() {
      // --- Draggable Logic ---
      var dragStartX = 0;
      var dragStartY = 0;
      var startLeftCenter = 0;
      var startTop = 0;

      island.addEventListener('mousedown', function(e) {
        if (!settings.freePlacement) return;
        if (e.target.closest('button, svg, #vdi-prog, #vdi-lyrics-scroll, a')) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        var r = island.getBoundingClientRect();
        startLeftCenter = r.left + (r.width / 2);
        startTop = r.top;
        island.style.transition = 'none';

        // Show snap zones
        if (!$('vdi-snap-zones')) {
          var sz = document.createElement('div');
          sz.id = 'vdi-snap-zones';
          sz.innerHTML = '<div class="vdi-sz vdi-sz-t"></div><div class="vdi-sz vdi-sz-b"></div><div class="vdi-sz vdi-sz-l"></div><div class="vdi-sz vdi-sz-r"></div>';
          document.body.appendChild(sz);
        }
        $('vdi-snap-zones').classList.add('active');
      });

      document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault();
        var dx = e.clientX - dragStartX;
        var dy = e.clientY - dragStartY;
        var newLeftCenter = startLeftCenter + dx;
        var newTop = startTop + dy;

        // Magnetic Snapping
        var midX = window.innerWidth / 2;
        var midY = window.innerHeight / 2;
        var expW = 400;
        var expH = 152;
        var snapD = 40;
        
        var activeZone = null;

        if (newTop < snapD && Math.abs(newLeftCenter - midX) < snapD) {
          newTop = 10; newLeftCenter = midX;
          activeZone = 't';
        } else if (newTop > window.innerHeight - expH - snapD && Math.abs(newLeftCenter - midX) < snapD) {
          newTop = window.innerHeight - expH - 10; newLeftCenter = midX;
          activeZone = 'b';
        } else if (newLeftCenter - (expW/2) < snapD && Math.abs(newTop + (expH/2) - midY) < snapD) {
          newLeftCenter = (expW/2) + 10; newTop = midY - (expH/2);
          activeZone = 'l';
        } else if (newLeftCenter + (expW/2) > window.innerWidth - snapD && Math.abs(newTop + (expH/2) - midY) < snapD) {
          newLeftCenter = window.innerWidth - (expW/2) - 10; newTop = midY - (expH/2);
          activeZone = 'r';
        }

        // Highlight active zone
        if ($('vdi-snap-zones')) {
          var szs = $('vdi-snap-zones').children;
          szs[0].classList.toggle('active', activeZone === 't');
          szs[1].classList.toggle('active', activeZone === 'b');
          szs[2].classList.toggle('active', activeZone === 'l');
          szs[3].classList.toggle('active', activeZone === 'r');
        }

        // Clamp to edges using expanded dimensions to prevent spillover
        var minLeftCenter = (expW / 2) + 10;
        var maxLeftCenter = window.innerWidth - (expW / 2) - 10;
        newLeftCenter = Math.max(minLeftCenter, Math.min(newLeftCenter, maxLeftCenter));

        var maxTop = window.innerHeight - expH - 10;
        newTop = Math.max(10, Math.min(newTop, maxTop));

        // Always keep it centered via transform to ensure symmetrical width expansion!
        island.style.left = newLeftCenter + 'px';
        island.style.top = newTop + 'px';
        island.style.transform = 'translateX(-50%)';
        
        if (state.lyricsOn) {
          updateLyricsPanelPosition();
        }
        updateSettingsPanelPosition();
      });

      document.addEventListener('mouseup', function(e) {
        if (!isDragging) return;
        isDragging = false;
        island.style.transition = '';
        if ($('vdi-snap-zones')) $('vdi-snap-zones').classList.remove('active');
        
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({
            'vdi_loc_x': island.style.left,
            'vdi_loc_y': island.style.top,
            'vdi_transform': island.style.transform,
            'activePreset': null
          });
        } else {
          localStorage.setItem('vdi_loc_x', island.style.left);
          localStorage.setItem('vdi_loc_y', island.style.top);
          localStorage.setItem('vdi_transform', island.style.transform);
        }
      });
      // -----------------------

      island.addEventListener('mouseenter', handleMouseEnter);
      island.addEventListener('mouseleave', handleMouseLeave);
      lyrPanel.addEventListener('mouseenter', handleMouseEnter);
      lyrPanel.addEventListener('mouseleave', handleMouseLeave);

      document.addEventListener('mousemove', function(e) {
        if (!state.hasMedia) return;
        var r = island.getBoundingClientRect();
        if (e.clientX >= r.left - 80 && e.clientX <= r.right + 80 &&
            e.clientY >= r.top - 60 && e.clientY <= r.bottom + 60) {
          resetIdle();
        }
      });

      // Cancel drag if mouse leaves window or document loses focus
      document.addEventListener('mouseleave', function(e) {
        if (isDragging) {
          isDragging = false;
          if ($('vdi-snap-zones')) $('vdi-snap-zones').classList.remove('active');
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ 'vdi_loc_x': island.style.left, 'vdi_loc_y': island.style.top, 'vdi_transform': island.style.transform, 'activePreset': null });
          }
        }
      });
      window.addEventListener('blur', function() {
        if (isDragging) {
          isDragging = false;
          if ($('vdi-snap-zones')) $('vdi-snap-zones').classList.remove('active');
        }
      });

      if ($('vdi-teleport-btn')) {
        $('vdi-teleport-btn').addEventListener('click', function(e) {
          e.stopPropagation();
          platform.sendAction(state.tabId, 'teleport');
        });
      }

      if ($('vdi-col-btn')) {
        $('vdi-col-btn').addEventListener('click', function(e) {
          e.stopPropagation();
          platform.sendAction(state.tabId, 'toggle');
        });
      }

      // Controls
      $('vdi-prev').addEventListener('click', function(e) {
        e.stopPropagation();
        platform.sendAction(state.tabId, 'prev');
      });

      $('vdi-next').addEventListener('click', function(e) {
        e.stopPropagation();
        platform.sendAction(state.tabId, 'next');
      });

      if ($('vdi-shuffle')) {
        $('vdi-shuffle').addEventListener('click', function(e) {
          e.stopPropagation();
          platform.sendAction(state.tabId, 'shuffle');
        });
      }

      if ($('vdi-repeat')) {
        $('vdi-repeat').addEventListener('click', function(e) {
          e.stopPropagation();
          platform.sendAction(state.tabId, 'repeat');
        });
      }

      if ($('vdi-close-btn')) {
        $('vdi-close-btn').addEventListener('click', function(e) {
          e.stopPropagation();
          manuallyClosed = true;
          updateUI();
        });
      }

      // Settings Modal Logic
      var stgBtn = $('vdi-settings-btn');
      if (stgBtn && stgPanel) {
        stgBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (state.lyricsOn && !stgPanel.classList.contains('show')) {
            $('vdi-lyr-btn').click(); // close lyrics
          }
          stgPanel.classList.toggle('show');
          if (stgPanel.classList.contains('show')) {
            updateSettingsPanelPosition();
          }
          // Sync UI state
          $('vdi-stg-hideyt').checked = settings.hideYouTube;
          $('vdi-stg-hideytm').checked = settings.hideYouTubeMusic;
          $('vdi-stg-amoled').checked = settings.amoledBlack;
          $('vdi-stg-hidespotify').checked = settings.hideSpotify;
          $('vdi-stg-hideapplemusic').checked = settings.hideAppleMusic;
          $('vdi-stg-enlyrics').checked = settings.enableLyrics;
          $('vdi-stg-freeplace').checked = settings.freePlacement;
        });

        stgPanel.addEventListener('mouseleave', function() {
          handleMouseLeave();
        });
        stgPanel.addEventListener('mouseenter', function() {
          handleMouseEnter();
        });
        island.addEventListener('mouseenter', function() {
          // Island enter logic handled centrally, this is just a stub if needed
        });

        document.addEventListener('click', function(e) {
          if (!island.contains(e.target) && !stgPanel.contains(e.target)) {
            stgPanel.classList.remove('show');
          }
        });
        
        if ($('vdi-stg-tooltip')) {
          $('vdi-stg-tooltip').addEventListener('mouseleave', function() {
            handleMouseLeave();
          });
          $('vdi-stg-tooltip').addEventListener('mouseenter', function() {
            handleMouseEnter();
          });
        }

        if ($('vdi-stg-tooltip-btn')) {
          $('vdi-stg-tooltip-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            settings.seenTooltip = true;
            $('vdi-stg-tooltip').classList.remove('show');
            setTimeout(function() {
              if ($('vdi-stg-tooltip')) $('vdi-stg-tooltip').style.display = 'none';
              if ($('vdi-settings-btn')) $('vdi-settings-btn').style.opacity = '';
            }, 300);
            
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ 'vdi_cfg_seenTooltip3': true });
            } else {
              localStorage.setItem('vdi_cfg_seenTooltip3', 'true');
            }
          });
        }

        var bindStg = function(id, key) {
          var el = $(id);
          if (el) {
            el.addEventListener('change', function(e) {
              settings[key] = e.target.checked;
              if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                var update = {};
                update[key] = settings[key];
                chrome.storage.local.set(update);
              } else {
                localStorage.setItem('vdi_cfg_' + key, settings[key]);
              }
              updateUI();
            });
          }
        };

        bindStg('vdi-stg-hideyt', 'hideYouTube');
        bindStg('vdi-stg-hideytm', 'hideYouTubeMusic');
        bindStg('vdi-stg-amoled', 'amoledBlack');
        // Immediately force a theme re-extraction when amoled changes
        $('vdi-stg-amoled').addEventListener('change', function() {
          if (state.artwork) {
            VDI.Core.extractVibrant(state.artwork, settings.amoledBlack, applyTheme);
          }
        });
        bindStg('vdi-stg-hidespotify', 'hideSpotify');
        bindStg('vdi-stg-hideapplemusic', 'hideAppleMusic');
        bindStg('vdi-stg-enlyrics', 'enableLyrics');
        bindStg('vdi-stg-freeplace', 'freePlacement');

        var scBtn = $('vdi-stg-shortcuts-btn');
        if (scBtn) {
          scBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
              chrome.runtime.sendMessage({ type: 'VDI_ACTION', act: 'openShortcuts' });
            }
          });
        }

        var updatePos = function(left, top, transform) {
          island.style.left = left;
          island.style.top = top;
          island.style.transform = transform;
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ 'vdi_loc_x': left, 'vdi_loc_y': top, 'vdi_transform': transform });
          } else {
            localStorage.setItem('vdi_loc_x', left);
            localStorage.setItem('vdi_loc_y', top);
            localStorage.setItem('vdi_transform', transform);
          }
          if (state.lyricsOn) updateLyricsPanelPosition();
          updateSettingsPanelPosition();
          updateTooltipPosition();
        };

        if ($('vdi-stg-pos-t')) $('vdi-stg-pos-t').addEventListener('click', function(e) { e.stopPropagation(); updatePos('50%', '10px', 'translateX(-50%)'); });
        if ($('vdi-stg-pos-b')) $('vdi-stg-pos-b').addEventListener('click', function(e) { e.stopPropagation(); updatePos('50%', (window.innerHeight - 152 - 10) + 'px', 'translateX(-50%)'); });
        if ($('vdi-stg-pos-l')) $('vdi-stg-pos-l').addEventListener('click', function(e) { e.stopPropagation(); updatePos('210px', (window.innerHeight / 2 - 76) + 'px', 'translateX(-50%)'); });
        if ($('vdi-stg-pos-r')) $('vdi-stg-pos-r').addEventListener('click', function(e) { e.stopPropagation(); updatePos((window.innerWidth - 210) + 'px', (window.innerHeight / 2 - 76) + 'px', 'translateX(-50%)'); });
      }

      $('vdi-play').addEventListener('click', function(e) {
        e.stopPropagation();
        if (!state.hasMedia || !state.tabId) return;
        
        platform.sendAction(state.tabId, 'toggle');
        state.isPlaying = !state.isPlaying;
        setPlayIcon(state.isPlaying);
        
        state.isPlayToggling = true;
        state.playToggleLockTime = Date.now();
      });

      $('vdi-prog').addEventListener('click', function(e) {
        e.stopPropagation();
        if (!state.duration) return;
        var r = e.currentTarget.getBoundingClientRect();
        var targetPos = ((e.clientX - r.left) / r.width) * state.duration;
        performSeek(targetPos);
      });

      $('vdi-pip-main-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        if (!opts.isVivaldi && typeof VDI !== 'undefined' && VDI.Core && VDI.Core.togglePiP) {
          var success = VDI.Core.togglePiP();
          if (!success && platform.requestPiP) {
            platform.requestPiP(state.tabId);
          }
        } else if (platform.requestPiP) {
          platform.requestPiP(state.tabId);
        }
      });

      $('vdi-lyr-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        if (typeof stgPanel !== 'undefined' && stgPanel && stgPanel.classList.contains('show')) {
          stgPanel.classList.remove('show');
        }
        state.lyricsOn = !state.lyricsOn;
        $('vdi-lyr-btn').classList.toggle('active', state.lyricsOn);

        if (state.lyricsOn) {
          lyrPanel.classList.add('show');
          updateLyricsPanelPosition();

          if (state.lyricsSynced && state.lyricsIdx >= 0 && state.autoscroll) {
            var cur = $('vdi-lyr-' + state.lyricsIdx);
            if (cur) {
              setTimeout(function() {
                cur.scrollIntoView({ behavior: 'auto', block: 'center' });
              }, 50);
            }
          }
        } else {
          lyrPanel.classList.remove('show');
        }
      });

      // Autoscroll handling
      var scrollEl = $('vdi-lyrics-scroll');
      if (scrollEl) {
        var disableAutoscroll = function() {
          if (state.autoscroll) {
            state.autoscroll = false;
            var btn = $('vdi-resume-scroll-btn');
            if (btn) btn.classList.add('show');
          }
        };
        scrollEl.addEventListener('wheel', disableAutoscroll, { passive: true });
        scrollEl.addEventListener('touchmove', disableAutoscroll, { passive: true });
      }

      var resBtn = $('vdi-resume-scroll-btn');
      if (resBtn) {
        resBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          state.autoscroll = true;
          resBtn.classList.remove('show');
          if (state.lyricsIdx > -1) {
            var cur = $('vdi-lyr-' + state.lyricsIdx);
            if (cur) cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }

      var provLp = $('vdi-prov-lp');
      if (provLp) {
        provLp.addEventListener('click', function(e) {
          e.stopPropagation();
          if (window.vdiSwitchProvider) window.vdiSwitchProvider('lyricsplus');
        });
      }

      var provLrc = $('vdi-prov-lrc');
      if (provLrc) {
        provLrc.addEventListener('click', function(e) {
          e.stopPropagation();
          if (window.vdiSwitchProvider) window.vdiSwitchProvider('lrclib');
        });
      }
    }

    // Tick update
    function startTick() {
      // Use requestAnimationFrame for buttery smooth UI updates
      function tick() {
        if (!state.isSeeking && state.isPlaying && state.duration > 0 && state.lastSyncTime) {
          var elapsed = (Date.now() - state.lastSyncTime) / 1000.0;
          state.position = Math.min(state.duration, state.basePosition + elapsed);
          refreshProgress();
        }
        syncLyrics();
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);

      // EQ animation
      setInterval(function() {
        var bars = document.querySelectorAll('.vdi-eq-bar');
        if (!bars.length) return;
        for (var i = 0; i < bars.length; i++) {
          if (!state.isPlaying) {
            bars[i].style.height = '3px';
          } else {
            bars[i].style.height = Math.floor(4 + Math.random() * 9) + 'px';
          }
        }
      }, 200);
    }

    // Fullscreen handling
    function setupFullscreen() {
      // Chrome Extension context: injected directly into the page, so standard HTML5 API works instantly

      // 2. Chrome Extension context: injected directly into the page, so standard HTML5 API works perfectly
      document.addEventListener('fullscreenchange', function() {
        if (document.fullscreenElement) {
          island.style.display = 'none';
          if (lyrPanel) lyrPanel.style.display = 'none';
        } else {
          island.style.display = '';
          if (lyrPanel) lyrPanel.style.display = '';
        }
      });
    }

    // Public state getter/setter
    function setState(newState) {
      if (!newState) return;

      var prevKey = state.title + '|' + state.artist;

      state.hasMedia = newState.hasMedia;
      if (!state.isPlayToggling || (Date.now() - (state.playToggleLockTime || 0) > 300)) {
        state.isPlayToggling = false;
        state.isPlaying = newState.isPlaying;
      }
      state.title = newState.title;
      state.artist = newState.artist;
      state.artwork = newState.artwork;
      state.duration = newState.duration;
      state.shuffleOn = newState.shuffleOn || false;
      state.smartShuffleOn = newState.smartShuffleOn || false;
      state.repeatMode = newState.repeatMode || 'off';
      state.platform = newState.platform || 'other';
      
      // Use exact clock interpolation instead of dt accumulation
      if (!state.isSeeking) {
        var now = Date.now();
        var newBase = newState.position;
        var elapsed = (now - state.lastSyncTime) / 1000.0;
        var currentPredicted = (state.basePosition || 0) + elapsed;
        
        // Only violently snap the clock if we drifted by more than 1.5s (or if forced).
        // Otherwise, trust our local 60FPS coasting timer to prevent micro-stutters!
        if (!state.lastSyncTime || state.forceNextSync || Math.abs(currentPredicted - newBase) > 1.5) {
          state.basePosition = newBase;
          state.lastSyncTime = now;
          state.position = state.basePosition;
          state.forceNextSync = false;
        }
      }

      state.supportsPiP = newState.supportsPiP;
      state.isFullscreen = newState.isFullscreen;
      state.isYouTubeVideo = newState.isYouTubeVideo;
      state.isMusicApp = newState.isMusicApp;
      state.tabId = newState.tabId !== undefined ? newState.tabId : state.tabId;
      state.windowId = newState.windowId !== undefined ? newState.windowId : state.windowId;

      updateUI();

      var key = state.title + '|' + state.artist;
      if (key !== prevKey && state.title) {
        fetchAndRenderLyrics();
      }
    }

    function getState() {
      return state;
    }

    // Initialize
    function init() {
      function applyPos(x, y, tf) {
        if (!x || !y) return;
        var midX = window.innerWidth / 2;
        var midY = window.innerHeight / 2;
        var expW = 400;
        var expH = 152;

        if (x === 'CENTER') x = midX + 'px';
        if (x === 'RIGHT') x = (window.innerWidth - (expW/2) - 10) + 'px';
        if (x === 'LEFT') x = ((expW/2) + 10) + 'px';
        
        if (y === 'TOP') y = '10px';
        if (y === 'BOTTOM') y = (window.innerHeight - expH - 10) + 'px';
        if (y === 'MIDDLE') y = (midY - (expH/2)) + 'px';

        island.style.left = x;
        island.style.top = y;
        island.style.transform = tf || 'none';
        
        if (state.lyricsOn) {
          // Give it a frame to apply CSS before measuring bounds
          requestAnimationFrame(updateLyricsPanelPosition);
        }
      }



      window.addEventListener('resize', function() {
        if (!state.hasMedia) return;
        var expW = 400;
        var expH = 152;
        
        // Clamp island position to new viewport bounds
        var minLeftCenter = (expW / 2) + 10;
        var maxLeftCenter = window.innerWidth - (expW / 2) - 10;
        var currentLeftStr = island.style.left || '';
        var currentLeft = window.innerWidth / 2;
        if (currentLeftStr.indexOf('%') !== -1) {
          currentLeft = window.innerWidth * (parseFloat(currentLeftStr) / 100);
        } else if (currentLeftStr) {
          currentLeft = parseFloat(currentLeftStr);
        }
        var newLeftCenter = Math.max(minLeftCenter, Math.min(currentLeft, maxLeftCenter));
        
        var maxTop = window.innerHeight - expH - 10;
        var currentTop = parseFloat(island.style.top) || 10;
        var newTop = Math.max(10, Math.min(currentTop, maxTop));
        
        island.style.left = newLeftCenter + 'px';
        island.style.top = newTop + 'px';
        
        if (state.lyricsOn) {
          updateLyricsPanelPosition();
        }
        updateSettingsPanelPosition();
      });
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['vdi_loc_x', 'vdi_loc_y', 'vdi_transform', 'hideYouTube', 'hideYouTubeMusic', 'hideSpotify', 'hideAppleMusic', 'enableLyrics', 'freePlacement', 'amoledBlack', 'vdi_cfg_seenTooltip3'], function(res) {
          applyPos(res.vdi_loc_x, res.vdi_loc_y, res.vdi_transform);
          if (res.hideYouTube !== undefined) settings.hideYouTube = res.hideYouTube;
          if (res.hideYouTubeMusic !== undefined) settings.hideYouTubeMusic = res.hideYouTubeMusic;
          
          if (res.amoledBlack !== undefined && res.amoledBlack !== settings.amoledBlack) {
            settings.amoledBlack = res.amoledBlack;
            if (state && state.artwork) {
              VDI.Core.extractVibrant(state.artwork, settings.amoledBlack, applyTheme);
            }
          }

          if (res.hideSpotify !== undefined) settings.hideSpotify = res.hideSpotify;
          if (res.hideAppleMusic !== undefined) settings.hideAppleMusic = res.hideAppleMusic;
          if (res.enableLyrics !== undefined) settings.enableLyrics = res.enableLyrics;
          if (res.freePlacement !== undefined) settings.freePlacement = res.freePlacement;
          if (res.vdi_cfg_seenTooltip3 !== undefined) settings.seenTooltip = res.vdi_cfg_seenTooltip3;

          $('vdi-stg-hideyt').checked = settings.hideYouTube;
          $('vdi-stg-hideytm').checked = settings.hideYouTubeMusic;
          $('vdi-stg-amoled').checked = settings.amoledBlack;
          $('vdi-stg-hidespotify').checked = settings.hideSpotify;
          $('vdi-stg-hideapplemusic').checked = settings.hideAppleMusic;
          $('vdi-stg-enlyrics').checked = settings.enableLyrics;
          $('vdi-stg-freeplace').checked = settings.freePlacement;

          // Start loop after settings load to prevent visual glitches
          bindEvents();
          startTick();
          setupFullscreen();
          resetIdle();
        });

        chrome.storage.onChanged.addListener(function(changes, namespace) {
          if (namespace === 'local') {
            if (changes.hideYouTube) settings.hideYouTube = changes.hideYouTube.newValue;
            if (changes.hideYouTubeMusic) settings.hideYouTubeMusic = changes.hideYouTubeMusic.newValue;
            if (changes.amoledBlack) {
              settings.amoledBlack = changes.amoledBlack.newValue;
              if (state.artwork) {
                VDI.Core.extractVibrant(state.artwork, settings.amoledBlack, applyTheme);
              }
            }
            if (changes.hideSpotify) settings.hideSpotify = changes.hideSpotify.newValue;
            if (changes.hideAppleMusic) settings.hideAppleMusic = changes.hideAppleMusic.newValue;
            if (changes.enableLyrics) settings.enableLyrics = changes.enableLyrics.newValue;
            if (changes.freePlacement) settings.freePlacement = changes.freePlacement.newValue;
            
            if (changes.vdi_loc_x && changes.vdi_loc_y && changes.vdi_transform) {
              applyPos(changes.vdi_loc_x.newValue, changes.vdi_loc_y.newValue, changes.vdi_transform.newValue);
            }
            
            updateUI();
          }
        });
      } else {
        applyPos(localStorage.getItem('vdi_loc_x'), localStorage.getItem('vdi_loc_y'), localStorage.getItem('vdi_transform'));
        var getBool = function(key, defaultVal) {
          var val = localStorage.getItem('vdi_cfg_' + key);
          return val !== null ? val === 'true' : defaultVal;
        };
        settings.hideYouTube = getBool('hideYouTube', settings.hideYouTube);
        settings.hideYouTubeMusic = getBool('hideYouTubeMusic', settings.hideYouTubeMusic);
        settings.amoledBlack = getBool('amoledBlack', settings.amoledBlack);
        settings.hideSpotify = getBool('hideSpotify', settings.hideSpotify);
        settings.enableLyrics = getBool('enableLyrics', settings.enableLyrics);
        settings.freePlacement = getBool('freePlacement', settings.freePlacement);
        settings.seenTooltip = getBool('seenTooltip3', settings.seenTooltip);
        
        bindEvents();
        startTick();
        setupFullscreen();
        resetIdle();
      }
    }

    return {
      init: init,
      setState: setState,
      getState: getState,
      updateUI: updateUI,
      refreshProgress: refreshProgress
    };
  }

  return {
    createIsland: createIsland,
    createSettingsPanel: createSettingsPanel,
    createSettingsTooltip: createSettingsTooltip,
    createLyricsPanel: createLyricsPanel,
    createController: createController
  };
})();
