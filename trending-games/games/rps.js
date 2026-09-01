(function () {
  var WIN_KEY = 'rps_wins';
  var CHOICES = { rock: '🪨', paper: '📄', scissors: '✂️' };
  var BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

  Games.register('rps', {
    title: 'Rock Paper Scissors',
    icon: '✂️',
    description: 'Best reflexes and instincts against the computer.',
    bestLabel: function () {
      var wins = GameUtil.getBest(WIN_KEY, 0);
      return wins ? 'Wins: ' + wins : '';
    },
    init: function (root, U) {
      var hud = U.el('div', { class: 'hud' }, [
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Wins' }),
          U.el('div', { class: 'stat-value', id: 'rpsWins', text: '0' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Draws' }),
          U.el('div', { class: 'stat-value', id: 'rpsDraws', text: '0' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Losses' }),
          U.el('div', { class: 'stat-value', id: 'rpsLosses', text: '0' })
        ])
      ]);

      var resultRow = U.el('div', { class: 'rps-result' }, [
        U.el('span', { id: 'rpsYou', text: '❓' }),
        U.el('span', { class: 'rps-vs', text: 'VS' }),
        U.el('span', { id: 'rpsCpu', text: '❓' })
      ]);

      var choicesRow = U.el('div', { class: 'rps-choices' });
      var buttons = {};
      Object.keys(CHOICES).forEach(function (key) {
        var b = U.el('button', { 'aria-label': key, text: CHOICES[key] });
        buttons[key] = b;
        choicesRow.appendChild(b);
      });

      var msg = U.el('div', { class: 'msg', text: 'Pick rock, paper, or scissors.' });

      root.appendChild(hud);
      root.appendChild(resultRow);
      root.appendChild(choicesRow);
      root.appendChild(msg);

      function refreshStats() {
        root.querySelector('#rpsWins').textContent = U.getBest(WIN_KEY, 0);
        root.querySelector('#rpsDraws').textContent = U.getBest('rps_draws', 0);
        root.querySelector('#rpsLosses').textContent = U.getBest('rps_losses', 0);
      }

      function play(choice) {
        var options = Object.keys(CHOICES);
        var cpu = options[U.randInt(0, options.length - 1)];
        root.querySelector('#rpsYou').textContent = CHOICES[choice];
        root.querySelector('#rpsCpu').textContent = CHOICES[cpu];

        if (choice === cpu) {
          U.setBest('rps_draws', U.getBest('rps_draws', 0) + 1);
          msg.textContent = "It's a draw — " + choice + ' vs ' + cpu + '.';
          msg.className = 'msg';
        } else if (BEATS[choice] === cpu) {
          U.setBest(WIN_KEY, U.getBest(WIN_KEY, 0) + 1);
          msg.textContent = 'You win! ' + choice + ' beats ' + cpu + '.';
          msg.className = 'msg good';
        } else {
          U.setBest('rps_losses', U.getBest('rps_losses', 0) + 1);
          msg.textContent = 'You lose. ' + cpu + ' beats ' + choice + '.';
          msg.className = 'msg bad';
        }
        refreshStats();
      }

      var handlers = Object.keys(buttons).map(function (key) {
        var fn = function () { play(key); };
        buttons[key].addEventListener('click', fn);
        return { node: buttons[key], fn: fn };
      });

      refreshStats();

      return function cleanup() {
        handlers.forEach(function (h) { h.node.removeEventListener('click', h.fn); });
      };
    }
  });
})();
