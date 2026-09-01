(function () {
  var WIN_KEY = 'ttt_wins';
  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  Games.register('tictactoe', {
    title: 'Tic-Tac-Toe',
    icon: '❌',
    description: 'Play against an unbeatable computer. Can you force a draw?',
    bestLabel: function () {
      var wins = GameUtil.getBest(WIN_KEY, 0);
      return wins ? 'Wins: ' + wins : '';
    },
    init: function (root, U) {
      var board, over, aiTimer;

      var hud = U.el('div', { class: 'hud' }, [
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Wins' }),
          U.el('div', { class: 'stat-value', id: 'tttWins', text: '0' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Draws' }),
          U.el('div', { class: 'stat-value', id: 'tttDraws', text: '0' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Losses' }),
          U.el('div', { class: 'stat-value', id: 'tttLosses', text: '0' })
        ])
      ]);

      var grid = U.el('div', { class: 'ttt-grid' });
      var cells = [];
      for (var i = 0; i < 9; i++) {
        var cell = U.el('div', { class: 'ttt-cell' });
        cells.push(cell);
        grid.appendChild(cell);
      }

      var msg = U.el('div', { class: 'msg', text: 'You are X. Tap a square to start.' });
      var restartBtn = U.el('button', { class: 'btn secondary', text: 'New round' });

      root.appendChild(hud);
      root.appendChild(grid);
      root.appendChild(msg);
      root.appendChild(U.el('div', { class: 'btn-row' }, [restartBtn]));

      function refreshStats() {
        root.querySelector('#tttWins').textContent = U.getBest(WIN_KEY, 0);
        root.querySelector('#tttDraws').textContent = U.getBest('ttt_draws', 0);
        root.querySelector('#tttLosses').textContent = U.getBest('ttt_losses', 0);
      }

      function winnerOf(b) {
        for (var i = 0; i < LINES.length; i++) {
          var l = LINES[i];
          if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return b[l[0]];
        }
        if (b.every(function (v) { return v; })) return 'draw';
        return null;
      }

      function minimax(b, depth, isMax) {
        var w = winnerOf(b);
        if (w === 'O') return 10 - depth;
        if (w === 'X') return depth - 10;
        if (w === 'draw') return 0;
        if (isMax) {
          var best = -Infinity;
          for (var i = 0; i < 9; i++) {
            if (!b[i]) { b[i] = 'O'; best = Math.max(best, minimax(b, depth + 1, false)); b[i] = null; }
          }
          return best;
        } else {
          var worst = Infinity;
          for (var j = 0; j < 9; j++) {
            if (!b[j]) { b[j] = 'X'; worst = Math.min(worst, minimax(b, depth + 1, true)); b[j] = null; }
          }
          return worst;
        }
      }

      function bestMove(b) {
        var best = -Infinity, moves = [];
        for (var i = 0; i < 9; i++) {
          if (!b[i]) {
            b[i] = 'O';
            var score = minimax(b, 0, false);
            b[i] = null;
            if (score > best) { best = score; moves = [i]; }
            else if (score === best) { moves.push(i); }
          }
        }
        return moves[U.randInt(0, moves.length - 1)];
      }

      function render() {
        board.forEach(function (v, i) {
          cells[i].textContent = v || '';
          cells[i].className = 'ttt-cell' + (v ? ' taken ' + v.toLowerCase() : '');
        });
      }

      function endRound(result) {
        over = true;
        if (result === 'X') {
          U.setBest(WIN_KEY, U.getBest(WIN_KEY, 0) + 1);
          msg.textContent = 'You win! 🎉';
          msg.className = 'msg good';
        } else if (result === 'O') {
          U.setBest('ttt_losses', U.getBest('ttt_losses', 0) + 1);
          msg.textContent = 'The computer wins this time.';
          msg.className = 'msg bad';
        } else {
          U.setBest('ttt_draws', U.getBest('ttt_draws', 0) + 1);
          msg.textContent = "It's a draw!";
          msg.className = 'msg';
        }
        refreshStats();
      }

      function onCellClick(idx) {
        return function () {
          if (over || board[idx]) return;
          board[idx] = 'X';
          render();
          var w = winnerOf(board);
          if (w) { endRound(w); return; }
          msg.textContent = 'Computer is thinking...';
          msg.className = 'msg';
          aiTimer = setTimeout(function () {
            var move = bestMove(board);
            if (move !== undefined) board[move] = 'O';
            render();
            var w2 = winnerOf(board);
            if (w2) endRound(w2);
            else { msg.textContent = 'Your turn.'; msg.className = 'msg'; }
          }, 350);
        };
      }

      var handlers = cells.map(function (cell, idx) {
        var fn = onCellClick(idx);
        cell.addEventListener('click', fn);
        return { node: cell, fn: fn };
      });

      function newRound() {
        clearTimeout(aiTimer);
        board = new Array(9).fill(null);
        over = false;
        msg.textContent = 'You are X. Tap a square to play.';
        msg.className = 'msg';
        render();
      }

      restartBtn.addEventListener('click', newRound);
      refreshStats();
      newRound();

      return function cleanup() {
        clearTimeout(aiTimer);
        handlers.forEach(function (h) { h.node.removeEventListener('click', h.fn); });
        restartBtn.removeEventListener('click', newRound);
      };
    }
  });
})();
