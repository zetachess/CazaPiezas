(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreNode = document.getElementById("score");
  const levelNode = document.getElementById("level");
  const bestNode = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const startButton = document.getElementById("startButton");
  const logo = new Image();
  logo.src = "assets/goblin-logo.png";
  const pieceBase = "assets/pieces/cburnett";
  const pieceImages = {};

  const size = 8;
  const cell = canvas.width / size;
  const pieces = [
    { asset: "wP", value: 10, name: "peon" },
    { asset: "wN", value: 20, name: "caballo" },
    { asset: "wB", value: 25, name: "alfil" },
    { asset: "wR", value: 30, name: "torre" },
    { asset: "wQ", value: 45, name: "reina" },
  ];

  let snake;
  let dir;
  let nextDir;
  let food;
  let traps;
  let score;
  let level;
  let best = Number(localStorage.getItem("goblinsnake-best") || 0);
  let running = false;
  let lastStep = 0;
  let speed = 280;

  ["wP", "wN", "wB", "wR", "wQ", "wK", "bK"].forEach((asset) => {
    const image = new Image();
    image.onload = () => draw();
    image.src = `${pieceBase}/${asset}.svg`;
    pieceImages[asset] = image;
  });

  bestNode.textContent = best;

  function reset() {
    snake = [
      { x: 3, y: 4 },
      { x: 2, y: 4 },
      { x: 1, y: 4 },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    traps = [];
    score = 0;
    level = 1;
    speed = 280;
    spawnFood();
    updateHud();
  }

  function start() {
    reset();
    running = true;
    overlay.classList.add("hidden");
    lastStep = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(time) {
    if (!running) {
      draw();
      return;
    }
    if (time - lastStep >= speed) {
      step();
      lastStep = time;
    }
    draw();
    requestAnimationFrame(loop);
  }

  function step() {
    dir = nextDir;
    const head = snake[0];
    const next = { x: head.x + dir.x, y: head.y + dir.y };

    if (hitWall(next) || hitSnake(next) || traps.some((trap) => same(trap, next))) {
      gameOver();
      return;
    }

    snake.unshift(next);

    if (same(next, food)) {
      score += food.value;
      const newLevel = Math.min(9, 1 + Math.floor(score / 90));
      if (newLevel !== level) {
        level = newLevel;
        speed = Math.max(150, 280 - (level - 1) * 12);
      }
      if (score > best) {
        best = score;
        localStorage.setItem("goblinsnake-best", String(best));
      }
      placeTraps();
      spawnFood();
      updateHud();
    } else {
      snake.pop();
    }
  }

  function spawnFood() {
    const open = emptyCells();
    food = open[Math.floor(Math.random() * open.length)];
    Object.assign(food, pieces[Math.floor(Math.random() * pieces.length)]);
  }

  function placeTraps() {
    const desired = Math.min(3, Math.floor(score / 180));
    while (traps.length < desired) {
      const open = emptyCells();
      if (!open.length) return;
      traps.push(open[Math.floor(Math.random() * open.length)]);
    }
  }

  function emptyCells() {
    const cells = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const cellPos = { x, y };
        const occupied = snake.some((part) => same(part, cellPos)) ||
          traps.some((trap) => same(trap, cellPos)) ||
          (food && same(food, cellPos));
        if (!occupied) cells.push(cellPos);
      }
    }
    return cells;
  }

  function draw() {
    drawBoard();
    drawTraps();
    drawFood();
    drawSnake();
  }

  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#142026" : "#1e2b2b";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    ctx.strokeStyle = "rgba(255, 248, 216, 0.16)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  }

  function drawSnake() {
    snake.forEach((part, index) => {
      const px = part.x * cell;
      const py = part.y * cell;
      if (index === 0) {
        drawHead(px, py);
        return;
      }
      const hue = 184 - Math.min(index * 3, 60);
      ctx.fillStyle = `hsl(${hue} 52% ${Math.max(31, 50 - index)}%)`;
      roundedRect(px + 8, py + 8, cell - 16, cell - 16, 16);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 248, 216, 0.12)";
      ctx.beginPath();
      ctx.arc(px + cell * 0.34, py + cell * 0.34, 8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawHead(px, py) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#7fcdd8";
    roundedRect(px + 4, py + 4, cell - 8, cell - 8, 18);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (logo.complete && logo.naturalWidth) {
      ctx.save();
      ctx.beginPath();
      roundedRect(px + 8, py + 8, cell - 16, cell - 16, 16);
      ctx.clip();
      ctx.drawImage(logo, px + 7, py + 7, cell - 14, cell - 14);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawFood() {
    if (!food) return;
    ctx.fillStyle = "#fff3bd";
    ctx.beginPath();
    ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * 0.36, 0, Math.PI * 2);
    ctx.fill();
    drawPiece(food.asset, food.x, food.y, 0.88);
  }

  function drawTraps() {
    traps.forEach((trap) => {
      ctx.fillStyle = "rgba(227, 82, 60, 0.82)";
      roundedRect(trap.x * cell + 14, trap.y * cell + 14, cell - 28, cell - 28, 14);
      ctx.fill();
      drawPiece("bK", trap.x, trap.y, 0.72);
    });
  }

  function drawPiece(asset, x, y, scale) {
    const image = pieceImages[asset];
    const pad = cell * ((1 - scale) / 2);
    const px = x * cell + pad;
    const py = y * cell + pad;
    const side = cell * scale;
    if (image && image.complete && image.naturalWidth) {
      ctx.drawImage(image, px, py, side, side);
      return;
    }
    ctx.fillStyle = "#16120b";
    ctx.font = `${cell * 0.42}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(asset, x * cell + cell / 2, y * cell + cell / 2);
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function updateHud() {
    scoreNode.textContent = score;
    levelNode.textContent = level;
    bestNode.textContent = best;
  }

  function gameOver() {
    running = false;
    overlay.querySelector("h1").textContent = "Jaque mate";
    overlay.querySelector("p").textContent = `Puntuacion: ${score}. Pulsa jugar para la revancha.`;
    startButton.textContent = "Revancha";
    overlay.classList.remove("hidden");
  }

  function setDirection(next) {
    const vectors = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    const vector = vectors[next];
    if (!vector) return;
    if (vector.x + dir.x === 0 && vector.y + dir.y === 0) return;
    nextDir = vector;
  }

  function hitWall(pos) {
    return pos.x < 0 || pos.y < 0 || pos.x >= size || pos.y >= size;
  }

  function hitSnake(pos) {
    return snake.some((part, index) => index > 0 && same(part, pos));
  }

  function same(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  window.addEventListener("keydown", (event) => {
    const keys = {
      ArrowUp: "up",
      w: "up",
      W: "up",
      ArrowDown: "down",
      s: "down",
      S: "down",
      ArrowLeft: "left",
      a: "left",
      A: "left",
      ArrowRight: "right",
      d: "right",
      D: "right",
    };
    if (keys[event.key]) {
      event.preventDefault();
      setDirection(keys[event.key]);
    }
    if ((event.key === " " || event.key === "Enter") && !running) {
      event.preventDefault();
      start();
    }
  });

  document.querySelectorAll("[data-dir]").forEach((button) => {
    button.addEventListener("click", () => setDirection(button.dataset.dir));
  });

  let touchStart = null;
  canvas.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });

  canvas.addEventListener("touchend", (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    touchStart = null;
  }, { passive: true });

  startButton.addEventListener("click", start);
  reset();
  draw();
}());
