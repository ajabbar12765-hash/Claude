(function () {
  var BEST_KEY = 'reaction_best_ms';

  Games.register('reaction', {
    title: 'Reaction Time',
    icon: '⚡',
    description: 'Tap the instant it turns green. Beat your best reflex time.',
    bestLabel: function () {
      var best = GameUtil.getBest(BEST_KEY, null);
      return best ? 'Best: ' + best + ' ms' : '';
    },
    init: function (root, U) {
      var state = 'idle'; // idle | waiting | go | tooSoon | result
      var timeoutId = null;
      var goAt = 0;
      var attempts = [];

      var hud = U.el('div', { class: 'hud' }, [
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Best' }),
          U.el('div', { class: 'stat-value', id: 'rBest' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Last' }),
          U.el('div', { class: 'stat-value', id: 'rLast' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Attempts' }),
          U.el('div', { class: 'stat-value', id: 'rCount' })
        ])
      ]);

      var box = U.el('div', { class: 'reaction-box idle', text: 'Tap to start' });
      var msg = U.el('div', { class: 'msg', text: 'Wait for green, then tap as fast as you can.' });
      var resetBtn = U.el('button', { class: 'btn secondary', text: 'Reset stats' });

      root.appendChild(hud);
      root.appendChild(box);
      root.appendChild(msg);
      root.appendChild(U.el('div', { class: 'btn-row' }, [resetBtn]));

      function refreshHud() {
        var best = U.getBest(BEST_KEY, null);
        root.querySelector('#rBest').textContent = best ? best + ' ms' : '—';
        root.querySelector('#rCount').textContent = attempts.length;
        var last = attempts[attempts.length - 1];
        root.querySelector('#rLast').textContent = last ? last + ' ms' : '—';
      }

      function setBox(cls, text) {
        box.className = 'reaction-box ' + cls;
        box.textContent = text;
      }

      function armRound() {
        state = 'waiting';
        setBox('wait', 'Wait for green...');
        msg.textContent = '';
        msg.className = 'msg';
        var delay = U.randInt(1200, 3500);
        timeoutId = setTimeout(function () {
          state = 'go';
          goAt = performance.now();
          setBox('go', 'TAP NOW!');
        }, delay);
      }

      function handleTap() {
        if (state === 'idle' || state === 'result' || state === 'tooSoon') {
          armRound();
          return;
        }
        if (state === 'waiting') {
          clearTimeout(timeoutId);
          state = 'tooSoon';
          setBox('tooSoon', 'Too soon! Tap to retry.');
          msg.textContent = 'You tapped before it turned green.';
          msg.className = 'msg bad';
          return;
        }
        if (state === 'go') {
          var rt = Math.round(performance.now() - goAt);
          attempts.push(rt);
          if (attempts.length > 20) attempts.shift();
          var best = U.getBest(BEST_KEY, null);
          if (best === null || rt < best) {
            U.setBest(BEST_KEY, rt);
            msg.textContent = 'New best! ' + rt + ' ms';
            msg.className = 'msg good';
          } else {
            msg.textContent = rt + ' ms — tap to try again';
            msg.className = 'msg';
          }
          state = 'result';
          setBox('idle', rt + ' ms');
          refreshHud();
        }
      }

      box.addEventListener('click', handleTap);
      resetBtn.addEventListener('click', function () {
        attempts = [];
        U.setBest(BEST_KEY, null);
        refreshHud();
        state = 'idle';
        setBox('idle', 'Tap to start');
        msg.textContent = 'Wait for green, then tap as fast as you can.';
        msg.className = 'msg';
      });

      refreshHud();

      return function cleanup() {
        clearTimeout(timeoutId);
        box.removeEventListener('click', handleTap);
      };
    }
  });
})();
