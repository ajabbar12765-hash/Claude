(function () {
  var BEST_PREFIX = 'mine_best_ms_';
  var DIFFICULTIES = {
    easy: { rows: 9, cols: 9, mines: 10, label: 'Easy' },
    medium: { rows: 12, cols: 10, mines: 20, label: 'Medium' }
  };

  Games.register('minesweeper', {
    title: 'Minesweeper',
    icon: '💣',
    description: 'Clear the board without detonating a mine. Flag the ones you find.',
    bestLabel: function () {
      var best = GameUtil.getBest(BEST_PREFIX + 'easy', null);
      return best ? 'Best (Easy): ' + GameUtil.fmtTime(best) : '';
    },
    init: function (root, U) {
      var diffKey = 'easy';
      var rows, cols, mines, grid, revealedCount, flagCount, started, over, startTime, timerId;
      var cellHandlers = [];
      var longPressTimer = null;

      var hud = U.el('div', { class: 'hud' }, [
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Mines' }),
          U.el('div', { class: 'stat-value', id: 'msMines', text: '0' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Time' }),
          U.el('div', { class: 'stat-value', id: 'msTime', text: '00.00' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Best' }),
          U.el('div', { class: 'stat-value', id: 'msBest', text: '—' })
        ])
      ]);

      var diffRow = U.el('div', { class: 'btn-row' });
      var diffButtons = {};
      Object.keys(DIFFICULTIES).forEach(function (key) {
        var b = U.el('button', { class: 'btn ghost', text: DIFFICULTIES[key].label });
        diffButtons[key] = b;
        diffRow.appendChild(b);
      });

      var boardWrap = U.el('div', { class: 'mine-grid', id: 'msGrid' });
      var msg = U.el('div', { class: 'msg', text: 'Tap to reveal. Long-press (or right-click) to flag.' });
      var restartBtn = U.el('button', { class: 'btn secondary', text: 'New board' });

      root.appendChild(hud);
      root.appendChild(diffRow);
      root.appendChild(boardWrap);
      root.appendChild(msg);
      root.appendChild(U.el('div', { class: 'btn-row' }, [restartBtn]));

      function refreshBest() {
        var best = U.getBest(BEST_PREFIX + diffKey, null);
        root.querySelector('#msBest').textContent = best ? U.fmtTime(best) : '—';
      }

      function tick() {
        root.querySelector('#msTime').textContent = U.fmtTime(performance.now() - startTime);
      }

      function inBounds(r, c) { return r >= 0 && r < rows && c >= 0 && c < cols; }

      function neighbors(r, c) {
        var out = [];
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            if (inBounds(r + dr, c + dc)) out.push([r + dr, c + dc]);
          }
        }
        return out;
      }

      function buildEmptyGrid() {
        var g = [];
        for (var r = 0; r < rows; r++) {
          var row = [];
          for (var c = 0; c < cols; c++) row.push({ mine: false, revealed: false, flagged: false, adj: 0 });
          g.push(row);
        }
        return g;
      }

      function placeMines(excludeR, excludeC) {
        var exclude = {};
        neighbors(excludeR, excludeC).concat([[excludeR, excludeC]]).forEach(function (p) {
          exclude[p[0] + ',' + p[1]] = true;
        });
        var placed = 0;
        while (placed < mines) {
          var r = U.randInt(0, rows - 1), c = U.randInt(0, cols - 1);
          if (exclude[r + ',' + c] || grid[r][c].mine) continue;
          grid[r][c].mine = true;
          placed++;
        }
        for (var r2 = 0; r2 < rows; r2++) {
          for (var c2 = 0; c2 < cols; c2++) {
            if (grid[r2][c2].mine) continue;
            grid[r2][c2].adj = neighbors(r2, c2).filter(function (p) { return grid[p[0]][p[1]].mine; }).length;
          }
        }
      }

      function cellNode(r, c) {
        return boardWrap.children[r * cols + c];
      }

      function renderCell(r, c) {
        var cell = grid[r][c];
        var node = cellNode(r, c);
        node.className = 'mine-cell';
        node.textContent = '';
        if (cell.revealed) {
          node.classList.add('open');
          if (cell.mine) {
            node.classList.add('mine');
            node.textContent = '💣';
          } else if (cell.adj > 0) {
            node.classList.add('n' + cell.adj);
            node.textContent = String(cell.adj);
          }
        } else if (cell.flagged) {
          node.classList.add('flag');
          node.textContent = '🚩';
        }
      }

      function renderAll() {
        for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) renderCell(r, c);
      }

      function floodReveal(r, c) {
        var stack = [[r, c]];
        while (stack.length) {
          var p = stack.pop();
          var rr = p[0], cc = p[1];
          var cell = grid[rr][cc];
          if (cell.revealed || cell.flagged) continue;
          cell.revealed = true;
          revealedCount++;
          if (cell.adj === 0 && !cell.mine) {
            neighbors(rr, cc).forEach(function (n) {
              if (!grid[n[0]][n[1]].revealed) stack.push(n);
            });
          }
        }
      }

      function revealAllMines() {
        for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) if (grid[r][c].mine) grid[r][c].revealed = true;
      }

      function endGame(won) {
        over = true;
        clearInterval(timerId);
        if (won) {
          var finalMs = performance.now() - startTime;
          var best = U.getBest(BEST_PREFIX + diffKey, null);
          if (best === null || finalMs < best) {
            U.setBest(BEST_PREFIX + diffKey, finalMs);
            msg.textContent = 'New best! Cleared in ' + U.fmtTime(finalMs) + '.';
            msg.className = 'msg good';
          } else {
            msg.textContent = 'Board cleared in ' + U.fmtTime(finalMs) + '!';
            msg.className = 'msg good';
          }
          refreshBest();
        } else {
          revealAllMines();
          renderAll();
          msg.textContent = 'Boom! You hit a mine. Tap New board to try again.';
          msg.className = 'msg bad';
        }
      }

      function handleReveal(r, c) {
        if (over) return;
        var cell = grid[r][c];
        if (cell.flagged || cell.revealed) return;
        if (!started) {
          started = true;
          placeMines(r, c);
          startTime = performance.now();
          timerId = setInterval(tick, 50);
        }
        if (cell.mine) {
          cell.revealed = true;
          endGame(false);
          return;
        }
        floodReveal(r, c);
        renderAll();
        if (revealedCount === rows * cols - mines) endGame(true);
      }

      function handleFlag(r, c) {
        if (over) return;
        var cell = grid[r][c];
        if (cell.revealed) return;
        cell.flagged = !cell.flagged;
        flagCount += cell.flagged ? 1 : -1;
        root.querySelector('#msMines').textContent = mines - flagCount;
        renderCell(r, c);
      }

      function attachHandlers() {
        cellHandlers.forEach(function (h) {
          h.node.removeEventListener('click', h.onClick);
          h.node.removeEventListener('contextmenu', h.onContext);
          h.node.removeEventListener('touchstart', h.onTouchStart);
          h.node.removeEventListener('touchend', h.onTouchEnd);
        });
        cellHandlers = [];
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            (function (rr, cc) {
              var node = cellNode(rr, cc);
              var longPressed = false;
              var onClick = function () { handleReveal(rr, cc); };
              var onContext = function (e) { e.preventDefault(); handleFlag(rr, cc); };
              var onTouchStart = function () {
                longPressed = false;
                longPressTimer = setTimeout(function () { longPressed = true; handleFlag(rr, cc); }, 450);
              };
              var onTouchEnd = function (e) {
                clearTimeout(longPressTimer);
                if (longPressed) e.preventDefault();
              };
              node.addEventListener('click', onClick);
              node.addEventListener('contextmenu', onContext);
              node.addEventListener('touchstart', onTouchStart, { passive: true });
              node.addEventListener('touchend', onTouchEnd);
              cellHandlers.push({ node: node, onClick: onClick, onContext: onContext, onTouchStart: onTouchStart, onTouchEnd: onTouchEnd });
            })(r, c);
          }
        }
      }

      function newGame(key) {
        if (key) diffKey = key;
        var d = DIFFICULTIES[diffKey];
        rows = d.rows; cols = d.cols; mines = d.mines;
        clearInterval(timerId);
        clearTimeout(longPressTimer);
        grid = buildEmptyGrid();
        revealedCount = 0;
        flagCount = 0;
        started = false;
        over = false;

        boardWrap.style.gridTemplateColumns = 'repeat(' + cols + ', 30px)';
        boardWrap.innerHTML = '';
        for (var i = 0; i < rows * cols; i++) boardWrap.appendChild(U.el('div', { class: 'mine-cell' }));
        attachHandlers();

        root.querySelector('#msMines').textContent = mines;
        root.querySelector('#msTime').textContent = '00.00';
        msg.textContent = 'Tap to reveal. Long-press (or right-click) to flag.';
        msg.className = 'msg';
        refreshBest();

        Object.keys(diffButtons).forEach(function (k) {
          diffButtons[k].classList.toggle('secondary', k !== diffKey);
        });
      }

      restartBtn.addEventListener('click', function () { newGame(); });
      Object.keys(diffButtons).forEach(function (key) {
        diffButtons[key].addEventListener('click', function () { newGame(key); });
      });

      newGame('easy');

      return function cleanup() {
        clearInterval(timerId);
        clearTimeout(longPressTimer);
        cellHandlers.forEach(function (h) {
          h.node.removeEventListener('click', h.onClick);
          h.node.removeEventListener('contextmenu', h.onContext);
          h.node.removeEventListener('touchstart', h.onTouchStart);
          h.node.removeEventListener('touchend', h.onTouchEnd);
        });
      };
    }
  });
})();
