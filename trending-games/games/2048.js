(function () {
  var BEST_KEY = '2048_best_score';
  var SIZE = 4;

  Games.register('2048', {
    title: '2048',
    icon: '🔢',
    description: 'Slide tiles, merge matching numbers, reach 2048.',
    bestLabel: function () {
      var best = GameUtil.getBest(BEST_KEY, 0);
      return best ? 'Best: ' + best : '';
    },
    init: function (root, U) {
      var grid, score, over, won, wonAnnounced;

      var hud = U.el('div', { class: 'hud' }, [
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Score' }),
          U.el('div', { class: 'stat-value', id: 'g2Score', text: '0' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Best' }),
          U.el('div', { class: 'stat-value', id: 'g2Best', text: '0' })
        ])
      ]);

      var board = U.el('div', { class: 'board-2048', id: 'g2Board' });
      var msg = U.el('div', { class: 'msg', text: 'Use arrow keys, WASD, or swipe to play.' });
      var newBtn = U.el('button', { class: 'btn secondary', text: 'New game' });

      root.appendChild(hud);
      root.appendChild(board);
      root.appendChild(msg);
      root.appendChild(U.el('div', { class: 'btn-row' }, [newBtn]));

      function emptyGrid() {
        var g = [];
        for (var r = 0; r < SIZE; r++) g.push([0, 0, 0, 0]);
        return g;
      }

      function addRandomTile() {
        var empties = [];
        for (var r = 0; r < SIZE; r++) {
          for (var c = 0; c < SIZE; c++) {
            if (grid[r][c] === 0) empties.push([r, c]);
          }
        }
        if (empties.length === 0) return;
        var pick = empties[U.randInt(0, empties.length - 1)];
        grid[pick[0]][pick[1]] = Math.random() < 0.9 ? 2 : 4;
      }

      function getLine(dir, i) {
        var l = [];
        if (dir === 'left') return grid[i].slice();
        if (dir === 'right') return grid[i].slice().reverse();
        if (dir === 'up') { for (var r = 0; r < SIZE; r++) l.push(grid[r][i]); return l; }
        if (dir === 'down') { for (var r = SIZE - 1; r >= 0; r--) l.push(grid[r][i]); return l; }
      }

      function setLine(dir, i, line) {
        if (dir === 'left') { grid[i] = line.slice(); return; }
        if (dir === 'right') { grid[i] = line.slice().reverse(); return; }
        if (dir === 'up') { for (var r = 0; r < SIZE; r++) grid[r][i] = line[r]; return; }
        if (dir === 'down') { for (var r = 0; r < SIZE; r++) grid[SIZE - 1 - r][i] = line[r]; return; }
      }

      function compressAndMerge(line) {
        var arr = line.filter(function (v) { return v !== 0; });
        var gain = 0;
        for (var i = 0; i < arr.length - 1; i++) {
          if (arr[i] === arr[i + 1]) {
            arr[i] *= 2;
            gain += arr[i];
            arr.splice(i + 1, 1);
          }
        }
        while (arr.length < SIZE) arr.push(0);
        return { arr: arr, gain: gain };
      }

      function arraysEqual(a, b) {
        for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
        return true;
      }

      function canMoveAt(dir) {
        for (var i = 0; i < SIZE; i++) {
          var line = getLine(dir, i);
          var res = compressAndMerge(line);
          if (!arraysEqual(line, res.arr)) return true;
        }
        return false;
      }

      function isGameOver() {
        return !['left', 'right', 'up', 'down'].some(canMoveAt);
      }

      function move(dir) {
        if (over) return;
        var moved = false;
        var totalGain = 0;
        for (var i = 0; i < SIZE; i++) {
          var before = getLine(dir, i);
          var res = compressAndMerge(before);
          if (!arraysEqual(before, res.arr)) moved = true;
          setLine(dir, i, res.arr);
          totalGain += res.gain;
        }
        if (moved) {
          score += totalGain;
          addRandomTile();
          render();
          if (!won && hasTile(2048)) {
            won = true;
            if (!wonAnnounced) {
              wonAnnounced = true;
              msg.textContent = 'You reached 2048! Keep going for a higher score.';
              msg.className = 'msg good';
            }
          }
          if (isGameOver()) {
            over = true;
            msg.textContent = 'Game over — no more moves. Final score: ' + score;
            msg.className = 'msg bad';
          }
          var best = U.getBest(BEST_KEY, 0);
          if (score > best) U.setBest(BEST_KEY, score);
        }
      }

      function hasTile(v) {
        for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) if (grid[r][c] === v) return true;
        return false;
      }

      function render() {
        board.innerHTML = '';
        for (var r = 0; r < SIZE; r++) {
          for (var c = 0; c < SIZE; c++) {
            var v = grid[r][c];
            var cls = 'tile' + (v ? ' tile-' + v : '');
            board.appendChild(U.el('div', { class: cls, text: v ? String(v) : '' }));
          }
        }
        root.querySelector('#g2Score').textContent = score;
        root.querySelector('#g2Best').textContent = U.getBest(BEST_KEY, 0);
      }

      function newGame() {
        grid = emptyGrid();
        score = 0;
        over = false;
        won = false;
        wonAnnounced = false;
        addRandomTile();
        addRandomTile();
        msg.textContent = 'Use arrow keys, WASD, or swipe to play.';
        msg.className = 'msg';
        render();
      }

      var keyMap = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: 'left', d: 'right', w: 'up', s: 'down',
        A: 'left', D: 'right', W: 'up', S: 'down'
      };
      function onKey(e) {
        var dir = keyMap[e.key];
        if (!dir) return;
        e.preventDefault();
        move(dir);
      }

      var touchStartX = 0, touchStartY = 0, touching = false;
      function onTouchStart(e) {
        if (e.touches.length !== 1) return;
        touching = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
      function onTouchEnd(e) {
        if (!touching) return;
        touching = false;
        var t = e.changedTouches[0];
        var dx = t.clientX - touchStartX;
        var dy = t.clientY - touchStartY;
        var absX = Math.abs(dx), absY = Math.abs(dy);
        if (Math.max(absX, absY) < 24) return;
        if (absX > absY) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
      }

      document.addEventListener('keydown', onKey);
      board.addEventListener('touchstart', onTouchStart, { passive: true });
      board.addEventListener('touchend', onTouchEnd, { passive: true });
      newBtn.addEventListener('click', newGame);

      newGame();

      return function cleanup() {
        document.removeEventListener('keydown', onKey);
        board.removeEventListener('touchstart', onTouchStart);
        board.removeEventListener('touchend', onTouchEnd);
        newBtn.removeEventListener('click', newGame);
      };
    }
  });
})();
