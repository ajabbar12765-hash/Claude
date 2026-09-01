(function () {
  var BEST_KEY = 'memory_best_ms';
  var EMOJIS = ['🍎', '🍋', '🍇', '🍓', '🍉', '🍒', '🥝', '🍑'];

  Games.register('memory', {
    title: 'Memory Match',
    icon: '🧠',
    description: 'Flip cards, find every matching pair against the clock.',
    bestLabel: function () {
      var best = GameUtil.getBest(BEST_KEY, null);
      return best ? 'Best: ' + GameUtil.fmtTime(best) : '';
    },
    init: function (root, U) {
      var cards, selection, locked, moves, matchedCount, startTime, timerId, finished;

      var hud = U.el('div', { class: 'hud' }, [
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Time' }),
          U.el('div', { class: 'stat-value', id: 'mTime', text: '00.00' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Moves' }),
          U.el('div', { class: 'stat-value', id: 'mMoves', text: '0' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Best' }),
          U.el('div', { class: 'stat-value', id: 'mBest', text: '—' })
        ])
      ]);

      var grid = U.el('div', { class: 'memory-grid' });
      grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
      var msg = U.el('div', { class: 'msg', text: 'Find all 8 pairs as fast as you can.' });
      var restartBtn = U.el('button', { class: 'btn secondary', text: 'New game' });

      root.appendChild(hud);
      root.appendChild(grid);
      root.appendChild(msg);
      root.appendChild(U.el('div', { class: 'btn-row' }, [restartBtn]));

      function refreshBest() {
        var best = U.getBest(BEST_KEY, null);
        root.querySelector('#mBest').textContent = best ? U.fmtTime(best) : '—';
      }

      function tick() {
        root.querySelector('#mTime').textContent = U.fmtTime(performance.now() - startTime);
      }

      function renderCard(card, node) {
        node.className = 'memory-card' + (card.flipped ? ' flipped' : '') + (card.matched ? ' matched' : '');
        node.textContent = (card.flipped || card.matched) ? card.emoji : '';
      }

      function onCardClick(card, node) {
        return function () {
          if (locked || card.flipped || card.matched || finished) return;
          if (startTime === null) {
            startTime = performance.now();
            timerId = setInterval(tick, 50);
          }
          card.flipped = true;
          renderCard(card, node);
          selection.push({ card: card, node: node });
          if (selection.length === 2) {
            moves++;
            root.querySelector('#mMoves').textContent = moves;
            locked = true;
            var a = selection[0], b = selection[1];
            if (a.card.emoji === b.card.emoji) {
              a.card.matched = true;
              b.card.matched = true;
              renderCard(a.card, a.node);
              renderCard(b.card, b.node);
              matchedCount += 2;
              selection = [];
              locked = false;
              if (matchedCount === cards.length) endGame(true);
            } else {
              setTimeout(function () {
                a.card.flipped = false;
                b.card.flipped = false;
                renderCard(a.card, a.node);
                renderCard(b.card, b.node);
                selection = [];
                locked = false;
              }, 700);
            }
          }
        };
      }

      function endGame(won) {
        finished = true;
        clearInterval(timerId);
        if (won) {
          var finalMs = performance.now() - startTime;
          var best = U.getBest(BEST_KEY, null);
          if (best === null || finalMs < best) {
            U.setBest(BEST_KEY, finalMs);
            msg.textContent = 'New best time! Solved in ' + moves + ' moves.';
            msg.className = 'msg good';
          } else {
            msg.textContent = 'Solved in ' + moves + ' moves. Nice work!';
            msg.className = 'msg';
          }
          refreshBest();
        }
      }

      var clickHandlers = [];

      function newGame() {
        clearInterval(timerId);
        clickHandlers.forEach(function (h) { h.node.removeEventListener('click', h.fn); });
        clickHandlers = [];

        var deck = U.shuffle(EMOJIS.concat(EMOJIS).map(function (e, i) { return { emoji: e, uid: i }; }));
        cards = deck.map(function (d) { return { emoji: d.emoji, flipped: false, matched: false }; });
        selection = [];
        locked = false;
        moves = 0;
        matchedCount = 0;
        startTime = null;
        finished = false;

        grid.innerHTML = '';
        root.querySelector('#mTime').textContent = '00.00';
        root.querySelector('#mMoves').textContent = '0';
        msg.textContent = 'Find all 8 pairs as fast as you can.';
        msg.className = 'msg';
        refreshBest();

        cards.forEach(function (card) {
          var node = U.el('div', { class: 'memory-card' });
          renderCard(card, node);
          var fn = onCardClick(card, node);
          node.addEventListener('click', fn);
          clickHandlers.push({ node: node, fn: fn });
          grid.appendChild(node);
        });
      }

      restartBtn.addEventListener('click', newGame);
      newGame();

      return function cleanup() {
        clearInterval(timerId);
        clickHandlers.forEach(function (h) { h.node.removeEventListener('click', h.fn); });
        restartBtn.removeEventListener('click', newGame);
      };
    }
  });
})();
