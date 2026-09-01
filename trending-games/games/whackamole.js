(function () {
  var BEST_KEY = 'mole_best_score';
  var HOLES = 9;
  var ROUND_SECONDS = 30;

  Games.register('whackamole', {
    title: 'Whack-a-Mole',
    icon: '🔨',
    description: 'Whack as many moles as you can before the 30s timer runs out.',
    bestLabel: function () {
      var best = GameUtil.getBest(BEST_KEY, 0);
      return best ? 'Best: ' + best : '';
    },
    init: function (root, U) {
      var holes = [];
      var activeHole = -1;
      var score = 0;
      var timeLeft = ROUND_SECONDS;
      var popTimer = null;
      var countdownTimer = null;
      var running = false;

      var hud = U.el('div', { class: 'hud' }, [
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Score' }),
          U.el('div', { class: 'stat-value', id: 'wmScore', text: '0' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Time' }),
          U.el('div', { class: 'stat-value', id: 'wmTime', text: '30' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Best' }),
          U.el('div', { class: 'stat-value', id: 'wmBest', text: '0' })
        ])
      ]);

      var grid = U.el('div', { class: 'mole-grid' });
      var msg = U.el('div', { class: 'msg', text: 'Tap Start, then whack the moles as they pop up!' });
      var startBtn = U.el('button', { class: 'btn', text: 'Start' });

      root.appendChild(hud);
      root.appendChild(grid);
      root.appendChild(msg);
      root.appendChild(U.el('div', { class: 'btn-row' }, [startBtn]));

      var clickHandlers = [];
      for (var i = 0; i < HOLES; i++) {
        (function (idx) {
          var hole = U.el('div', { class: 'mole-hole' }, [U.el('span', { class: 'mole', text: '🐹' })]);
          var fn = function () { whack(idx); };
          hole.addEventListener('click', fn);
          clickHandlers.push({ node: hole, fn: fn });
          holes.push(hole);
          grid.appendChild(hole);
        })(i);
      }

      function whack(idx) {
        if (!running) return;
        if (idx === activeHole) {
          score++;
          root.querySelector('#wmScore').textContent = score;
          U.vibrate(20);
          holes[idx].classList.add('bonked');
          holes[idx].classList.remove('up');
          setTimeout(function () { holes[idx].classList.remove('bonked'); }, 150);
          activeHole = -1;
        }
      }

      function popMole() {
        if (activeHole !== -1) holes[activeHole].classList.remove('up');
        var next = U.randInt(0, HOLES - 1);
        activeHole = next;
        holes[next].classList.add('up');
        var upTime = Math.max(450, 900 - (ROUND_SECONDS - timeLeft) * 12);
        popTimer = setTimeout(popMole, upTime);
      }

      function tickCountdown() {
        timeLeft--;
        root.querySelector('#wmTime').textContent = timeLeft;
        if (timeLeft <= 0) endGame();
      }

      function startGame() {
        clearTimeout(popTimer);
        clearInterval(countdownTimer);
        score = 0;
        timeLeft = ROUND_SECONDS;
        running = true;
        activeHole = -1;
        holes.forEach(function (h) { h.classList.remove('up', 'bonked'); });
        root.querySelector('#wmScore').textContent = '0';
        root.querySelector('#wmTime').textContent = String(timeLeft);
        root.querySelector('#wmBest').textContent = U.getBest(BEST_KEY, 0);
        msg.textContent = 'Go! Whack the moles!';
        msg.className = 'msg';
        startBtn.textContent = 'Restart';
        popTimer = setTimeout(popMole, 500);
        countdownTimer = setInterval(tickCountdown, 1000);
      }

      function endGame() {
        running = false;
        clearTimeout(popTimer);
        clearInterval(countdownTimer);
        if (activeHole !== -1) holes[activeHole].classList.remove('up');
        activeHole = -1;
        var best = U.getBest(BEST_KEY, 0);
        if (score > best) {
          U.setBest(BEST_KEY, score);
          msg.textContent = 'New best! Score: ' + score;
          msg.className = 'msg good';
        } else {
          msg.textContent = 'Time! Final score: ' + score;
          msg.className = 'msg';
        }
        root.querySelector('#wmBest').textContent = U.getBest(BEST_KEY, 0);
        startBtn.textContent = 'Play again';
      }

      startBtn.addEventListener('click', startGame);
      root.querySelector('#wmBest').textContent = U.getBest(BEST_KEY, 0);

      return function cleanup() {
        clearTimeout(popTimer);
        clearInterval(countdownTimer);
        startBtn.removeEventListener('click', startGame);
        clickHandlers.forEach(function (h) { h.node.removeEventListener('click', h.fn); });
      };
    }
  });
})();
