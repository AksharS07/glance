const fs = require('fs');
let c = fs.readFileSync('src/core.js', 'utf8');

const anchorStart = "var shuffleOn = false;";
const anchorEnd = "return {";

const idxStart = c.indexOf(anchorStart);
const idxEnd = c.indexOf(anchorEnd, idxStart);

if (idxStart === -1 || idxEnd === -1) {
  console.log("Could not find anchors");
  process.exit(1);
}

const before = c.substring(0, idxStart);
const after = c.substring(idxEnd);

const newBlock = `var shuffleOn = false;
      var repeatMode = 'off';
      if (isYTMusic) {
        var playerBar = document.querySelector('ytmusic-player-bar');
        
        function isNodeActive(el) {
          if (!el) return false;
          if (el.getAttribute('aria-pressed') === 'true') return true;
          if (el.getAttribute('is-toggled') === 'true') return true;
          var title = (el.getAttribute('title') || el.getAttribute('aria-label') || '').toLowerCase();
          if (title.includes('turn off') || title.includes('disable')) return true;
          
          var children = deepQuery('*', el);
          for (var i = 0; i < children.length; i++) {
             if (children[i].getAttribute('aria-pressed') === 'true') return true;
             if (children[i].getAttribute('is-toggled') === 'true') return true;
             var ct = (children[i].getAttribute('title') || children[i].getAttribute('aria-label') || '').toLowerCase();
             if (ct.includes('turn off') || ct.includes('disable')) return true;
          }
          
          var icon = deepQueryOne('yt-icon, svg', el) || el;
          if (icon) {
             var cStr = window.getComputedStyle(icon).color || '';
             var fStr = window.getComputedStyle(icon).fill || '';
             // Active state usually sets color to white. 
             // We check for '255, 255, 255' ignoring alpha
             if (cStr.includes('255, 255, 255') || fStr.includes('255, 255, 255')) return true;
             
             // Also check for 'rgb(255,255,255)' with no spaces just in case
             if (cStr.includes('rgb(255,255,255)') || fStr.includes('rgb(255,255,255)')) return true;
             
             // Check if it matches Vivaldi dark theme explicit white
             if (cStr === '#fff' || cStr === '#ffffff' || fStr === '#fff' || fStr === '#ffffff') return true;
          }
          return false;
        }

        var rc = deepQueryOne('.right-controls-buttons, .right-controls', playerBar);
        var shuffleEl = null;
        var repeatEl = null;
        
        if (rc) {
           var toggles = [];
           var children = rc.children;
           for (var i = 0; i < children.length; i++) {
              if (children[i].tagName.toLowerCase() === 'ytmusic-toggle-button-renderer') {
                 toggles.push(children[i]);
              }
           }
           if (toggles.length === 2) {
              repeatEl = toggles[0];
              shuffleEl = toggles[1];
           } else {
              // Fallback to searching the whole bar if layout changed
              shuffleEl = deepQueryOne('ytmusic-toggle-button-renderer[aria-label*="shuffle" i], ytmusic-toggle-button-renderer[title*="shuffle" i]', playerBar);
              repeatEl = deepQueryOne('ytmusic-toggle-button-renderer[aria-label*="repeat" i], ytmusic-toggle-button-renderer[title*="repeat" i]', playerBar);
           }
        } else {
           // Fallback if right-controls isn't found
           shuffleEl = deepQueryOne('ytmusic-toggle-button-renderer[aria-label*="shuffle" i], ytmusic-toggle-button-renderer[title*="shuffle" i]', playerBar);
           repeatEl = deepQueryOne('ytmusic-toggle-button-renderer[aria-label*="repeat" i], ytmusic-toggle-button-renderer[title*="repeat" i]', playerBar);
        }
        
        if (shuffleEl && isNodeActive(shuffleEl)) {
           shuffleOn = true;
        }
        
        if (repeatEl) {
           var rTitle = (repeatEl.getAttribute('title') || repeatEl.getAttribute('aria-label') || '').toLowerCase();
           var elChildren = deepQuery('*', repeatEl);
           for (var j = 0; j < elChildren.length; j++) {
              rTitle += ' ' + (elChildren[j].getAttribute('title') || elChildren[j].getAttribute('aria-label') || '').toLowerCase();
           }
           
           if (isNodeActive(repeatEl)) {
              if (rTitle.includes('one') || rTitle.includes('1')) {
                 repeatMode = 'one';
              } else {
                 repeatMode = 'all';
              }
           } else if (rTitle.includes('one') || rTitle.includes('1')) {
              // Sometimes it's active but our active detection failed, yet the title clearly says it's on "Repeat One"
              repeatMode = 'one';
           }
        }
      }

      `;

fs.writeFileSync('src/core.js', before + newBlock + after);
console.log('Fixed YTM logic block in core.js');
