/**
 * Dynamic Island - Shared CSS Styles
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
        'position:fixed;top:' + islandTop + 'px;left:50%;transform:translateX(-50%);',
        'z-index:2147483647;border-radius:32px;overflow:hidden;user-select:none;cursor:default;',
        'width:168px;height:34px;',
        'background:var(--vdi-dark,' + dark + ');',
        'box-shadow:0 0 0 1px rgba(255,255,255,.08),0 10px 40px rgba(0,0,0,.8),0 0 80px var(--vdi-glow,rgba(99,102,241,.18));',
        'opacity:0;pointer-events:none;',
        'font-family:-apple-system,Inter,Segoe UI,sans-serif;',
        '-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;letter-spacing:normal;line-height:normal;',
        'transition:width .55s cubic-bezier(0.34, 1.56, 0.64, 1),height .55s cubic-bezier(0.34, 1.56, 0.64, 1),',
          'border-radius .55s cubic-bezier(0.34, 1.56, 0.64, 1),background .7s ease,box-shadow .7s ease,opacity .3s ease;',
      '}'
    );

    // State classes
    rules.push('#vdi.vdi-visible{opacity:1;pointer-events:all;}');
    rules.push('#vdi.vdi-expanded{width:400px;height:152px;border-radius:26px;}');
    rules.push('#vdi.vdi-idle{width:28px!important;height:28px!important;border-radius:14px!important;opacity:.95!important;}');

    // ═══════════════════════════════════════════════════════════
    // Collapsed Pill View
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-col{',
        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);',
        'width:168px;height:34px;box-sizing:border-box;',
        'display:flex;align-items:center;gap:8px;padding:0 13px;',
        'opacity:1;transition:opacity .18s ease;',
      '}'
    );
    rules.push('#vdi.vdi-expanded #vdi-col{opacity:0;pointer-events:none;}');
    rules.push('#vdi.vdi-idle #vdi-col{justify-content:center;padding:0;width:28px;height:28px;}');
    rules.push('#vdi.vdi-idle #vdi-col-text,#vdi.vdi-idle #vdi-col-btn{display:none;}');

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
    rules.push('#vdi-col-text{flex:1;overflow:hidden;white-space:nowrap;transition:width 0.3s ease, flex 0.3s ease;}');
    rules.push(
      '#vdi-col-inner{',
        'display:inline-block;font-size:11px;font-weight:500;color:rgba(255,255,255,.82);',
        'animation:vdi-scroll 9s linear infinite;',
      '}'
    );
    rules.push('@keyframes vdi-scroll{0%,28%{transform:translateX(0)}72%{transform:translateX(-55%)}100%{transform:translateX(0)}}');
    rules.push('#vdi-col-btn{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;}');

    // ═══════════════════════════════════════════════════════════
    // Expanded View
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-exp{',
        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(.9);',
        'width:400px;height:152px;box-sizing:border-box;',
        'display:flex;align-items:center;padding:14px 15px;gap:13px;',
        'opacity:0;',
        'transition:opacity .28s ease .13s,transform .28s ease .13s;pointer-events:none;',
      '}'
    );
    rules.push('#vdi.vdi-expanded #vdi-exp{opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:all;}');

    rules.push(
      '#vdi-teleport-btn{',
        'position:absolute;top:12px;right:44px;width:28px;height:28px;z-index:50;',
        'background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.35);border-radius:50%;padding:5px;cursor:pointer;',
        'color:#fff;opacity:1;transition:background 0.2s,transform 0.15s;display:flex;flex-shrink:0;',
      '}',
      '#vdi-teleport-btn:hover{background:rgba(255,255,255,0.32);transform:scale(1.1);}',
      '#vdi-teleport-btn svg{width:100%;height:100%;pointer-events:none;}'
    );

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
    rules.push('#vdi-title-row{display:flex;align-items:center;gap:6px;min-width:0;}');
    rules.push('#vdi-title{flex:1;font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}');

    rules.push('#vdi-artist{font-size:11px;color:rgba(255,255,255,.38);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}');

    // ═══════════════════════════════════════════════════════════
    // Progress Bar
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-prog-row{display:flex;align-items:center;gap:5px;}');
    rules.push('.vdi-t{font-size:9px;color:rgba(255,255,255,.5);min-width:22px;}');
    rules.push('#vdi-prog{flex:1;height:4px;background:rgba(255,255,255,.15);border-radius:99px;cursor:pointer;position:relative;}');
    rules.push(
      '#vdi-prog-fill{',
        'height:100%;width:0%;border-radius:99px;',
        'background:var(--vdi-accent,' + accent + ') ;',
        'transition:width .6s linear, background .7s ease;',
      '}'
    );

    // ═══════════════════════════════════════════════════════════
    // Control Buttons
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-ctrl-row{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}');
    rules.push('#vdi-ctrl-main{display:flex;align-items:center;gap:6px;}');
    rules.push('#vdi-ctrl-extra{display:flex;align-items:center;gap:3px;}');

    // Standard button
    rules.push(
      '.vdi-btn{',
        'width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(255,255,255,.07);color:rgba(255,255,255,.75);',
        'transition:background .2s,transform .15s,color .15s;',
      '}'
    );
    rules.push('.vdi-btn:hover{background:rgba(255,255,255,.16);color:#fff;transform:scale(1.1);}');
    rules.push('.vdi-btn:active{transform:scale(.92);}');
    rules.push('.vdi-btn svg{width:16px;height:16px;pointer-events:none;}');
    rules.push('#vdi-shuffle, #vdi-repeat{background:transparent;color:rgba(255,255,255,.4);}');
    rules.push('#vdi-shuffle:hover, #vdi-repeat:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.9);}');
    rules.push('#vdi-shuffle.vdi-active, #vdi-repeat.vdi-active{color:var(--vdi-accent,' + accent + ') !important; filter: drop-shadow(0 0 6px var(--vdi-accent,' + accent + '));}');
    rules.push('#vdi-repeat{position:relative;}');

    // Icon button (smaller, square-ish)
    rules.push(
      '.vdi-icon-btn{',
        'width:28px;height:28px;border-radius:8px;border:none;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(255,255,255,.06);color:rgba(255,255,255,.55);',
        'transition:background .2s,color .2s,transform .15s;',
      '}'
    );
    rules.push('.vdi-icon-btn:hover{background:rgba(255,255,255,.15);color:#fff;transform:scale(1.08);}');
    rules.push('.vdi-icon-btn.active{color:var(--vdi-accent,' + accent + ');}');
    rules.push('.vdi-icon-btn.loading{pointer-events: none;}');
    rules.push(
      '.vdi-loading-dots{',
        'display:flex;gap:3px;align-items:center;justify-content:center;height:100%;',
      '}'
    );
    rules.push('.vdi-loading-dots span{width:4px;height:4px;background:currentColor;border-radius:50%;animation:vdi-bounce 0.6s infinite alternate;}');
    rules.push('.vdi-loading-dots span:nth-child(2){animation-delay:0.2s;}');
    rules.push('.vdi-loading-dots span:nth-child(3){animation-delay:0.4s;}');
    rules.push('@keyframes vdi-bounce{ 0%{transform:translateY(0);} 100%{transform:translateY(-3px);} }');
    rules.push('.vdi-icon-btn svg{width:15px;height:15px;pointer-events:none;}');

    // Play button (special styling)
    rules.push(
      '#vdi-play{',
        'width:40px;height:40px;border-radius:50%;',
        'background:var(--vdi-grad,' + gradient + ');',
        'color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.45);',
        'display:flex;align-items:center;justify-content:center;border:none;',
        'cursor:pointer;transition:background .7s ease, transform .15s;',
      '}'
    );
    rules.push('#vdi-play:hover{transform:scale(1.08);filter:brightness(1.1);}');
    rules.push('#vdi-play svg{width:18px;height:18px;}');

    // ═══════════════════════════════════════════════════════════
    // Lyrics Panel
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-lyrics-panel{',
        'position:fixed;left:50%;transform:translateX(-50%) translateY(-10px);',
        'z-index:2147483646;width:400px;height:380px;border-radius:32px;overflow:hidden;',
        'font-family:-apple-system,Inter,Segoe UI,sans-serif;',
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
      '.vdi-lyric-word.active-word{color:#fff;text-shadow:0 0 16px rgba(255,255,255,0.4);}',
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
        'width:24px;height:24px;position:absolute;top:10px;left:10px;border-radius:50%;',
        'display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;',
        'transition:all 0.2s;background:rgba(255,255,255,0.1);z-index:3;',
      '}',
      '#vdi:hover #vdi-settings-btn{opacity:1;}',
      '#vdi-settings-btn:hover{background:rgba(255,255,255,0.25);transform:rotate(45deg);}',
      '#vdi-settings-btn svg{width:14px;height:14px;fill:rgba(255,255,255,0.8);}',

      '#vdi-stg-tooltip{position:fixed; width:180px; background:rgba(20,20,30,0.9); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; display:none; flex-direction:column; gap:8px; z-index:2147483647; box-shadow:0 10px 20px rgba(0,0,0,0.5); opacity:0; pointer-events:none; transition:opacity 0.3s, transform 0.3s; transform:translateY(-10px); font-family:system-ui,sans-serif;}',
      '#vdi-stg-tooltip.show{opacity:1; pointer-events:all; transform:translateY(0);}',
      '#vdi-stg-tooltip:before{content:""; position:absolute; top:-6px; left:16px; border-left:6px solid transparent; border-right:6px solid transparent; border-bottom:6px solid rgba(20,20,30,0.9);}',
      '#vdi-stg-tooltip span{font-size:12px; color:rgba(255,255,255,0.9); font-weight:500; line-height:1.4;}',
      '#vdi-stg-tooltip-btn{background:var(--vdi-accent, #6366f1); border:none; color:#fff; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit;}',
      '#vdi-stg-tooltip-btn:hover{filter:brightness(1.2);}',
      '#vdi-settings-panel{',
        'position:fixed;width:280px;padding:16px;',
        'background:rgba(20,20,30,0.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);',
        'border:1px solid rgba(255,255,255,0.1);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.5);',
        'display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);',
        'transform:translateX(-50%);z-index:2147483647;font-family:system-ui,sans-serif;',
      '}',
      '#vdi-settings-panel.show{opacity:1;pointer-events:all;}',
      '.vdi-stg-row{display:flex;justify-content:space-between;align-items:center; margin-bottom:12px;}',
      '.vdi-stg-label{color:rgba(255,255,255,0.9);font-size:13px;font-weight:500;}',
      '.vdi-stg-sub{font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px;}',
      '.vdi-switch{position:relative;display:inline-block;width:36px;height:20px;}',
      '.vdi-switch input{opacity:0;width:0;height:0;}',
      '.vdi-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:rgba(255,255,255,0.1);transition:.3s;border-radius:20px;border:1px solid rgba(255,255,255,0.1);}',
      '.vdi-slider:before{position:absolute;content:"";height:14px;width:14px;left:2px;bottom:2px;background-color:rgba(255,255,255,0.6);transition:.3s;border-radius:50%;}',
      '.vdi-switch input:checked + .vdi-slider{background-color:var(--vdi-accent, #6366f1);border-color:transparent;}',
      '.vdi-switch input:checked + .vdi-slider:before{transform:translateX(16px);background-color:#fff;}',
      '.vdi-stg-header{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--vdi-accent, #6366f1);margin-bottom:4px;font-weight:600;opacity:0.8;}',
      '.vdi-preset-btn{background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:rgba(255,255,255,0.8); padding:4px 0; width:22%; border-radius:8px; cursor:pointer; font-family:inherit; font-size:11px; font-weight:600; transition:all 0.2s;}',
      '.vdi-preset-btn:hover{background:var(--vdi-accent, #6366f1); color:#fff; border-color:transparent;}'
    );

    return rules.join('');
  }

  return {
    generate: generate,
    DEFAULTS: DEFAULTS
  };
})();
