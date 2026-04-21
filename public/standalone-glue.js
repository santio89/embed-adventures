// ================================================================
// STANDALONE GLUE
// ================================================================
// Bridges game-engine.js with the menu DOM in public/index.html.
//
// Owns:
//   - The #menuOverlay sub-panels (#menuMain / #menuSinglePlayer /
//     #menuCreate / #menuJoin / #menuLobby / #menuResults)
//   - The #pauseOverlay
//   - The #countdown overlay
//   - The #scanlineToggle button label
//   - The window.fnName globals invoked by inline `onclick=` handlers
//     in index.html
//
// Does not own:
//   - The canvas, CRT overlay, mobile controls, or any gameplay state
//     (those belong to game-engine.js).
//
// All multiplayer / single-player state transitions are driven by
// EmbeddablobEngine event subscriptions; this file does not talk to
// the socket directly.

(function _standaloneGlueBootstrap() {
  // game-engine.js sets up window.EmbeddablobEngine asynchronously
  // (the engine itself polls for #gameCanvas before initializing). We
  // poll here so we don't have to depend on script load order beyond
  // "engine is defer'd before us".
  if (!window.EmbeddablobEngine) {
    setTimeout(_standaloneGlueBootstrap, 50);
    return;
  }

  var Engine = window.EmbeddablobEngine;
  var $ = function(id) { return document.getElementById(id); };

  // --------------------------------------------------------------
  // MENU NAVIGATION
  // --------------------------------------------------------------
  var MENU_PANEL_IDS = [
    'menuMain', 'menuSinglePlayer', 'menuCreate',
    'menuJoin', 'menuLobby', 'menuResults',
  ];

  function hideAllMenuPanels() {
    for (var i = 0; i < MENU_PANEL_IDS.length; i++) {
      var el = $(MENU_PANEL_IDS[i]);
      if (el) el.style.display = 'none';
    }
    // The decorative attract-screen scene (blob mascot, hills, clouds)
    // belongs to the main attract screen only — sub-panels get the
    // simpler dark surface so the form fields stay readable.
    var scene = document.querySelector('#menuOverlay .menu-scene');
    if (scene) scene.style.display = 'none';
  }

  function showMenu() {
    hideAllMenuPanels();
    var main = $('menuMain'); if (main) main.style.display = '';
    var scene = document.querySelector('#menuOverlay .menu-scene');
    if (scene) scene.style.display = '';
    var ov = $('menuOverlay'); if (ov) ov.classList.remove('hidden');
    var rt = $('raceTimeline'); if (rt) rt.classList.remove('visible');
  }

  function hideMenu() {
    var ov = $('menuOverlay'); if (ov) ov.classList.add('hidden');
  }

  function showMainMenu() {
    hideAllMenuPanels();
    var main = $('menuMain'); if (main) main.style.display = '';
    var scene = document.querySelector('#menuOverlay .menu-scene');
    if (scene) scene.style.display = '';
  }

  function showCreateRoom() {
    hideAllMenuPanels();
    var p = $('menuCreate'); if (p) p.style.display = '';
    var err = $('createError'); if (err) err.textContent = '';
  }

  function showJoinRoom() {
    hideAllMenuPanels();
    var p = $('menuJoin'); if (p) p.style.display = '';
    var err = $('joinError'); if (err) err.textContent = '';
  }

  function showSinglePlayerSetup() {
    hideAllMenuPanels();
    var p = $('menuSinglePlayer'); if (p) p.style.display = '';
    renderColorPicker('singleColorPicker', []);
  }

  function showLobby(code, players, isHost, takenColors) {
    hideAllMenuPanels();
    var p = $('menuLobby'); if (p) p.style.display = '';
    var ov = $('menuOverlay'); if (ov) ov.classList.remove('hidden');
    var lc = $('lobbyCode'); if (lc) lc.textContent = code || '';
    updateLobbyPlayers(players);
    renderColorPicker('lobbyColorPicker', takenColors || []);
    var startBtn = $('startBtn');
    var waitMsg  = $('waitMsg');
    if (startBtn) startBtn.style.display = isHost ? '' : 'none';
    if (waitMsg)  waitMsg.style.display  = isHost ? 'none' : '';
  }

  // --------------------------------------------------------------
  // COLOR PICKER (lifted from game.js)
  // --------------------------------------------------------------
  function renderColorPicker(containerId, takenColors) {
    var container = $(containerId);
    if (!container) return;
    var taken = takenColors || [];
    var options = Engine.getColorOptions();
    var selected = Engine.getSelectedColor();
    container.innerHTML = options.map(function(c) {
      var isTaken = taken.indexOf(c.id) !== -1;
      var isSelected = c.id === selected;
      var cls = 'color-swatch';
      if (isSelected) cls += ' selected';
      if (isTaken) cls += ' taken';
      return '<div class="' + cls + '" style="background:' + c.hat + ';" ' +
             'data-color="' + c.id + '" ' +
             'onclick="selectColor(\'' + containerId + '\',\'' + c.id + '\')"></div>';
    }).join('');
  }

  function selectColor(containerId, colorId) {
    Engine.setSelectedColor(colorId);
    renderColorPicker(containerId, []);
  }

  // --------------------------------------------------------------
  // LOBBY / TIMELINE / RESULTS RENDERING (lifted from game.js)
  // --------------------------------------------------------------
  function getPlayerDisplayColor(colorId) {
    var opts = Engine.getColorOptions();
    for (var i = 0; i < opts.length; i++) if (opts[i].id === colorId) return opts[i].hat;
    return opts[0].hat;
  }

  function truncateName(name, maxLen) {
    var s = String(name == null ? '' : name);
    if (s.length <= maxLen) return s;
    return s.substring(0, maxLen);
  }

  function updateLobbyPlayers(players) {
    var div = $('lobbyPlayers');
    if (!div) return;
    var myId = Engine.getMyPlayerId();
    div.innerHTML = (players || []).map(function(p, i) {
      var col = getPlayerDisplayColor(p.color || 'lavender');
      var nm = truncateName(p.name, 12);
      return '<div style="color:' + col + '">' +
             (i === 0 ? '&#9733; ' : '  ') +
             nm +
             (p.id === myId ? ' (You)' : '') +
             '</div>';
    }).join('');
  }

  function showResults(rankings, isHost) {
    hideAllMenuPanels();
    var rp = $('menuResults'); if (rp) rp.style.display = '';
    var ov = $('menuOverlay'); if (ov) ov.classList.remove('hidden');
    var rt = $('raceTimeline'); if (rt) rt.classList.remove('visible');

    var div = $('resultsPlayers');
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

      var statusCls = 'r-status';
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

      var cls = ['results-row', 'rank-' + (i + 1)];
      if (isMe) cls.push('is-me');
      var tag = (i === 0)
        ? '<span class="r-tag">1ST</span>'
        : (isMe ? '<span class="r-tag" style="background:#b890ff; color:#1a0a3e;">YOU</span>' : '');

      var safeName = truncateName(String(p.name || 'BLOBBY'), 12).toUpperCase().replace(/[<>&]/g, '');

      return '<div class="' + cls.join(' ') + '" ' +
             'style="--row-col:' + col + '; --chip-col:' + col + '; --name-col:' + col + ';">' +
             tag +
             '<span class="r-rank">' + rankLabel(i) + '</span>' +
             '<span class="r-name-cell"><span class="r-chip"></span><span class="r-name">' + safeName + '</span></span>' +
             '<span class="r-score">' + finalScore + '</span>' +
             '<div class="r-meta">' +
               '<span class="' + statusCls + '">' + statusStr + '</span>' +
               '<span class="r-coin">COINS x' + coinCount + '</span>' +
             '</div>' +
             '</div>';
    }).join('');

    var footerHtml;
    if (winner && winner.finished) {
      footerHtml = 'WINNER<span class="winner-name" style="color:' +
        getPlayerDisplayColor(winner.color || 'lavender') + '">' +
        truncateName(String(winner.name || ''), 12).toUpperCase() + '</span>';
    } else {
      footerHtml = rankings.length + ' BLOB' + (rankings.length === 1 ? '' : 'S') + ' RANKED';
    }

    div.innerHTML = '<div class="results-board">' +
      '<div class="results-title">' + titleStr + '</div>' +
      '<div class="results-rows">' + rowsHtml + '</div>' +
      '<div class="results-footer">' + footerHtml + '</div>' +
      '</div>';

    var replayBtn = $('replayBtn');
    if (replayBtn) replayBtn.style.display = isHost ? '' : 'none';
  }

  function showCountdown() {
    var el = $('countdown');
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

  // --------------------------------------------------------------
  // ENGINE EVENT SUBSCRIPTIONS
  // --------------------------------------------------------------
  Engine.on('scanlines_changed', function(p) {
    var btn = $('scanlineToggle');
    if (!btn) return;
    btn.textContent = p.on ? 'CRT: ON' : 'CRT: OFF';
    // Drop focus so Space/Enter (jump/start) doesn't re-trigger
    // the button while the player is back in gameplay.
    if (typeof btn.blur === 'function') btn.blur();
  });

  Engine.on('lobby_state', function(p) {
    showLobby(p.code, p.players, p.isHost, p.takenColors);
  });

  Engine.on('countdown_started', function() {
    showCountdown();
  });

  Engine.on('match_started', function() {
    hideMenu();
    var pause = $('pauseOverlay');
    if (pause) pause.classList.add('hidden');
  });

  Engine.on('paused', function() {
    var p = $('pauseOverlay'); if (p) p.classList.remove('hidden');
  });

  Engine.on('unpaused', function() {
    var p = $('pauseOverlay'); if (p) p.classList.add('hidden');
  });

  Engine.on('match_finished', function(p) {
    showResults(p.rankings, p.isHost);
  });

  Engine.on('room_closed', function() {
    showMenu();
  });

  Engine.on('quit_to_menu', function() {
    showMenu();
  });

  Engine.on('create_room_pending', function() {
    var btn = document.querySelector('#menuCreate .menu-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>CREATING...'; }
    var err = $('createError'); if (err) err.textContent = '';
  });

  Engine.on('create_room_failed', function(p) {
    var btn = document.querySelector('#menuCreate .menu-btn');
    if (btn) { btn.disabled = false; btn.innerHTML = 'CREATE'; }
    var err = $('createError'); if (err) err.textContent = (p && p.error) || 'Failed to create room';
  });

  Engine.on('join_room_pending', function() {
    var btn = document.querySelector('#menuJoin .menu-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>JOINING...'; }
    var err = $('joinError'); if (err) err.textContent = '';
  });

  Engine.on('join_room_failed', function(p) {
    var btn = document.querySelector('#menuJoin .menu-btn');
    if (btn) { btn.disabled = false; btn.innerHTML = 'JOIN'; }
    var err = $('joinError'); if (err) err.textContent = (p && p.error) || 'Failed to join room';
  });

  // --------------------------------------------------------------
  // WINDOW BINDINGS (for index.html inline onclick handlers)
  // --------------------------------------------------------------
  // Engine API pass-throughs.
  window.toggleScanlines    = Engine.toggleScanlines;
  window.resumeGame         = Engine.resumeGame;
  window.quitToMenu         = Engine.quitToMenu;

  window.startSinglePlayer  = function() {
    hideMenu();
    Engine.startSinglePlayer({ color: Engine.getSelectedColor() });
  };
  window.startMultiplayerGame = Engine.startMatch;
  window.returnToLobby      = Engine.returnToLobby;
  window.leaveRoom          = Engine.leaveRoom;

  // Menu navigation pass-throughs.
  window.showSinglePlayerSetup = showSinglePlayerSetup;
  window.showMainMenu          = showMainMenu;
  window.showCreateRoom        = showCreateRoom;
  window.showJoinRoom          = showJoinRoom;
  window.selectColor           = selectColor;

  window.createRoom = function() {
    var name = ($('createName') && $('createName').value || '').trim() || 'Blobby';
    // Original behaviour: pick a fresh random colour each time you
    // create a room (the standalone create form doesn't have a
    // colour picker — only the lobby does).
    var opts = Engine.getColorOptions();
    var randomColor = opts[Math.floor(Math.random() * opts.length)].id;
    Engine.setSelectedColor(randomColor);
    Engine.createRoom({ name: name });
  };

  window.joinRoom = function() {
    var code = ($('joinCode') && $('joinCode').value || '').trim().toUpperCase();
    var name = ($('joinName') && $('joinName').value || '').trim() || 'Blobby';
    Engine.joinRoom({ code: code, name: name });
  };

  // --------------------------------------------------------------
  // INITIAL PAINT
  // --------------------------------------------------------------
  showMenu();
})();
