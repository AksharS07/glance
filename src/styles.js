/**
 * Glance - Shared CSS Styles
 * Generates CSS string based on configuration
 */

var VDI = VDI || {};

VDI.Styles = (function() {
  'use strict';

  var DEFAULTS = {
    accent: '#6366f1',
    gradient: 'linear-gradient(135deg,#6366f1,#a855f7)',
    dark: 'hsl(244,40%,6%)'
  };

  function generate(opts) {
    opts = opts || {};
    var islandTop = opts.islandTop || 10;
    var accent = opts.accent || DEFAULTS.accent;
    var gradient = opts.gradient || DEFAULTS.gradient;
    var dark = opts.dark || DEFAULTS.dark;

    var rules = [];

    // ═══════════════════════════════════════════════════════════
    // Main Container
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi{',
        'position:fixed !important;top:' + islandTop + 'px !important;left:50% !important;transform:translateX(-50%) !important;',
        'z-index:2147483647 !important;border-radius:32px !important;overflow:hidden !important;user-select:none !important;cursor:default !important;',
        'width:168px !important;height:34px !important;',
        'background:var(--vdi-dark,' + dark + ') !important;',
        'box-shadow:0 0 0 1px rgba(255,255,255,.08),0 10px 40px rgba(0,0,0,.8),0 0 80px var(--vdi-glow,rgba(99,102,241,.18)) !important;',
        'opacity:0 !important;pointer-events:none !important;',
        'font-family:"Inter",-apple-system,system-ui,"Segoe UI",sans-serif !important;',
        '-webkit-font-smoothing:antialiased !important;-moz-osx-font-smoothing:grayscale !important;text-rendering:optimizeLegibility !important;letter-spacing:normal !important;line-height:normal !important;',
        'transition:width .5s cubic-bezier(0.32, 0.72, 0, 1),height .5s cubic-bezier(0.32, 0.72, 0, 1),',
          'border-radius .5s cubic-bezier(0.32, 0.72, 0, 1),background .7s ease,box-shadow .7s ease,opacity .3s ease !important;',
      '}'
    );
    rules.push(
      '#vdi.vdi-swallowed{',
        'top: 50% !important;',
        'transform: translate(-50%, -50%) scale(2.5) !important;',
        'box-shadow: 0 0 0 1px rgba(255,255,255,.05), 0 30px 100px rgba(0,0,0,1), 0 0 160px var(--vdi-glow,rgba(99,102,241,.18)) !important;',
      '}'
    );
    // Bug 8 fix: force all island children to inherit font-family, blocking host CSS overrides
    rules.push('#vdi *{font-family:inherit !important;}');

    // State classes
    rules.push('#vdi.vdi-visible{opacity:1 !important;pointer-events:all !important;}');
    rules.push('#vdi.vdi-expanded{width:400px !important;height:152px !important;border-radius:26px !important;}');
    rules.push('#vdi.vdi-idle{width:28px!important;height:28px!important;border-radius:14px!important;opacity:.95!important;}');

    // ═══════════════════════════════════════════════════════════
    // Collapsed Pill View
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-col{',
        'position:absolute !important;top:50% !important;left:50% !important;transform:translate(-50%,-50%) !important;',
        'width:168px !important;height:34px !important;box-sizing:border-box !important;',
        'display:flex !important;align-items:center !important;gap:8px !important;padding:0 13px !important;',
        'opacity:1 !important;transition:opacity .25s ease !important;',
      '}'
    );
    rules.push('#vdi.vdi-expanded #vdi-col{opacity:0 !important;pointer-events:none !important;}');
    rules.push('#vdi.vdi-idle #vdi-col{justify-content:center;padding:0;width:28px;height:28px;gap:0 !important;transition:gap .3s cubic-bezier(0.32, 0.72, 0, 1) !important;}');
    rules.push('#vdi.vdi-idle #vdi-col-text, #vdi.vdi-idle #vdi-col-btn{max-width:0 !important;opacity:0 !important;margin:0 !important;padding:0 !important;pointer-events:none !important;border:none !important;}');
    rules.push('#vdi-col-media, #vdi-col-focus{display:flex;align-items:center !important;justify-content:center !important;position:relative !important;width:18px !important;height:18px !important;flex-shrink:0 !important;}');

    // ═══════════════════════════════════════════════════════════
    // Detached Focus Bubble (anchored to island via JS)
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-focus-bubble{',
        'position:fixed !important;top:' + islandTop + 'px !important;',
        'z-index:2147483646 !important;border-radius:17px !important;overflow:hidden !important;user-select:none !important;cursor:default !important;',
        'height:34px !important;',
        'background:var(--vdi-dark,' + dark + ') !important;',
        'backdrop-filter:blur(40px) !important;-webkit-backdrop-filter:blur(40px) !important;',
        'box-shadow:0 0 0 1px rgba(255,255,255,.08),0 10px 40px rgba(0,0,0,.8),0 0 80px var(--vdi-glow,rgba(99,102,241,.18)) !important;',
        'opacity:0 !important;pointer-events:none !important;',
        'font-family:"Inter",-apple-system,system-ui,"Segoe UI",sans-serif !important;',
        '-webkit-font-smoothing:antialiased !important;-moz-osx-font-smoothing:grayscale !important;text-rendering:optimizeLegibility !important;',
        'display:flex !important;align-items:center !important;justify-content:center !important;padding:0 10px !important;gap:6px !important;box-sizing:border-box !important;',
        'width:auto !important;max-width:0 !important;',
        'transition:max-width .5s cubic-bezier(0.32, 0.72, 0, 1),opacity .3s ease,',
          'background .7s ease,box-shadow .7s ease,padding .3s cubic-bezier(0.32, 0.72, 0, 1) !important;',
      '}'
    );
    rules.push('#vdi-focus-bubble *{font-family:inherit !important;}');
    // Visible: compact pill with ring + time
    rules.push('#vdi-focus-bubble.vdi-visible{max-width:80px !important;opacity:1 !important;pointer-events:all !important;}');
    // Expanded: show controls
    rules.push('#vdi-focus-bubble.vdi-expanded{max-width:200px !important;}');

    // Progress ring — matches island accent
    rules.push(
      '.vdi-progress-ring{',
        '--progress:0;',
        'width:20px !important;height:20px !important;border-radius:50% !important;flex-shrink:0 !important;',
        'background:conic-gradient(var(--vdi-accent,' + accent + ') calc(var(--progress) * 360deg), rgba(255,255,255,0.12) 0deg) !important;',
        '-webkit-mask:radial-gradient(closest-side, transparent 78%, #000 80%) !important;',
        'mask:radial-gradient(closest-side, transparent 78%, #000 80%) !important;',
      '}'
    );

    // Timer text — matches island typography
    rules.push(
      '#vdi-focus-time{',
        'font-size:12px !important;font-weight:700 !important;color:rgba(255,255,255,0.9) !important;',
        'letter-spacing:0.3px !important;white-space:nowrap !important;',
      '}'
    );

    // Action buttons container — hidden until hover
    rules.push(
      '#vdi-focus-actions{',
        'display:flex !important;gap:4px !important;opacity:0 !important;max-width:0 !important;overflow:hidden !important;',
        'transition:opacity .2s ease,max-width .3s cubic-bezier(0.32, 0.72, 0, 1) !important;',
      '}'
    );
    rules.push('#vdi-focus-bubble.vdi-expanded #vdi-focus-actions{opacity:1 !important;max-width:100px !important;}');

    // Action buttons — same style as island buttons
    rules.push(
      '#vdi-focus-actions button{',
        'background:rgba(255,255,255,0.08) !important;border:none !important;color:rgba(255,255,255,0.8) !important;',
        'border-radius:10px !important;font-size:10px !important;font-weight:600 !important;',
        'padding:4px 8px !important;cursor:pointer !important;font-family:inherit !important;',
        'white-space:nowrap !important;transition:background .2s ease,color .2s ease !important;',
      '}'
    );
    rules.push('#vdi-focus-actions button:hover{background:rgba(255,255,255,0.15) !important;color:#fff !important;}');
    rules.push('#vdi-focus-btn-stop{color:#ff4757 !important;}');
    rules.push('#vdi-focus-btn-stop:hover{background:rgba(255,60,60,0.2) !important;}');



    // EQ Visualizer
    rules.push(
      '#vdi-eq{',
        'display:flex;align-items:flex-end;justify-content:center;gap:3px;',
        'width:16px;height:12px;flex-shrink:0;',
      '}'
    );
    rules.push(
      '.vdi-eq-bar{',
        'width:3px;height:3px;',
        'background:var(--vdi-accent,' + accent + ');',
        'border-radius:1.5px;',
        'transition:height .15s ease, background .7s ease;',
      '}'
    );

    // Track text
    rules.push('#vdi-col-text{flex:1 !important;display:flex !important;align-items:center !important;overflow:hidden !important;margin:0 10px !important;min-width:0 !important;}');
    rules.push('#vdi-col-inner{font-family:"Inter",-apple-system,system-ui,"Segoe UI",sans-serif !important;font-size:13px !important;font-weight:600 !important;color:#fff !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;transition:transform 0.3s cubic-bezier(0.32, 0.72, 0, 1),opacity 0.2s ease !important;transform:translateX(0);opacity:1;}');
    rules.push('#vdi:hover #vdi-col-inner{transform:translateX(10px) !important;opacity:0 !important;}');

    // ═══════════════════════════════════════════════════════════
    // Expanded View & Pager
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-exp{',
        'position:absolute !important;top:50% !important;left:50% !important;transform:translate(-50%,-50%) scale(.9) !important;',
        'width:400px !important;height:152px !important;box-sizing:border-box !important;',
        'opacity:0 !important;overflow:hidden !important;border-radius:26px !important;',
        'transition:opacity .35s ease .1s,transform .4s cubic-bezier(0.32, 0.72, 0, 1) !important;pointer-events:none !important;',
      '}'
    );
    rules.push('#vdi.vdi-expanded #vdi-exp{opacity:1 !important;transform:translate(-50%,-50%) scale(1) !important;pointer-events:all !important;}');
    
    // Pager Container
    // Pager Container
    rules.push(
      '#vdi-pages{',
        'position:relative !important;width:100% !important;height:100% !important;overflow:hidden !important;',
      '}'
    );
    // Page Layout
    rules.push(
      '.vdi-page{',
        'position:absolute !important;top:0 !important;left:0 !important;',
        'width:100% !important;height:100% !important;box-sizing:border-box !important;',
        'display:flex !important;align-items:center !important;padding:14px 15px !important;gap:13px !important;',
        'transition:transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease !important;opacity:0 !important;pointer-events:none !important;',
      '}'
    );
    rules.push('.vdi-page.active{opacity:1 !important;transform:translateX(0) !important;pointer-events:all !important;}');
    rules.push('.vdi-no-transition{transition:none !important;}');
    // ═══════════════════════════════════════════════════════════
    // Focus Timer Page
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-page-focus{gap:0 !important;}');
    rules.push(
      '#vdi-focus-ring-container{',
        'width:74px !important;height:74px !important;min-width:74px !important;min-height:74px !important;',
        'border-radius:14px !important;flex-shrink:0 !important;position:relative !important;',
        'display:flex;align-items:center !important;justify-content:center !important;',
        'margin-right:13px !important;',
        'transition:width 0.4s cubic-bezier(0.32, 0.72, 0, 1), min-width 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease !important;',
      '}'
    );
    rules.push(
      '.vdi-progress-ring{',
        '--progress:0;',
        'border-radius:50% !important;',
        'background:conic-gradient(var(--vdi-accent,' + accent + ') calc(var(--progress) * 360deg), rgba(255,255,255,0.1) 0deg) !important;',
      '}'
    );
    // Large Ring (Expanded)
    rules.push('.vdi-progress-ring.exp-ring{width:74px !important;height:74px !important;-webkit-mask:radial-gradient(closest-side, transparent 85%, #000 87%) !important;mask:radial-gradient(closest-side, transparent 85%, #000 87%) !important;position:absolute !important;inset:0 !important;}');
    // Hourglass (Collapsed)
    rules.push('@keyframes vdiHourglassDynamic{0%,100%{transform:rotate(0deg);} 10%{transform:rotate(-15deg);} 20%{transform:rotate(15deg);} 30%{transform:rotate(0deg);} 50%,95%{transform:rotate(180deg);}}');
    rules.push('#vdi-hourglass{width:16px !important;height:16px !important;position:absolute !important;top:50% !important;left:50% !important;transform:translate(-50%,-50%) !important;color:var(--vdi-accent,' + accent + ') !important;}');
    rules.push('#vdi-hourglass svg{width:100% !important;height:100% !important;display:block !important;transform-origin:center !important;}');
    rules.push('#vdi-col-focus.running #vdi-hourglass svg{animation:vdiHourglassDynamic 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite !important;}');

    rules.push('#vdi-focus-icon{position:absolute !important;color:var(--vdi-accent,' + accent + ') !important;opacity:0.7 !important;width:24px !important;height:24px !important;transition:opacity 0.3s ease !important;}');
    
    rules.push('#vdi-focus-inner-pages{flex:1 !important;position:relative !important;display:flex !important;align-items:center !important;justify-content:center !important;min-width:0 !important;align-self:stretch !important;}');
    rules.push('#vdi-focus-setup, #vdi-focus-track{position:absolute !important;top:0 !important;left:0 !important;width:100% !important;height:100% !important;transition:opacity 0.3s ease, transform 0.3s ease !important;display:flex !important;flex-direction:column !important;align-items:center !important;justify-content:center !important;}');
    rules.push('#vdi-focus-setup{gap:8px !important;}');
    rules.push('.vdi-focus-setup-header{font-size:14px !important;font-weight:600 !important;color:#fff !important;margin:0 !important;line-height:1 !important;}');
    
    rules.push('#vdi-focus-track{justify-content:center !important;gap:5px !important;min-width:0 !important;}');
    rules.push('.vdi-fade-out{opacity:0 !important;pointer-events:none !important;transform:translateY(10px) !important;}');
    rules.push('#vdi-focus-ring-container.vdi-ring-hide{width:0 !important;min-width:0 !important;opacity:0 !important;margin:0 !important;padding:0 !important;pointer-events:none !important;}');
    rules.push('#vdi-focus-title-row{display:flex !important;align-items:center !important;gap:6px !important;max-width:100% !important;min-width:0 !important;}');
    rules.push('#vdi-focus-title{flex:1 !important;font-size:13px !important;font-weight:600 !important;color:#fff !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;}');
    rules.push('#vdi-focus-status{font-size:11px !important;font-weight:600 !important;text-transform:uppercase !important;letter-spacing:1px !important;color:var(--vdi-accent, #fff) !important;margin:4px 0 !important;text-align:center !important;}');
    rules.push('#vdi-focus-time{font-size:24px !important;font-weight:700 !important;color:#fff !important;letter-spacing:1px !important;margin:4px 0 !important;font-variant-numeric: tabular-nums !important;}');
    rules.push('#vdi-focus-ctrl-row{display:flex !important;align-items:center !important;gap:8px !important;}');

    // Toggle switch
    rules.push('.vdi-switch{position:relative !important;display:inline-block !important;width:42px !important;height:24px !important;}');
    rules.push('.vdi-switch input{opacity:0 !important;width:0 !important;height:0 !important;}');
    rules.push('.vdi-slider{position:absolute !important;cursor:pointer !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;background-color:rgba(255,255,255,0.2) !important;transition:.3s !important;border-radius:24px !important;}');
    rules.push('.vdi-slider:before{position:absolute !important;content:"" !important;height:18px !important;width:18px !important;left:3px !important;bottom:3px !important;background-color:white !important;transition:.3s cubic-bezier(0.32, 0.72, 0, 1) !important;border-radius:50% !important;}');
    rules.push('.vdi-switch input:checked + .vdi-slider{background-color:var(--vdi-accent,' + accent + ') !important;}');
    rules.push('.vdi-switch input:checked + .vdi-slider:before{transform:translateX(18px) !important;}');


    rules.push('#vdi-teleport-btn{position:absolute !important;top:10px !important;right:40px !important;width:24px !important;height:24px !important;background:rgba(255,255,255,.08) !important;border:none !important;border-radius:50% !important;display:flex !important;align-items:center !important;justify-content:center !important;cursor:pointer !important;z-index:10 !important;color:rgba(255,255,255,.7) !important;}');
    rules.push('#vdi-teleport-btn svg{width:12px !important;height:12px !important;}');
    rules.push('#vdi-teleport-btn:hover{background:rgba(255,255,255,.15) !important;color:var(--vdi-accent, #fff) !important;}');

    // Album Art
    rules.push(
      '#vdi-art{',
        'width:74px !important;height:74px !important;min-width:74px !important;min-height:74px !important;border-radius:14px !important;flex-shrink:0 !important;overflow:hidden !important;isolation:isolate !important;box-sizing:border-box !important;padding:0 !important;margin:0 !important;border:none !important;',
        'background:var(--vdi-grad,' + gradient + ');',
        'box-shadow:0 4px 20px rgba(0,0,0,.5);',
        'display:flex;align-items:center;justify-content:center;position:relative;',
        'transition:background .7s ease;',
      '}'
    );
    rules.push('#vdi-art img{position:absolute !important;inset:0 !important;width:100% !important;height:100% !important;max-width:100% !important;max-height:100% !important;object-fit:cover !important;border-radius:14px !important;opacity:0;transition:opacity .4s ease, filter .4s ease;box-sizing:border-box !important;padding:0 !important;margin:0 !important;border:none !important;display:block !important;min-width:100% !important;min-height:100% !important;}');
    rules.push('#vdi-art img.ok{opacity:1 !important;}');
    rules.push('#vdi-art-ph{font-size:28px;line-height:1;}');

    // Track Info
    rules.push('#vdi-track{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0;}');
    rules.push('#vdi-title-row{display:flex;align-items:center;gap:6px;min-width:0;padding-right:62px;box-sizing:border-box;}');
    rules.push('#vdi-title{flex:1;font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}');

    rules.push('#vdi-artist{font-size:11px;color:rgba(255,255,255,.38);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}');

    // ═══════════════════════════════════════════════════════════
    // Progress Bar
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-prog-row{display:flex;align-items:center;gap:5px;}');
    rules.push('.vdi-t{font-size:9px;color:rgba(255,255,255,.5);min-width:22px;}');
    rules.push('#vdi-prog{flex:1;height:12px;display:flex;align-items:center;background:transparent;cursor:pointer;position:relative;}');
    rules.push('#vdi-prog::before{content:"";position:absolute;left:0;right:0;top:5px;height:2px;background:rgba(255,255,255,.2);border-radius:99px;pointer-events:none;}');
    rules.push(
      '#vdi-prog-fill{',
        'position:absolute;top:5px;left:0;height:2px;',
        'width:0%;',
        'background:var(--vdi-accent,' + accent + ');',
        'transition:width .6s linear, background .7s ease;',
        'border-radius:99px;',
        'pointer-events:none;',
      '}'
    );
    rules.push(
      '#vdi-prog-knob{',
        'position:absolute;top:6px;left:0%;transform:translate(-50%, -50%);',
        'width:8px;height:8px;border-radius:50%;',
        'background:var(--vdi-accent,' + accent + ');',
        'transition:left .6s linear, background .7s ease, opacity .2s ease;',
        'pointer-events:none;opacity:0;',
      '}'
    );
    rules.push('#vdi-prog:hover #vdi-prog-knob, .vdi-is-dragging #vdi-prog-knob { opacity: 1; }');

    // ═══════════════════════════════════════════════════════════
    // Control Buttons
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-ctrl-row{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}');
    rules.push('#vdi-ctrl-main{display:flex;align-items:center;gap:6px;}');
    rules.push('#vdi-ctrl-extra{display:flex;align-items:center;gap:3px;}');

    // Hard reset for island buttons to prevent host CSS bleed (fixes Devpost padding/margin bugs)
    rules.push('.vdi-btn, .vdi-icon-btn, #vdi-play, #vdi-settings-btn, #vdi-close-btn, #vdi-teleport-btn, #vdi-romanize-btn { box-sizing: border-box !important; padding: 0 !important; margin: 0 !important; flex-shrink: 0 !important; min-width: 0 !important; min-height: 0 !important; }');
    rules.push('.vdi-btn svg, .vdi-icon-btn svg, #vdi-play svg, #vdi-settings-btn svg, #vdi-romanize-btn svg { flex-shrink: 0 !important; margin: 0 !important; padding: 0 !important; }');

    // Standard button
    rules.push(
      '.vdi-btn{',
        'width:32px !important;height:32px !important;border-radius:50% !important;border:none !important;cursor:pointer !important;',
        'display:flex !important;align-items:center !important;justify-content:center !important;',
        'background:transparent !important;',
        'color:rgba(255,255,255,.75) !important;',
        'transition:color .2s ease,transform .25s cubic-bezier(0.32,0.72,0,1),background .25s ease !important;',
      '}'
    );
    rules.push('.vdi-btn:hover{background:rgba(255,255,255,.08) !important;color:var(--vdi-accent, #fff) !important;transform:scale(1.1) !important;}');
    rules.push('.vdi-btn:active{transform:scale(.92) !important;}');
    rules.push('.vdi-hidden{display:none !important;}');
    rules.push('.vdi-btn svg{width:16px !important;height:16px !important;pointer-events:none !important;}');
    rules.push('.vdi-platform-apple #vdi-shuffle svg, .vdi-platform-apple #vdi-repeat svg { width: 38px !important; height: 34px !important; }');
    rules.push('.vdi-platform-youtube #vdi-shuffle svg, .vdi-platform-youtube #vdi-repeat svg, .vdi-platform-ytmusic #vdi-shuffle svg, .vdi-platform-ytmusic #vdi-repeat svg { width: 22px !important; height: 22px !important; }');
    rules.push('#vdi-shuffle, #vdi-repeat{background:transparent;color:rgba(255,255,255,.35);position:relative;transition:color 0.2s,background 0.2s;}');
    
    // ── Base active: flat vibrant color (inherits accent color) ──
    rules.push('#vdi-shuffle.vdi-active, #vdi-repeat.vdi-active{color: var(--vdi-accent, ' + accent + ') !important;}');
    // ── Spotify: dot below active button ──
    rules.push('.vdi-platform-spotify #vdi-shuffle.vdi-active::after, .vdi-platform-spotify #vdi-repeat.vdi-active::after{content:""; position:absolute; bottom:-1px; left:50%; transform:translateX(-50%); width:4px; height:4px; border-radius:50%; background:var(--vdi-accent,' + accent + '); opacity:1;}');

    

    rules.push('#vdi-repeat{position:relative;}');

    // Icon button (smaller, square-ish)
    rules.push(
      '.vdi-icon-btn{',
        'width:28px !important;height:28px !important;border-radius:8px !important;border:none !important;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(255,255,255,.04) !important;',
        'color:rgba(255,255,255,.55) !important;',
        'transition:color .15s,transform .15s,background .2s;',
      '}'
    );
    rules.push('#vdi-settings-btn:hover{background:rgba(255,255,255,.15) !important;}');
    rules.push('#vdi-settings-btn:hover svg{fill:var(--vdi-accent, #fff) !important;}');
    rules.push('.vdi-icon-btn:hover{background:rgba(255,255,255,.12) !important;color:var(--vdi-accent, #fff) !important;transform:scale(1.08);}');
    rules.push('.vdi-icon-btn.active{color:var(--vdi-accent,' + accent + ') !important;}');
    rules.push('.vdi-icon-btn.loading{pointer-events: none;}');
    rules.push(
      '.vdi-loading-dots{',
        'display:flex;gap:3px;align-items:center;justify-content:center;height:100%;',
      '}'
    );
    rules.push('.vdi-loading-dots span{width:4px;height:4px;background:currentColor;border-radius:50%;animation:vdi-bounce 0.6s infinite alternate;}');
    rules.push('.vdi-loading-dots span:nth-child(2){animation-delay:0.2s;}');
    rules.push('.vdi-loading-dots span:nth-child(3){animation-delay:0.4s;}');
    
    rules.push('@keyframes vdiBreathe{0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.1);opacity:0.8;}}');
    rules.push('@keyframes vdiSteam{0%,100%{opacity:0;transform:translateY(2px);} 50%{opacity:1;transform:translateY(-2px);}}');
    rules.push('@keyframes vdiFlicker{0%,100%{transform:scale(1) rotate(0deg);opacity:1;} 25%{transform:scale(1.05) rotate(2deg);opacity:0.9;} 75%{transform:scale(0.95) rotate(-2deg);opacity:0.9;}}');
    rules.push('@keyframes vdiWobble{0%,100%{transform:rotate(0deg);} 25%{transform:rotate(3deg);} 75%{transform:rotate(-3deg);}}');
    rules.push('@keyframes vdi-bounce{ 0%{transform:translateY(0);} 100%{transform:translateY(-3px);} }');
    rules.push('.vdi-icon-btn svg{width:15px;height:15px;pointer-events:none;}');

    // Play button (premium frosted glass aesthetic - distinct but cohesive)
    rules.push(
      '#vdi-play{',
        'width:44px !important;height:44px !important;border-radius:50% !important;',
        'background:rgba(255,255,255,0.12) !important;',
        'color:#fff !important;',
        'display:flex;align-items:center;justify-content:center;border:none !important;',
        'cursor:pointer;transition:transform .25s cubic-bezier(0.32, 0.72, 0, 1), background .25s ease;',
        'backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);',
        'box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;',
      '}'
    );
    rules.push('#vdi-play:hover{background:rgba(255,255,255,0.22) !important; color:var(--vdi-accent, #fff) !important; transform:scale(1.05);}');
    rules.push('#vdi-play svg{width:20px;height:20px;fill:currentColor !important;}');

    // ═══════════════════════════════════════════════════════════
    // Lyrics Panel\n
    rules.push(
      '#vdi-tasks-panel{',
        'position:fixed;left:50%;transform:translateX(-50%) translateY(-10px);',
        'z-index:2147483646;width:340px;height:380px;border-radius:32px;overflow:hidden;',
        'font-family:system-ui,-apple-system,Inter,Segoe UI,sans-serif;',
        'background:rgba(0,0,0,0.5);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);',
        'border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.6);',
        'opacity:0;pointer-events:none;',
        'transition:opacity 0.4s cubic-bezier(.32,.72,0,1), transform 0.4s cubic-bezier(.32,.72,0,1);',
      '}'
    );
    rules.push('#vdi-tasks-panel.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:all;}');
    
    // Custom task items CSS inside island
    rules.push(
      '.vdi-task-item { display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:8px 12px; transition:all 0.2s; }',
      '.vdi-task-item:hover { background:rgba(255,255,255,0.06); }',
      '.vdi-task-item.completed { opacity: 0.5; }',
      '.vdi-task-item.completed .vdi-task-text { text-decoration: line-through; }',
      '.vdi-task-text { flex:1; font-size:12px; color:#fff; word-break:break-word; }',
      '.vdi-task-checkbox { appearance:none; -webkit-appearance:none; width:16px; height:16px; border:1px solid rgba(255,255,255,0.4); border-radius:4px; cursor:pointer; position:relative; flex-shrink:0; }',
      '.vdi-task-checkbox:checked { background:var(--vdi-accent); border-color:var(--vdi-accent); }',
      '.vdi-task-checkbox:checked::after { content:""; position:absolute; top:2px; left:5px; width:3px; height:6px; border:solid white; border-width:0 2px 2px 0; transform:rotate(45deg); }',
      '.vdi-task-prio { font-size:9px; font-weight:700; text-transform:uppercase; padding:2px 6px; border-radius:4px; }',
      '.vdi-task-del { background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer; padding:2px; transition:color 0.2s; }',
      '.vdi-task-del:hover { color:#fff; }'
    );

    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-lyrics-panel{',
        'position:fixed;left:50%;transform:translateX(-50%) translateY(-10px);',
        'z-index:2147483646;width:400px;height:380px;border-radius:32px;overflow:hidden;',
        'font-family:system-ui,-apple-system,Inter,Segoe UI,sans-serif;',
        'background:rgba(0,0,0,0.5);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);',
        'border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.6);',
        'opacity:0;pointer-events:none;',
        'transition:opacity 0.4s cubic-bezier(.32,.72,0,1), transform 0.4s cubic-bezier(.32,.72,0,1);',
        'display:flex;flex-direction:column;padding:24px 0;box-sizing:border-box;',
      '}'
    );
    rules.push('#vdi-lyrics-panel.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:all;}');

    rules.push(
      '#vdi-lyrics-scroll{width:100%;height:100%;overflow-y:auto;overflow-x:hidden;padding:50% 24px;box-sizing:border-box;scroll-behavior:smooth;}',
      '#vdi-lyrics-footer{position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:11px;color:rgba(255,255,255,0.4);padding:4px 0;background:linear-gradient(to top, rgba(0,0,0,0.4), transparent);pointer-events:none;z-index:10;}',
      '#vdi-resume-scroll-btn{position:absolute;top:16px;left:50%;transform:translateX(-50%) translateY(-20px);z-index:20;background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:16px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;opacity:0;pointer-events:none;transition:all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);}',
      '#vdi-resume-scroll-btn:hover{background:rgba(255,255,255,0.25);transform:translateX(-50%) scale(1.05);}',
      '#vdi-resume-scroll-btn.show{opacity:1;pointer-events:all;transform:translateX(-50%) translateY(0);}',
      '#vdi-lyrics-scroll{',
        'flex:1;overflow-y:auto;scroll-behavior:smooth;padding:0 32px;',
        'mask-image:linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);',
        '-webkit-mask-image:linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);',
      '}'
    );
    rules.push('#vdi-lyrics-scroll::-webkit-scrollbar{display:none;}');

    // Lyric lines
    rules.push(
      '.vdi-lyric-line{',
        'font-size:22px;font-weight:700;line-height:1.6;color:rgba(255,255,255,0.3);',
        'padding:16px 0;',
        'margin: 0 10px;',
        'transition:color 0.3s ease, transform 0.3s cubic-bezier(0.2,0.8,0.2,1), filter 0.3s ease;',
        'transform-origin:center center;cursor:pointer;',
        'filter:blur(2px);transform:scale(0.95);',
      '}'
    );
    rules.push('.vdi-lyric-line:hover{color:rgba(255,255,255,0.6);filter:blur(0px);}');
    rules.push(
      '.vdi-lyric-line.active{',
        'transform:scale(1.05);text-shadow:0 4px 20px rgba(0,0,0,0.5);filter:blur(0px);',
        'color: #fff;',
      '}'
    );
    rules.push('#vdi-romanize-btn:hover{background:rgba(255,255,255,0.2) !important; color:#fff !important;}');
    rules.push('#vdi-romanize-btn.active{background:#fff !important; color:#000 !important;}');
    rules.push('@keyframes sweep{ 0%{background-position:100% 0;} 100%{background-position:0% 0;} }');
    rules.push('.vdi-lyric-line.active{color:rgba(255,255,255,1);filter:blur(0);transform:scale(1.1);}',
      '.vdi-lyric-line.has-words.active{color:rgba(255,255,255,0.5);}',
      '.vdi-lyric-word{transition:color 0.15s ease-out, text-shadow 0.15s ease-out;}',
      '.vdi-lyric-word.active-word{color:var(--vdi-accent, #fff);text-shadow:0 0 16px var(--vdi-accent, rgba(255,255,255,0.4));}',
      '.vdi-lyric-roman{font-size:14px;font-weight:500;color:inherit;opacity:0.6;margin-top:4px;}'
    );
    rules.push('.vdi-lyric-line.unsynced{font-size:16px;color:rgba(255,255,255,0.8);transform:none;filter:none;}');
    rules.push('.vdi-lyric-translation{font-size:14px;color:rgba(255,255,255,0.5);margin-top:6px;font-weight:500;}');
    rules.push(
      '.vdi-lyrics-source{',
        'font-size:12px;color:rgba(255,255,255,0.4);margin-top:40px;text-align:center;',
      '}'
    );
    rules.push(
      '.vdi-lyrics-source a{',
        'color:rgba(255,255,255,0.6);text-decoration:none;font-weight:600;transition:color 0.2s;',
      '}'
    );
    rules.push('.vdi-lyrics-source a:hover{color:#fff;}');
    rules.push(
      '.vdi-instrumental-wrapper{',
        'display:flex;justify-content:center;align-items:center;height:40px;margin-top:8px;',
      '}'
    );
    rules.push(
      '.vdi-instrumental{',
        'position:relative;width:32px;height:32px;',
      '}'
    );
    rules.push(
      '.vdi-note-bg, .vdi-note-fill{',
        'position:absolute;top:0;left:0;width:100%;height:100%;',
        'fill:rgba(255,255,255,0.2);',
      '}'
    );
    rules.push(
      '.vdi-note-fill{',
        'fill:#fff;',
        'clip-path:inset(100% 0 0 0);',
        '-webkit-clip-path:inset(100% 0 0 0);',
      '}'
    );

    // Provider Menu
    rules.push(
      '#vdi-prov-menu{position:absolute;bottom:12px;right:12px;display:flex;gap:6px;z-index:100;}',
      '.vdi-prov-btn{',
        'display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:12px;',
        'background:rgba(255,255,255,0.1);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
        'font-size:11px;font-weight:600;color:rgba(255,255,255,0.4);',
        'cursor:not-allowed;transition:all 0.2s; border: 1px solid rgba(255,255,255,0.05);',
      '}',
      '.vdi-prov-btn.has-lyr{cursor:pointer; color:rgba(255,255,255,0.7);}',
      '.vdi-prov-btn.has-lyr:hover{background:rgba(255,255,255,0.2);}',
      '.vdi-prov-btn.active{background:rgba(255,255,255,0.25); color:#fff; border-color:rgba(255,255,255,0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.2);}',
      '.vdi-prov-dot{width:6px;height:6px;border-radius:50%;background:#ff4444;box-shadow:0 0 8px rgba(255,68,68,0.5);transition:all 0.2s;}',
      '.vdi-prov-btn.has-lyr .vdi-prov-dot{background:#44ff44;box-shadow:0 0 8px rgba(68,255,68,0.5);}'
    );    // ═══════════════════════════════════════════════════════════
    // Snap Zones (Drop Indicators)
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-snap-zones{position:fixed;inset:0;pointer-events:none;z-index:2147483646;opacity:0;transition:opacity .3s;}',
      '#vdi-snap-zones.active{opacity:1;}',
      '.vdi-sz{position:absolute;background:rgba(255,255,255,0.06);border:2px dashed rgba(255,255,255,0.3);border-radius:26px;transition:all .25s cubic-bezier(0.34, 1.56, 0.64, 1);}',
      '.vdi-sz-t{top:10px;left:50%;transform:translateX(-50%);width:400px;height:152px;}',
      '.vdi-sz-b{bottom:10px;left:50%;transform:translateX(-50%);width:400px;height:152px;}',
      '.vdi-sz-l{top:50%;left:10px;transform:translateY(-50%);width:400px;height:152px;}',
      '.vdi-sz-r{top:50%;right:10px;transform:translateY(-50%);width:400px;height:152px;}',
      '.vdi-sz.active{background:rgba(99,102,241,0.15);border-color:#6366f1;box-shadow:0 0 30px rgba(99,102,241,0.3);transform:translateX(-50%) scale(1.03);}',
      '.vdi-sz-l.active, .vdi-sz-r.active{transform:translateY(-50%) scale(1.03);}'
    );

    // Settings Panel & Gear Icon
    rules.push(
      '#vdi-settings-btn{',
        'width:24px !important;height:24px !important;position:absolute !important;top:10px !important;left:10px !important;border-radius:50% !important;',
        'display:flex !important;align-items:center !important;justify-content:center !important;cursor:pointer !important;opacity:0 !important;',
        'transition:all 0.2s !important;background:rgba(255,255,255,0.1) !important;z-index:3 !important;',
      '}',
      '#vdi:hover #vdi-settings-btn{opacity:1 !important;}',
      '#vdi-settings-btn:hover{background:rgba(255,255,255,0.25) !important;transform:rotate(45deg) !important;}',
      '#vdi-settings-btn svg{width:14px;height:14px;fill:rgba(255,255,255,0.8);}',

      '#vdi-stg-tooltip{position:fixed; width:150px; box-sizing: border-box !important; background:rgba(20,20,30,0.9); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; display:none; flex-direction:column; gap:8px; z-index:2147483647; box-shadow:0 10px 20px rgba(0,0,0,0.5); opacity:0; pointer-events:none; transition:opacity 0.3s, transform 0.3s; transform:translateY(-10px); font-family:system-ui,sans-serif;}',
      '#vdi-stg-tooltip.show{opacity:1; pointer-events:all; transform:translateY(0);}',
      '#vdi-stg-tooltip:before{content:""; position:absolute; top:12px; right:-6px; border-top:6px solid transparent; border-bottom:6px solid transparent; border-left:6px solid rgba(20,20,30,0.9);}',
      '#vdi-stg-tooltip span{font-size:12px; color:rgba(255,255,255,0.9); font-weight:500; line-height:1.4;}',
      '#vdi-stg-tooltip-btn{background:var(--vdi-accent, #6366f1); border:none; color:#fff; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit;}',
      '#vdi-stg-tooltip-btn:hover{filter:brightness(1.2);}',

    );
    rules.push('#vdi.vdi-idle #vdi-art{opacity:0 !important; max-width:0 !important; margin:0 !important; overflow:hidden !important; border:none !important;}');

    return rules.join('');
  }

  return {
    generate: generate,
    DEFAULTS: DEFAULTS
  };
})();
