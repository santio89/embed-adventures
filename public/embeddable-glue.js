// ================================================================
// EMBEDDABLE GLUE
// ================================================================
// Bridges game-engine.js with the Embeddables `game` page.
//
// The Embeddables flow has:
//   - Pre-game pages (main_menu / single_player_setup / create_room /
//     join_room) built from real Embeddables components
//     (CustomButton, InputBox, OptionSelector, PlainText). Their
//     onclick actions call `window.EMBEDDABLOB.*()` from this file.
//   - A single `game` page containing one CustomHTML with the canvas
//     and all the live game overlays (lobby, results, pause,
//     countdown). This file repaints those overlays in response to
//     engine events.
//
// Element contract inside the `game` page CustomHTML:
//   #emb-game-root       — root wrapper, has data-scene attr
//   #gameCanvas, #crtOverlay, #scanlineToggle  — engine-owned
//   #emb-lobby           — lobby overlay
//     #emb-lobby-code      span with current room code
//     #emb-lobby-players   div populated with player chips
//     #emb-lobby-color-picker  div populated with colour swatches
//     #emb-start-btn       button (host-only)
//     #emb-wait-msg        text shown to non-hosts
//   #emb-results         — results overlay
//     #emb-results-board   div populated with rankings
//     #emb-replay-btn      button (host-only)
//   #emb-pause           — pause overlay
//   #emb-countdown       — countdown text
//   #emb-race-timeline   — live race progress bars
//   #emb-create-error / #emb-join-error  — error slots on create/join
//                                           pages (NOT inside game-root)

