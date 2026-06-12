(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreNode = document.getElementById("score");
  const levelNode = document.getElementById("level");
  const bestNode = document.getElementById("best");
  const comboPill = document.getElementById("comboPill");
  const comboText = document.getElementById("comboText");
  const comboLabel = document.getElementById("comboLabel");
  const comboBar = document.getElementById("comboBar");
  const overlay = document.getElementById("overlay");
  const startButton = document.getElementById("startButton");
  const controls = document.querySelector(".controls");
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
    { asset: "wQ", value: 50, name: "reina" },
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
  let audioContext = null;
  let bursts = [];
  let combo = 1;
  let comboCount = 0;
  let comboUntil = 0;
  let comboWindow = 5600;
  let screenShake = 0;

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
    combo = 1;
    comboCount = 0;
    comboUntil = 0;
    comboWindow = 5600;
    bursts = [];
    screenShake = 0;
    spawnFood();
    updateHud();
    updateComboHud();
  }

  function start() {
    unlockAudio();
    reset();
    running = true;
    controls.classList.add("active");
    overlay.classList.add("hidden");
    lastStep = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(time) {
    if (!running) {
      draw();
      return;
    }
    updateCombo(time);
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
      const earned = captureFood(next);
      const newLevel = Math.min(9, 1 + Math.floor(score / 90));
      if (newLevel !== level) {
        level = newLevel;
        speed = Math.max(150, 280 - (level - 1) * 12);
        addBurst(next, 0, combo, true, `Nivel ${level}`);
        playLevelSound();
      }
      if (score > best) {
        best = score;
        localStorage.setItem("goblinsnake-best", String(best));
      }
      placeTraps();
      spawnFood();
      updateHud();
      updateComboHud();
    } else {
      snake.pop();
    }
  }

  function captureFood(pos) {
    const now = performance.now();
    comboCount = now <= comboUntil ? comboCount + 1 : 1;
    combo = comboCount >= 7 ? 5 : comboCount >= 5 ? 4 : comboCount >= 3 ? 3 : comboCount >= 2 ? 2 : 1;
    comboWindow = food.bonus ? 7200 : 5600;
    comboUntil = now + comboWindow;

    const base = food.value + (food.bonus ? 25 : 0);
    const earned = base * combo;
    score += earned;
    screenShake = Math.min(12, 3 + combo * 1.4);
    addBurst(pos, earned, combo, food.bonus);
    playEatSound(earned, combo);
    return earned;
  }

  function spawnFood() {
    const open = emptyCells();
    if (!open.length) {
      gameOver();
      return;
    }
    food = open[Math.floor(Math.random() * open.length)];
    Object.assign(food, pieces[Math.floor(Math.random() * pieces.length)]);
    food.bonus = Math.random() < 0.18;
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
    ctx.save();
    if (screenShake > 0) {
      const wobble = Math.sin(screenShake * 2.1) * screenShake;
      ctx.translate(wobble, -wobble * 0.5);
      screenShake *= 0.82;
      if (screenShake < 0.5) screenShake = 0;
    }
    drawTraps();
    drawFood();
    drawSnake();
    drawBursts();
    ctx.restore();
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
    const pulse = food.bonus ? Math.sin(performance.now() / 130) * 0.055 : 0;
    const radius = cell * (food.bonus ? 0.42 + pulse : 0.36);
    const cx = food.x * cell + cell / 2;
    const cy = food.y * cell + cell / 2;
    ctx.save();
    if (food.bonus) {
      ctx.shadowColor = "rgba(255, 215, 96, 0.9)";
      ctx.shadowBlur = 18;
    }
    ctx.fillStyle = food.bonus ? "#ffd45f" : "#fff3bd";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    if (food.bonus) {
      ctx.strokeStyle = "rgba(255, 248, 216, 0.9)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    drawPiece(food.asset, food.x, food.y, 0.88);
    if (food.bonus) {
      ctx.fillStyle = "#16120b";
      ctx.font = `800 ${cell * 0.16}px Segoe UI, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("BONUS", cx, cy + cell * 0.34);
    }
    ctx.restore();
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

  function addBurst(pos, value, multiplier, bonus, customText) {
    bursts.push({
      x: pos.x * cell + cell / 2,
      y: pos.y * cell + cell / 2,
      value,
      age: 0,
      text: customText || `${bonus ? "💎 " : ""}${multiplier > 1 ? `x${multiplier} ` : ""}+${value}`,
    });
  }

  function drawBursts() {
    bursts = bursts.filter((burst) => burst.age < 34);
    bursts.forEach((burst) => {
      const alpha = 1 - burst.age / 34;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = burst.value >= 75 ? "#7fcdd8" : "#fff3bd";
      ctx.font = `800 ${cell * (burst.value >= 75 ? 0.2 : 0.18)}px Segoe UI, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0, 0, 0, 0.62)";
      ctx.shadowBlur = 8;
      ctx.fillText(burst.text, burst.x, burst.y - burst.age * 1.2);
      ctx.restore();
      burst.age += 1;
    });
  }

  function updateCombo(time) {
    if (comboCount > 0 && time > comboUntil) {
      combo = 1;
      comboCount = 0;
      comboUntil = 0;
    }
    updateComboHud(time);
  }

  function updateComboHud(time) {
    if (!comboPill || !comboText || !comboLabel || !comboBar) return;
    const now = time || performance.now();
    const active = comboCount > 0 && comboUntil > now;
    comboPill.classList.toggle("active", active);
    comboText.textContent = combo > 1 ? `x${combo}` : "x1";
    comboLabel.textContent = comboCount > 1 ? `${comboCount} capturas` : "Racha";
    const pct = active ? Math.max(0, Math.min(1, (comboUntil - now) / comboWindow)) : 0;
    comboBar.style.transform = `scaleX(${pct})`;
  }

  function unlockAudio() {
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      audioContext = new AudioCtor();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  }

  function playEatSound(value, multiplier) {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const intensity = Math.min(value, 150);
    const gain = audioContext.createGain();
    const primary = audioContext.createOscillator();
    const sparkle = audioContext.createOscillator();
    primary.type = "sine";
    sparkle.type = value >= 75 ? "triangle" : "sine";
    primary.frequency.setValueAtTime(420 + intensity * 5, now);
    primary.frequency.exponentialRampToValueAtTime(680 + intensity * 4, now + 0.09);
    sparkle.frequency.setValueAtTime(value >= 75 ? 1280 : 880, now);
    sparkle.frequency.exponentialRampToValueAtTime(value >= 75 ? 1860 : 1120, now + 0.07);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(value >= 75 ? 0.13 : 0.08, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    primary.connect(gain);
    sparkle.connect(gain);
    gain.connect(audioContext.destination);
    primary.start(now);
    sparkle.start(now);
    primary.stop(now + 0.17);
    sparkle.stop(now + 0.12);
    if (multiplier >= 3) {
      setTimeout(() => playTinyPing(1560 + multiplier * 120), 60);
    }
  }

  function playTinyPing(frequency) {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    const tone = audioContext.createOscillator();
    tone.type = "triangle";
    tone.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    tone.connect(gain);
    gain.connect(audioContext.destination);
    tone.start(now);
    tone.stop(now + 0.12);
  }

  function playLevelSound() {
    playTinyPing(980);
    setTimeout(() => playTinyPing(1320), 70);
    setTimeout(() => playTinyPing(1760), 140);
  }

  function playGameOverSound() {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    const tone = audioContext.createOscillator();
    tone.type = "sawtooth";
    tone.frequency.setValueAtTime(180, now);
    tone.frequency.exponentialRampToValueAtTime(70, now + 0.28);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    tone.connect(gain);
    gain.connect(audioContext.destination);
    tone.start(now);
    tone.stop(now + 0.34);
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
    controls.classList.remove("active");
    playGameOverSound();
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
