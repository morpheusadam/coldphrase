/* snake.js — the cover. When the file carries a trigger hash it opens as a plain
 * Snake game; typing the secret word (any casing) reveals the unlock screen. The
 * game is a genuine, playable canvas game so casual inspection sees only a game.
 * Movement uses arrow keys only, so letters typed for the trigger never disturb
 * play. DOM-only glue; the hashing/matching lives in crypto.js (testable). */
var CP = (typeof CP !== 'undefined') ? CP : {};

CP.revealUnlock = function () {
  var game = document.getElementById('game');
  if (game) game.hidden = true;
  var brand = document.getElementById('brand');
  if (brand) brand.innerHTML = '▌ <b>RECOVER</b>';
  document.getElementById('vault').hidden = false;
  var pw = document.getElementById('pw');
  if (pw) pw.focus();
  CP._revealed = true;
  if (CP._snakeTimer) { clearInterval(CP._snakeTimer); CP._snakeTimer = null; }
};

CP.initSnake = function (triggerHex, onReveal) {
  // ---- secret-word detector (runs regardless of whether the canvas exists) ----
  var buf = '';
  document.addEventListener('keydown', function (e) {
    if (CP._revealed) return;
    if (e.key && e.key.length === 1) {
      buf = (buf + e.key).slice(-CP.TRIG_MAX);
      CP.triggerMatches(buf, triggerHex).then(function (hit) { if (hit && !CP._revealed) onReveal(); });
    }
  });

  var canvas = document.getElementById('board');
  if (!canvas || !canvas.getContext) return; // headless / no canvas: detector still armed
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('score');
  var overEl = document.getElementById('gameover');

  var GRID = 24, CELL = canvas.width / GRID;
  var css = function (name, fallback) {
    try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; }
    catch (e) { return fallback; }
  };
  var snake, dir, nextDir, food, score, alive;

  function reset() {
    snake = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }];
    dir = { x: 1, y: 0 }; nextDir = dir; score = 0; alive = true;
    placeFood(); if (overEl) overEl.hidden = true; updateScore();
  }
  function placeFood() {
    do {
      food = { x: (Math.random() * GRID) | 0, y: (Math.random() * GRID) | 0 };
    } while (snake.some(function (s) { return s.x === food.x && s.y === food.y; }));
  }
  function updateScore() { if (scoreEl) scoreEl.textContent = 'score ' + score; }

  function step() {
    if (CP._revealed) return;
    if (!alive) return;
    dir = nextDir;
    var head = { x: (snake[0].x + dir.x + GRID) % GRID, y: (snake[0].y + dir.y + GRID) % GRID };
    if (snake.some(function (s) { return s.x === head.x && s.y === head.y; })) {
      alive = false; if (overEl) overEl.hidden = false; draw(); return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) { score++; updateScore(); placeFood(); }
    else snake.pop();
    draw();
  }
  function draw() {
    var bg = css('--bg', '#000'), accent = css('--accent', '#52a8ff'), fg = css('--fg', '#ededed'), border = css('--border', '#262626');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
    ctx.fillStyle = accent; ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);
    for (var i = 0; i < snake.length; i++) {
      ctx.fillStyle = i === 0 ? fg : css('--fg-2', '#a1a1a1');
      ctx.fillRect(snake[i].x * CELL + 1, snake[i].y * CELL + 1, CELL - 2, CELL - 2);
    }
  }

  document.addEventListener('keydown', function (e) {
    if (CP._revealed) return;
    var k = e.key;
    if (k === 'ArrowUp' && dir.y === 0) nextDir = { x: 0, y: -1 };
    else if (k === 'ArrowDown' && dir.y === 0) nextDir = { x: 0, y: 1 };
    else if (k === 'ArrowLeft' && dir.x === 0) nextDir = { x: -1, y: 0 };
    else if (k === 'ArrowRight' && dir.x === 0) nextDir = { x: 1, y: 0 };
    else if ((k === ' ' || k === 'Enter') && !alive) reset();
    else return;
    e.preventDefault();
  });

  reset(); draw();
  CP._snakeTimer = setInterval(step, 110);
};
