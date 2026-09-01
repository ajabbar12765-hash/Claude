(function () {
  var BEST_KEY = 'simon_best_level';
  var FREQS = [220, 277, 330, 415];

  Games.register('simon', {
    title: 'Simon Says',
    icon: '🟢',
    description: 'Watch the color sequence, then repeat it back. Levels get longer.',
    bestLabel: function () {
      var best = GameUtil.getBest(BEST_KEY, 0);
      return best ? 'Best level: ' + best : '';
    },
    init: function (root, U) {
      var sequence = [];
      var userIndex = 0;
      var accepting = false;
      var timeouts = [];
      var audioCtx = null;

      var hud = U.el('div', { class: 'hud' }, [
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Level' }),
          U.el('div', { class: 'stat-value', id: 'smLevel', text: '0' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Best' }),
          U.el('div', { class: 'stat-value', id: 'smBest', text: '0' })
        ])
      ]);

      var board = U.el('div', { class: 'simon-board' });
      var pads = [];
      for (var i = 0; i < 4; i++) {
        var pad = U.el('button', { class: 'simon-pad', 'data-c': String(i), 'aria-label': 'Pad ' + (i + 1) });
        pads.push(pad);
        board.appendChild(pad);
      }

      var msg = U.el('div', { class: 'msg', text: 'Tap Start to begin the sequence.' });
      var startBtn = U.el('button', { class: 'btn', text: 'Start' });

      root.appendChild(hud);
      root.appendChild(board);
      root.appendChild(msg);
      root.appendChild(U.el('div', { class: 'btn-row' }, [startBtn]));

      function tone(freq) {
        try {
          if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          var osc = audioCtx.createOscillator();
          var gain = audioCtx.createGain();
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
          osc.connect(gain).connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.3);
        } catch (e) { /* audio unavailable, ignore */ }
      }

      function flash(idx, duration) {
        pads[idx].classList.add('active');
        tone(FREQS[idx]);
        timeouts.push(setTimeout(function () { pads[idx].classList.remove('active'); }, duration));
      }

      function clearTimers() {
        timeouts.forEach(clearTimeout);
        timeouts = [];
      }

      function playSequence() {
        accepting = false;
        var delay = 500;
        sequence.forEach(function (padIdx, i) {
          timeouts.push(setTimeout(function () { flash(padIdx, 380); }, delay + i * 650));
        });
        timeouts.push(setTimeout(function () {
          accepting = true;
          userIndex = 0;
          msg.textContent = 'Your turn — repeat the sequence.';
          msg.className = 'msg';
        }, delay + sequence.length * 650));
      }

      function nextLevel() {
        sequence.push(U.randInt(0, 3));
        root.querySelector('#smLevel').textContent = sequence.length;
        msg.textContent = 'Watch closely...';
        msg.className = 'msg';
        playSequence();
      }

      function onPadClick(idx) {
        return function () {
          if (!accepting) return;
          flash(idx, 200);
          if (sequence[userIndex] === idx) {
            userIndex++;
            if (userIndex === sequence.length) {
              accepting = false;
              timeouts.push(setTimeout(nextLevel, 700));
            }
          } else {
            accepting = false;
            var best = U.getBest(BEST_KEY, 0);
            var level = sequence.length - 1;
            if (level > best) {
              U.setBest(BEST_KEY, level);
              msg.textContent = 'New best! You reached level ' + (level + 1) + '.';
              msg.className = 'msg good';
            } else {
              msg.textContent = 'Wrong pad! You reached level ' + (level + 1) + '. Tap Start to retry.';
              msg.className = 'msg bad';
            }
            root.querySelector('#smBest').textContent = U.getBest(BEST_KEY, 0);
            startBtn.textContent = 'Play again';
          }
        };
      }

      var padHandlers = pads.map(function (pad, idx) {
        var fn = onPadClick(idx);
        pad.addEventListener('click', fn);
        return { node: pad, fn: fn };
      });

      function startGame() {
        clearTimers();
        sequence = [];
        userIndex = 0;
        accepting = false;
        root.querySelector('#smBest').textContent = U.getBest(BEST_KEY, 0);
        startBtn.textContent = 'Restart';
        nextLevel();
      }

      startBtn.addEventListener('click', startGame);
      root.querySelector('#smBest').textContent = U.getBest(BEST_KEY, 0);

      return function cleanup() {
        clearTimers();
        startBtn.removeEventListener('click', startGame);
        padHandlers.forEach(function (h) { h.node.removeEventListener('click', h.fn); });
        if (audioCtx) { try { audioCtx.close(); } catch (e) {} }
      };
    }
  });
})();
