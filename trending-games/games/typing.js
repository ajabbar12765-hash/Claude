(function () {
  var BEST_KEY = 'typing_best_wpm';

  var SAMPLES = [
    'The quick brown fox jumps over the lazy dog near the riverbank.',
    'Practice makes progress, not perfection, so keep typing every day.',
    'A journey of a thousand miles begins with a single small step.',
    'Great things never come from staying inside your comfort zone.',
    'The early bird catches the worm but the second mouse gets the cheese.',
    'Simplicity is the ultimate form of sophistication in good design.',
    'Coding every day sharpens the mind and builds lasting good habits.',
    'The stars above the quiet mountain shimmered like scattered diamonds.',
    'Success usually comes to those who are too busy to be looking for it.',
    'A calm sea never made a skilled and confident sailor in old stories.'
  ];

  Games.register('typing', {
    title: 'Typing Speed',
    icon: '⌨️',
    description: 'Type the sentence as fast and accurately as you can.',
    bestLabel: function () {
      var best = GameUtil.getBest(BEST_KEY, null);
      return best ? 'Best: ' + best + ' WPM' : '';
    },
    init: function (root, U) {
      var sample = '';
      var startTime = null;
      var timerId = null;
      var finished = false;

      var hud = U.el('div', { class: 'hud' }, [
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Time' }),
          U.el('div', { class: 'stat-value', id: 'tTime', text: '00:00' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'WPM' }),
          U.el('div', { class: 'stat-value', id: 'tWpm', text: '0' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Accuracy' }),
          U.el('div', { class: 'stat-value', id: 'tAcc', text: '100%' })
        ])
      ]);

      var sampleEl = U.el('div', { class: 'typing-sample', id: 'tSample' });
      var input = U.el('textarea', {
        class: 'typing-input',
        rows: '3',
        placeholder: 'Click here and start typing to begin the timer...',
        autocomplete: 'off',
        autocapitalize: 'off',
        spellcheck: 'false'
      });
      var msg = U.el('div', { class: 'msg' });
      var restartBtn = U.el('button', { class: 'btn secondary', text: 'New sentence' });

      var wrap = U.el('div', { class: 'typing-wrap' }, [sampleEl, input]);
      root.appendChild(hud);
      root.appendChild(wrap);
      root.appendChild(msg);
      root.appendChild(U.el('div', { class: 'btn-row' }, [restartBtn]));

      function renderSample(typed) {
        sampleEl.innerHTML = '';
        for (var i = 0; i < sample.length; i++) {
          var ch = sample[i];
          var span = document.createElement('span');
          if (i < typed.length) {
            span.className = typed[i] === ch ? 'correct' : 'wrong';
          } else if (i === typed.length) {
            span.className = 'current';
          }
          span.textContent = ch;
          sampleEl.appendChild(span);
        }
      }

      function elapsedMs() { return startTime ? performance.now() - startTime : 0; }

      function computeStats(typed) {
        var minutes = Math.max(elapsedMs() / 60000, 1 / 60000);
        var wpm = Math.round((typed.length / 5) / minutes);
        var correct = 0;
        for (var i = 0; i < typed.length; i++) {
          if (typed[i] === sample[i]) correct++;
        }
        var acc = typed.length ? Math.round((correct / typed.length) * 100) : 100;
        return { wpm: wpm, acc: acc };
      }

      function tick() {
        var secs = Math.floor(elapsedMs() / 1000);
        root.querySelector('#tTime').textContent = U.fmtSeconds(secs);
        var stats = computeStats(input.value);
        root.querySelector('#tWpm').textContent = stats.wpm;
        root.querySelector('#tAcc').textContent = stats.acc + '%';
      }

      function finish() {
        if (finished) return;
        finished = true;
        clearInterval(timerId);
        input.disabled = true;
        var stats = computeStats(input.value);
        root.querySelector('#tWpm').textContent = stats.wpm;
        root.querySelector('#tAcc').textContent = stats.acc + '%';
        var best = U.getBest(BEST_KEY, null);
        if (best === null || stats.wpm > best) {
          U.setBest(BEST_KEY, stats.wpm);
          msg.textContent = 'New best! ' + stats.wpm + ' WPM at ' + stats.acc + '% accuracy.';
          msg.className = 'msg good';
        } else {
          msg.textContent = 'Done! ' + stats.wpm + ' WPM at ' + stats.acc + '% accuracy.';
          msg.className = 'msg';
        }
      }

      function onInput() {
        if (finished) return;
        var typed = input.value;
        if (typed.length > sample.length) {
          typed = typed.slice(0, sample.length);
          input.value = typed;
        }
        if (startTime === null && typed.length > 0) {
          startTime = performance.now();
          timerId = setInterval(tick, 200);
        }
        renderSample(typed);
        if (typed.length === sample.length) finish();
      }

      function newRound() {
        clearInterval(timerId);
        finished = false;
        startTime = null;
        sample = SAMPLES[U.randInt(0, SAMPLES.length - 1)];
        input.value = '';
        input.disabled = false;
        msg.textContent = '';
        msg.className = 'msg';
        root.querySelector('#tTime').textContent = '00:00';
        root.querySelector('#tWpm').textContent = '0';
        root.querySelector('#tAcc').textContent = '100%';
        renderSample('');
        input.focus();
      }

      input.addEventListener('input', onInput);
      restartBtn.addEventListener('click', newRound);

      newRound();

      return function cleanup() {
        clearInterval(timerId);
        input.removeEventListener('input', onInput);
      };
    }
  });
})();
