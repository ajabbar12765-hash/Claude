(function () {
  var BEST_KEY = 'snake_best_score';
  var COLS = 20, ROWS = 20, CELL = 16;
  var START_SPEED = 150, MIN_SPEED = 70, SPEED_STEP = 6;

  Games.register('snake', {
    title: 'Snake',
    icon: '🐍',
    description: 'Eat the food, grow longer, don’t hit yourself or the wall.',
    bestLabel: function () {
      var best = GameUtil.getBest(BEST_KEY, 0);
      return best ? 'Best: ' + best : '';
    },
    init: function (root, U) {
      var snake, dir, pendingDir, food, score, speed, over, started, intervalId;

      var hud = U.el('div', { class: 'hud' }, [
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Score' }),
          U.el('div', { class: 'stat-value', id: 'snScore', text: '0' })
        ]),
        U.el('div', { class: 'stat' }, [
          U.el('div', { class: 'stat-label', text: 'Best' }),
          U.el('div', { class: 'stat-value', id: 'snBest', text: '0' })
        ])
      ]);

      var canvas = U.el('canvas', { id: 'snakeCanvas' });
      canvas.width = COLS * CELL;
      canvas.height = ROWS * CELL;
      var ctx = canvas.getContext('2d');

      var msg = U.el('div', { class: 'msg', text: 'Press an arrow key, tap a button, or swipe to start.' });
      var restartBtn = U.el('button', { class: 'btn secondary', text: 'Restart' });

      var dpad = U.el('div', { class: 'dpad' }, [
        U.el('button', { class: 'up', text: '↑', 'aria-label': 'Up' }),
        U.el('button', { class: 'left', text: '←', 'aria-label': 'Left' }),
        U.el('button', { class: 'right', text: '→', 'aria-label': 'Right' }),
        U.el('button', { class: 'down', text: '↓', 'aria-label': 'Down' })
      ]);

      root.appendChild(hud);
      root.appendChild(U.el('div', { class: 'snake-canvas-wrap' }, [canvas]));
      root.appendChild(dpad);
      root.appendChild(msg);
      root.appendChild(U.el('div', { class: 'btn-row' }, [restartBtn]));

      function placeFood() {
        var free = [];
        for (var x = 0; x < COLS; x++) {
          for (var y = 0; y < ROWS; y++) {
            if (!snake.some(function (s) { return s.x === x && s.y === y; })) free.push({ x: x, y: y });
          }
        }
        food = free.length ? free[U.randInt(0, free.length - 1)] : { x: 0, y: 0 };
      }

      function reset() {
        snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
        dir = { x: 1, y: 0 };
        pendingDir = dir;
        score = 0;
        speed = START_SPEED;
        over = false;
        started = false;
        placeFood();
        draw();
        root.querySelector('#snScore').textContent = '0';
        root.querySelector('#snBest').textContent = U.getBest(BEST_KEY, 0);
        msg.textContent = 'Press an arrow key, tap a button, or swipe to start.';
        msg.className = 'msg';
        clearInterval(intervalId);
        intervalId = null;
      }

      function startLoop() {
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(step, speed);
      }

      function setDirection(nx, ny) {
        // prevent reversing directly into the snake's own body
        if (snake.length > 1 && nx === -dir.x && ny === -dir.y) return;
        pendingDir = { x: nx, y: ny };
        if (!started && !over) {
          started = true;
          msg.textContent = '';
          startLoop();
        }
      }

      function step() {
        dir = pendingDir;
        var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || snake.some(function (s) { return s.x === head.x && s.y === head.y; })) {
          endGame();
          return;
        }

        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          score++;
          root.querySelector('#snScore').textContent = score;
          var best = U.getBest(BEST_KEY, 0);
          if (score > best) { U.setBest(BEST_KEY, score); root.querySelector('#snBest').textContent = score; }
          placeFood();
          if (score % 5 === 0 && speed > MIN_SPEED) {
            speed = Math.max(MIN_SPEED, speed - SPEED_STEP);
            startLoop();
          }
        } else {
          snake.pop();
        }
        draw();
      }

      function endGame() {
        over = true;
        started = false;
        clearInterval(intervalId);
        intervalId = null;
        msg.textContent = 'Game over! Final score: ' + score + '. Tap Restart to play again.';
        msg.className = 'msg bad';
      }

      function draw() {
        ctx.fillStyle = '#0a0d1e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ff5d6c';
        ctx.beginPath();
        ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2.4, 0, Math.PI * 2);
        ctx.fill();

        snake.forEach(function (seg, i) {
          ctx.fillStyle = i === 0 ? '#6c8bff' : '#35d08a';
          ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
        });
      }

      var keyMap = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
        a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1],
        A: [-1, 0], D: [1, 0], W: [0, -1], S: [0, 1]
      };
      function onKey(e) {
        var m = keyMap[e.key];
        if (!m) return;
        e.preventDefault();
        if (over) return;
        setDirection(m[0], m[1]);
      }

      function btnHandler(nx, ny) {
        return function () { if (!over) setDirection(nx, ny); };
      }
      var upBtn = dpad.querySelector('.up'), leftBtn = dpad.querySelector('.left');
      var rightBtn = dpad.querySelector('.right'), downBtn = dpad.querySelector('.down');
      var onUp = btnHandler(0, -1), onLeft = btnHandler(-1, 0), onRight = btnHandler(1, 0), onDown = btnHandler(0, 1);
      upBtn.addEventListener('click', onUp);
      leftBtn.addEventListener('click', onLeft);
      rightBtn.addEventListener('click', onRight);
      downBtn.addEventListener('click', onDown);

      var touchStartX = 0, touchStartY = 0, touching = false;
      function onTouchStart(e) {
        if (e.touches.length !== 1) return;
        touching = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
      function onTouchEnd(e) {
        if (!touching || over) { touching = false; return; }
        touching = false;
        var t = e.changedTouches[0];
        var dx = t.clientX - touchStartX;
        var dy = t.clientY - touchStartY;
        var absX = Math.abs(dx), absY = Math.abs(dy);
        if (Math.max(absX, absY) < 20) return;
        if (absX > absY) setDirection(dx > 0 ? 1 : -1, 0);
        else setDirection(0, dy > 0 ? 1 : -1);
      }
      canvas.addEventListener('touchstart', onTouchStart, { passive: true });
      canvas.addEventListener('touchend', onTouchEnd, { passive: true });

      document.addEventListener('keydown', onKey);
      restartBtn.addEventListener('click', reset);

      reset();

      return function cleanup() {
        clearInterval(intervalId);
        document.removeEventListener('keydown', onKey);
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchend', onTouchEnd);
        upBtn.removeEventListener('click', onUp);
        leftBtn.removeEventListener('click', onLeft);
        rightBtn.removeEventListener('click', onRight);
        downBtn.removeEventListener('click', onDown);
        restartBtn.removeEventListener('click', reset);
      };
    }
  });
})();