(function _embeddableGlueBootstrap() {
  if (!window.EmbeddablobEngine) {
    setTimeout(_embeddableGlueBootstrap, 50);
    return;
  }

  var Engine = window.EmbeddablobEngine;
  var $ = function(id) { return document.getElementById(id); };
  // Keep one source of truth for the latest lobby state so the
  // colour picker can rerender whenever the Embeddables OptionSelector
  // re-mounts (page navigation).
  var lastLobbyState = null;
  var lastIsHost = false;

  // ----------------------------------------------------------------
  // OPTION SELECTOR SYNC (single_player_setup page)
  // ----------------------------------------------------------------
  // The colour picker on the single-player setup page is a real
  // Embeddables OptionSelector. We don't repaint its DOM; we only
  // need to (a) read the current selection so the engine knows what
  // colour to use, and (b) gray out colours that are taken by other
  // players if we ever re-use that selector inside an active lobby.
  //
  // Embeddables marks the selected option-button with a CSS class
  // (e.g. `selected`); we don't depend on the exact class name —
  // we read aria-checked / data-selected / .selected and fall back
  // to scanning ElementKey-{color} classes.
  function readSelectedColorFromOptionSelector() {
    var nodes = document.querySelectorAll(
      '.ComponentTag-game_color_picker .Flow-Element.ElementType-OptionButtonCard'
    );
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var isSelected =
        n.getAttribute('aria-checked') === 'true' ||
        n.getAttribute('data-selected') === 'true' ||
        n.classList.contains('selected') ||
        n.classList.contains('is-selected');
      if (!isSelected) continue;
      var color = readElementKey(n);
      if (color) return color;
    }
    return null;
  }

  function readElementKey(node) {
    var classes = (node.className || '').split(/\s+/);
    for (var i = 0; i < classes.length; i++) {
      var c = classes[i];
      if (c.indexOf('ElementKey-') === 0) return c.substring('ElementKey-'.length);
    }
    return null;
  }

  function applyTakenColorsToOptionSelector(takenColors) {
    var nodes = document.querySelectorAll(
      '.ComponentTag-game_color_picker .Flow-Element.ElementType-OptionButtonCard'
    );
    var taken = takenColors || [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var k = readElementKey(n);
      if (!k) continue;
      var isTaken = taken.indexOf(k) !== -1;
      n.classList.toggle('emb-color-taken', isTaken);
    }
  }

  // ----------------------------------------------------------------
  // GAME ROOT POLLING
  // ----------------------------------------------------------------
  // The game CustomHTML may not exist yet when this script first
  // loads (Embeddables only renders the active page). We attach a
  // MutationObserver so we repaint as soon as it appears AND across
  // future remounts.
  var rootObserver = null;
  function withGameRoot(cb) {
    var root = $('emb-game-root');
    if (root) cb(root);
  }

  function setScene(scene) {
    withGameRoot(function(root) {
      root.setAttribute('data-scene', scene);
      var lobby   = $('emb-lobby');
      var results = $('emb-results');
      var pause   = $('emb-pause');
      if (lobby)   lobby.classList.toggle('emb-hidden', scene !== 'lobby');
      if (results) results.classList.toggle('emb-hidden', scene !== 'results');
      if (pause)   pause.classList.toggle('emb-hidden', scene !== 'paused');
    });
  }

  function setOverlayVisible(id, visible) {
    var el = $(id);
    if (el) el.classList.toggle('emb-hidden', !visible);
  }

  // ----------------------------------------------------------------
  // RENDERERS (mirror standalone-glue but write into emb-* elements)
  // ----------------------------------------------------------------
  function getPlayerDisplayColor(colorId) {
    var opts = Engine.getColorOptions();
    for (var i = 0; i < opts.length; i++) if (opts[i].id === colorId) return opts[i].hat;
    return opts[0].hat;
  }

  function truncateName(name, maxLen) {
    var s = String(name == null ? '' : name);
    return s.length <= maxLen ? s : s.substring(0, maxLen);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[<>&]/g, function(ch) {
      return ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&amp;';
    });
  }

  function renderLobbyPlayers(players) {
    var div = $('emb-lobby-players');
    if (!div) return;
    var myId = Engine.getMyPlayerId();
    div.innerHTML = (players || []).map(function(p, i) {
      var col = getPlayerDisplayColor(p.color || 'lavender');
      var nm = truncateName(p.name, 12);
      return '<div class="emb-player-row" style="color:' + col + '">' +
             (i === 0 ? '<span class="emb-host-star">&#9733;</span> ' : '<span class="emb-host-star-spacer"></span>') +
             escapeHtml(nm) +
             (p.id === myId ? ' <span class="emb-you-tag">(YOU)</span>' : '') +
             '</div>';
    }).join('');
  }

  function renderLobbyColorPicker(takenColors) {
    var div = $('emb-lobby-color-picker');
    if (!div) return;
    var taken = takenColors || [];
    var options = Engine.getColorOptions();
    var selected = Engine.getSelectedColor();
    div.innerHTML = options.map(function(c) {
      var isTaken = taken.indexOf(c.id) !== -1;
      var isSelected = c.id === selected;
      var cls = 'emb-color-swatch';
      if (isSelected) cls += ' selected';
      if (isTaken) cls += ' taken';
      return '<div class="' + cls + '" style="background:' + c.hat + ';" ' +
             'data-color="' + c.id + '" ' +
             'onclick="window.EMBEDDABLOB.selectColor(\'' + c.id + '\')"></div>';
    }).join('');
  }

  function renderResults(rankings, isHost) {
    var div = $('emb-results-board');
    if (!div) return;
    var winner = rankings[0];
    var myId = Engine.getMyPlayerId();

    var rankLabel = function(i) { return '#' + (i + 1); };
    var titleStr = (winner && winner.finished)
      ? truncateName(winner.name, 12).toUpperCase() + ' WINS'
      : 'MATCH OVER';

    var rowsHtml = rankings.map(function(p, i) {
      var col = getPlayerDisplayColor(p.color || 'lavender');
      var isMe = p.id === myId;

      var statusCls = 'emb-r-status';
      var statusStr;
      if (p.finished) {
        statusStr = 'FIN ' + (p.finishTime / 1000).toFixed(2) + 'S';
        statusCls += ' finished';
      } else if (!p.alive) {
        statusStr = 'ELIMINATED';
        statusCls += ' dead';
      } else {
        statusStr = Math.round((p.progress || 0) * 100) + '% PROG';
      }

      var finalScore = p.finalScore || 0;
      var coinCount = p.coins || 0;

      var cls = ['emb-results-row', 'emb-rank-' + (i + 1)];
      if (isMe) cls.push('emb-is-me');
      var tag = (i === 0)
        ? '<span class="emb-r-tag">1ST</span>'
        : (isMe ? '<span class="emb-r-tag" style="background:#b890ff; color:#1a0a3e;">YOU</span>' : '');

      var safeName = truncateName(String(p.name || 'BLOBBY'), 12).toUpperCase().replace(/[<>&]/g, '');

      return '<div class="' + cls.join(' ') + '" ' +
             'style="--row-col:' + col + '; --chip-col:' + col + '; --name-col:' + col + ';">' +
             tag +
             '<span class="emb-r-rank">' + rankLabel(i) + '</span>' +
             '<span class="emb-r-name-cell"><span class="emb-r-chip"></span><span class="emb-r-name">' + safeName + '</span></span>' +
             '<span class="emb-r-score">' + finalScore + '</span>' +
             '<div class="emb-r-meta">' +
               '<span class="' + statusCls + '">' + statusStr + '</span>' +
               '<span class="emb-r-coin">COINS x' + coinCount + '</span>' +
             '</div>' +
             '</div>';
    }).join('');

    var footerHtml;
    if (winner && winner.finished) {
      footerHtml = 'WINNER<span class="emb-winner-name" style="color:' +
        getPlayerDisplayColor(winner.color || 'lavender') + '">' +
        truncateName(String(winner.name || ''), 12).toUpperCase() + '</span>';
    } else {
      footerHtml = rankings.length + ' BLOB' + (rankings.length === 1 ? '' : 'S') + ' RANKED';
    }

    div.innerHTML = '<div class="emb-results-board-inner">' +
      '<div class="emb-results-title">' + titleStr + '</div>' +
      '<div class="emb-results-rows">' + rowsHtml + '</div>' +
      '<div class="emb-results-footer">' + footerHtml + '</div>' +
      '</div>';

    var replayBtn = $('emb-replay-btn');
    if (replayBtn) replayBtn.style.display = isHost ? '' : 'none';
  }

  function runCountdown() {
    var el = $('emb-countdown');
    if (!el) return;
    el.style.display = 'block';
    var count = 3;
    el.textContent = count;
    var iv = setInterval(function() {
      count--;
      if (count > 0) el.textContent = count;
      else if (count === 0) el.textContent = 'GO!';
      else { el.style.display = 'none'; clearInterval(iv); }
    }, 1000);
  }

  function renderTimeline(players) {
    var div = $('emb-timeline-players');
    if (!div) return;
    var sorted = (players || []).slice().sort(function(a, b) {
      return (b.progress || 0) - (a.progress || 0);
    });
    div.innerHTML = sorted.map(function(p) {
      var pct = Math.round((p.progress || 0) * 100);
      var col = getPlayerDisplayColor(p.color || 'lavender');
      var initial = ((p.name || '?')[0] || '?').toUpperCase();
      var status = '';
      if (p.finished) status = ' ' + (p.finishTime / 1000).toFixed(1) + 's';
      else if (!p.alive) status = ' ELIMINATED';
      return '<div class="emb-timeline-player">' +
        '<div class="emb-timeline-name" style="color:' + col + '">' +
          '<span class="emb-timeline-initial" style="background:' + col + ';">' + escapeHtml(initial) + '</span>' +
          escapeHtml(status) +
        '</div>' +
        '<div class="emb-timeline-bar-bg">' +
          '<div class="emb-timeline-bar-fill" style="width:' + pct + '%;background:' + col + ';"></div>' +
        '</div>' +
      '</div>';
    }).join('');
    var wrap = $('emb-race-timeline');
    if (wrap) wrap.classList.add('visible');
  }

  // ----------------------------------------------------------------
  // ENGINE EVENT SUBSCRIPTIONS
  // ----------------------------------------------------------------
  Engine.on('scanlines_changed', function(p) {
    var btn = $('scanlineToggle');
    if (!btn) return;
    btn.textContent = p.on ? 'CRT: ON' : 'CRT: OFF';
    if (typeof btn.blur === 'function') btn.blur();
  });

  Engine.on('lobby_state', function(p) {
    lastLobbyState = p;
    lastIsHost = !!p.isHost;
    setScene('lobby');
    var code = $('emb-lobby-code');
    if (code) code.textContent = p.code || '';
    renderLobbyPlayers(p.players);
    renderLobbyColorPicker(p.takenColors);
    var startBtn = $('emb-start-btn');
    var waitMsg  = $('emb-wait-msg');
    if (startBtn) startBtn.style.display = p.isHost ? '' : 'none';
    if (waitMsg)  waitMsg.style.display  = p.isHost ? 'none' : '';
    // Mirror taken state onto the SP-page OptionSelector too, in case
    // we ever route back there.
    applyTakenColorsToOptionSelector(p.takenColors);
  });

  Engine.on('countdown_started', function() {
    runCountdown();
  });

  Engine.on('match_started', function() {
    setScene('playing');
    setOverlayVisible('emb-pause', false);
  });

  Engine.on('race_progress', function(p) {
    renderTimeline(p.players);
  });

  Engine.on('paused', function() {
    setOverlayVisible('emb-pause', true);
  });

  Engine.on('unpaused', function() {
    setOverlayVisible('emb-pause', false);
  });

  Engine.on('match_finished', function(p) {
    setScene('results');
    var rt = $('emb-race-timeline');
    if (rt) rt.classList.remove('visible');
    renderResults(p.rankings, p.isHost);
  });

  Engine.on('room_closed', function() {
    setScene('lobby');
    var rt = $('emb-race-timeline'); if (rt) rt.classList.remove('visible');
  });

  Engine.on('quit_to_menu', function() {
    setScene('lobby');
    var rt = $('emb-race-timeline'); if (rt) rt.classList.remove('visible');
  });

  Engine.on('create_room_failed', function(p) {
    var err = $('emb-create-error');
    if (err) err.textContent = (p && p.error) || 'Failed to create room';
  });

  Engine.on('join_room_failed', function(p) {
    var err = $('emb-join-error');
    if (err) err.textContent = (p && p.error) || 'Failed to join room';
  });

  // ----------------------------------------------------------------
  // GAME-PAGE MUTATION OBSERVER
  // ----------------------------------------------------------------
  // Every time the Embeddables flow re-mounts the game page, the old
  // emb-* elements get torn down and we need to repaint based on the
  // last known engine state. The body MutationObserver is cheap
  // because we only react when #emb-game-root appears or disappears.
  function attachRootObserver() {
    if (rootObserver) return;
    rootObserver = new MutationObserver(function() {
      if (!$('emb-game-root')) return;
      // Game root is on screen — repaint from last known state.
      if (lastLobbyState) {
        // Synthesize a re-emit of the last lobby state so the new
        // CustomHTML's elements get filled.
        setScene(Engine.isMultiplayer() ? 'lobby' : 'playing');
        var code = $('emb-lobby-code');
        if (code) code.textContent = lastLobbyState.code || '';
        renderLobbyPlayers(lastLobbyState.players);
        renderLobbyColorPicker(lastLobbyState.takenColors);
        var startBtn = $('emb-start-btn');
        var waitMsg  = $('emb-wait-msg');
        if (startBtn) startBtn.style.display = lastIsHost ? '' : 'none';
        if (waitMsg)  waitMsg.style.display  = lastIsHost ? 'none' : '';
      }
      // Sync scanline button label.
      var btn = $('scanlineToggle');
      if (btn) btn.textContent = Engine.getScanlinesOn() ? 'CRT: ON' : 'CRT: OFF';
    });
    rootObserver.observe(document.body, { childList: true, subtree: true });
  }
  attachRootObserver();

  // ----------------------------------------------------------------
  // PUBLIC API (called by Embeddables actions and inline onclicks)
  // ----------------------------------------------------------------
  window.EMBEDDABLOB = {
    // Engine state introspection (handy for actions deciding where to
    // navigate after a call).
    isHost:           function() { return Engine.isHost(); },
    getRoomCode:      function() { return Engine.getCurrentRoomCode(); },
    getSelectedColor: function() { return Engine.getSelectedColor(); },

    // Colour selection (called from lobby colour swatches, and may
    // also be called from action JS when the OptionSelector changes).
    selectColor: function(colorId) {
      Engine.setSelectedColor(colorId);
      renderLobbyColorPicker(lastLobbyState ? lastLobbyState.takenColors : []);
    },

    // Pre-game flow.
    startSinglePlayer: function(opts) {
      var color = (opts && opts.color) || readSelectedColorFromOptionSelector() || Engine.getSelectedColor();
      Engine.startSinglePlayer({ color: color });
    },

    createRoom: function(opts) {
      opts = opts || {};
      var color = opts.color || Engine.getSelectedColor();
      var err = $('emb-create-error'); if (err) err.textContent = '';
      return Engine.createRoom({
        name: opts.name,
        color: color,
        matchDuration: opts.matchDuration,
      });
    },

    joinRoom: function(opts) {
      opts = opts || {};
      var color = opts.color || Engine.getSelectedColor();
      var err = $('emb-join-error'); if (err) err.textContent = '';
      return Engine.joinRoom({
        code: opts.code,
        name: opts.name,
        color: color,
      });
    },

    // In-game flow (called from inline onclicks inside the game page
    // CustomHTML overlay buttons).
    startMatch:      function() { Engine.startMatch(); },
    returnToLobby:   function() { Engine.returnToLobby(); },
    leaveRoom:       function() { Engine.leaveRoom(); },
    resumeGame:      function() { Engine.resumeGame(); },
    quitToMenu:      function() { Engine.quitToMenu(); },
    toggleScanlines: function() { Engine.toggleScanlines(); },
  };
})();
