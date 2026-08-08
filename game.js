// 取得 Canvas、繪圖工具與難度選擇面板。
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const difficultyPanel = document.getElementById("difficultyPanel");

// 取得球速滑桿元素。
const speedSlider = document.getElementById("speedSlider");
const speedValDisplay = document.getElementById("speedVal");

// 滑桿數值即時更新顯示。
speedSlider.addEventListener("input", () => {
  speedValDisplay.textContent = parseFloat(speedSlider.value).toFixed(1) + "x";
});

// 三種難度會改變生命、球速和耐久磚塊出現的機率。
// 球速會再乘上玩家設定的倍率。
const difficultySettings = {
  easy: { label: "簡單", lives: 5, ballSpeed: 3.5, hardBrickChance: 0.2 },
  normal: { label: "普通", lives: 3, ballSpeed: 4.5, hardBrickChance: 0.38 },
  hard: { label: "困難", lives: 1, ballSpeed: 5.5, hardBrickChance: 0.58 },
};

const paddle = {
  normalWidth: 120,
  width: 120,
  height: 16,
  x: 0,
  y: canvas.height - 42,
  speed: 8,
  extendedUntil: 0,
};

const ball = { radius: 10, x: 0, y: 0, dx: 4, dy: -4 };

const brickRowCount = 5;
const brickColumnCount = 10;
const brickWidth = 68;
const brickHeight = 22;
const brickPadding = 8;
const brickOffsetTop = 78;
const brickOffsetLeft = 24;

let bricks = [];
let items = [];
let bullets = [];
let score = 0;
let lives = 0;
let ammo = 0;
let difficulty = "normal";
let gameState = "choosing"; // choosing、playing、gameOver、won
let rightPressed = false;
let leftPressed = false;
let animationId = null;

// 建立磚塊。耐久磚塊需要打 2～3 次，破壞後也比較容易掉道具。
function createBricks() {
  bricks = [];
  const settings = difficultySettings[difficulty];

  for (let column = 0; column < brickColumnCount; column += 1) {
    bricks[column] = [];

    for (let row = 0; row < brickRowCount; row += 1) {
      const isHard = Math.random() < settings.hardBrickChance;
      const maxHp = isHard ? (row < 2 ? 3 : 2) : 1;

      bricks[column][row] = {
        x: brickOffsetLeft + column * (brickWidth + brickPadding),
        y: brickOffsetTop + row * (brickHeight + brickPadding),
        hp: maxHp,
        maxHp,
      };
    }
  }
}

// 球速 = 難度基礎速度 × 玩家設定的倍率。
function resetBallAndPaddle() {
  const speedMult = parseFloat(speedSlider.value);
  const speed = difficultySettings[difficulty].ballSpeed * speedMult;
  paddle.width = paddle.normalWidth;
  paddle.extendedUntil = 0;
  paddle.x = (canvas.width - paddle.width) / 2;
  ball.x = canvas.width / 2;
  ball.y = paddle.y - ball.radius - 2;
  ball.dx = (Math.random() > 0.5 ? 1 : -1) * speed;
  ball.dy = -speed;
}

function startGame(selectedDifficulty) {
  difficulty = selectedDifficulty;
  lives = difficultySettings[difficulty].lives;
  score = 0;
  ammo = 0;
  items = [];
  bullets = [];
  gameState = "playing";
  rightPressed = false;
  leftPressed = false;
  difficultyPanel.hidden = true;
  createBricks();
  resetBallAndPaddle();

  cancelAnimationFrame(animationId);
  draw();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();
}

function drawPaddle() {
  ctx.fillStyle = paddle.extendedUntil > performance.now() ? "#4ade80" : "#38bdf8";
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBricks() {
  const colors = ["#fb7185", "#fbbf24", "#4ade80", "#22d3ee", "#a78bfa"];

  for (let column = 0; column < brickColumnCount; column += 1) {
    for (let row = 0; row < brickRowCount; row += 1) {
      const brick = bricks[column][row];

      if (brick.hp > 0) {
        ctx.globalAlpha = 0.55 + brick.hp / brick.maxHp * 0.45;
        ctx.fillStyle = colors[row];
        ctx.fillRect(brick.x, brick.y, brickWidth, brickHeight);
        ctx.globalAlpha = 1;

        // 耐久磚塊顯示剩餘敲擊次數。
        if (brick.maxHp > 1) {
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 14px Arial";
          ctx.textAlign = "center";
          ctx.fillText(brick.hp, brick.x + brickWidth / 2, brick.y + 16);
        }
      }
    }
  }
}

function drawHud() {
  const mult = parseFloat(speedSlider.value).toFixed(1);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`分數：${score}`, 20, 32);
  ctx.fillText(`難度：${difficultySettings[difficulty].label}`, 160, 32);

  // 用愛心做簡單的生命值計量。
  ctx.fillStyle = "#fb7185";
  ctx.fillText(`生命：${"♥".repeat(lives)}`, 330, 32);

  ctx.fillStyle = ammo > 0 ? "#fbbf24" : "#94a3b8";
  ctx.fillText(`子彈：${ammo}`, 600, 32);

  // 右上角顯示目前球速倍率。
  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px Arial";
  ctx.fillText(`球速：${mult}x`, 695, 32);
}

// 道具圖示：紅色生命、黃色子彈、綠色平台藥水。
function drawItems() {
  const labels = { life: "♥", weapon: "✦", extend: "↔" };
  const colors = { life: "#fb7185", weapon: "#fbbf24", extend: "#4ade80" };

  items.forEach((item) => {
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    ctx.fillStyle = colors[item.type];
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(labels[item.type], item.x, item.y + 5);

    if (item.fallStyle === "feather") {
      ctx.strokeStyle = "#f8fafc";
      ctx.strokeRect(item.x - 13, item.y - 13, 26, 26);
    }
  });
}

function drawBullets() {
  ctx.fillStyle = "#fbbf24";
  bullets.forEach((bullet) => ctx.fillRect(bullet.x - 2, bullet.y, 4, 12));
}

function drawMessage(title, subtitle) {
  ctx.fillStyle = "rgb(15 23 42 / 78%)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = gameState === "won" ? "#4ade80" : "#fb7185";
  ctx.font = "bold 52px Arial";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 18);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "24px Arial";
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 35);
}

// 硬磚比普通磚更容易掉落道具；其中 25% 是更慢但效果更好的羽毛飄落。
function maybeDropItem(brick) {
  const dropChance = brick.maxHp > 1 ? 0.48 : 0.2;
  if (Math.random() >= dropChance) return;

  const types = ["life", "weapon", "extend"];
  const fallStyle = Math.random() < 0.25 ? "feather" : "normal";
  items.push({
    type: types[Math.floor(Math.random() * types.length)],
    fallStyle,
    x: brick.x + brickWidth / 2,
    y: brick.y + brickHeight / 2,
    radius: fallStyle === "feather" ? 11 : 10,
    speed: fallStyle === "feather" ? 0.75 : 2,
    age: Math.random() * 10,
  });
}

function damageBrick(brick) {
  brick.hp -= 1;
  score += 5;

  if (brick.hp === 0) {
    score += brick.maxHp * 10;
    maybeDropItem(brick);
  }
}

function detectBrickCollisions() {
  for (let column = 0; column < brickColumnCount; column += 1) {
    for (let row = 0; row < brickRowCount; row += 1) {
      const brick = bricks[column][row];
      const hitsBrick = brick.hp > 0
        && ball.x + ball.radius > brick.x
        && ball.x - ball.radius < brick.x + brickWidth
        && ball.y + ball.radius > brick.y
        && ball.y - ball.radius < brick.y + brickHeight;

      if (hitsBrick) {
        ball.dy = -ball.dy;
        damageBrick(brick);
        return;
      }
    }
  }
}

function movePaddle() {
  if (rightPressed) paddle.x += paddle.speed;
  if (leftPressed) paddle.x -= paddle.speed;
  paddle.x = Math.max(0, Math.min(paddle.x, canvas.width - paddle.width));

  // 藥水時間結束後恢復原本長度，同時避免板子跑出右側。
  if (paddle.extendedUntil > 0 && performance.now() >= paddle.extendedUntil) {
    paddle.width = paddle.normalWidth;
    paddle.extendedUntil = 0;
    paddle.x = Math.min(paddle.x, canvas.width - paddle.width);
  }
}

function moveBall() {
  if (ball.x + ball.dx + ball.radius > canvas.width || ball.x + ball.dx - ball.radius < 0) {
    ball.dx = -ball.dx;
  }
  if (ball.y + ball.dy - ball.radius < 0) ball.dy = -ball.dy;

  const hitsPaddle = ball.dy > 0
    && ball.y + ball.radius >= paddle.y
    && ball.y + ball.radius <= paddle.y + paddle.height
    && ball.x >= paddle.x
    && ball.x <= paddle.x + paddle.width;

  if (hitsPaddle) {
    ball.dy = -Math.abs(ball.dy);
    ball.dx = ((ball.x - paddle.x) / paddle.width - 0.5) * 10;
  }

  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.y - ball.radius > canvas.height) {
    lives -= 1;
    if (lives <= 0) {
      gameState = "gameOver";
    } else {
      resetBallAndPaddle();
    }
  }
}

function applyItem(item) {
  const isFeather = item.fallStyle === "feather";

  if (item.type === "life") {
    lives += isFeather ? 2 : 1;
  } else if (item.type === "weapon") {
    ammo += isFeather ? 20 : 8;
  } else {
    paddle.width = isFeather ? 220 : 175;
    // 重複取得會從現在重新計時，而不是沿用快結束的時間。
    paddle.extendedUntil = performance.now() + (isFeather ? 16000 : 10000);
    paddle.x = Math.min(paddle.x, canvas.width - paddle.width);
  }
}

function updateItems() {
  items = items.filter((item) => {
    item.age += 0.06;

    // 羽毛用正弦波左右搖擺，並加入少量隨機漂移。
    if (item.fallStyle === "feather") {
      item.x += Math.sin(item.age) * 1.4 + (Math.random() - 0.5) * 0.55;
    }
    item.y += item.speed;

    const caught = item.y + item.radius >= paddle.y
      && item.y - item.radius <= paddle.y + paddle.height
      && item.x >= paddle.x
      && item.x <= paddle.x + paddle.width;

    if (caught) {
      applyItem(item);
      return false;
    }
    return item.y - item.radius <= canvas.height;
  });
}

function shoot() {
  if (gameState !== "playing" || ammo <= 0) return;
  bullets.push({ x: paddle.x + paddle.width / 2, y: paddle.y - 12 });
  ammo -= 1;
}

function updateBullets() {
  bullets = bullets.filter((bullet) => {
    bullet.y -= 8;

    for (let column = 0; column < brickColumnCount; column += 1) {
      for (let row = 0; row < brickRowCount; row += 1) {
        const brick = bricks[column][row];
        const hitsBrick = brick.hp > 0
          && bullet.x >= brick.x
          && bullet.x <= brick.x + brickWidth
          && bullet.y <= brick.y + brickHeight
          && bullet.y + 12 >= brick.y;

        if (hitsBrick) {
          damageBrick(brick);
          return false;
        }
      }
    }
    return bullet.y > -12;
  });
}

function allBricksDestroyed() {
  return bricks.every((column) => column.every((brick) => brick.hp <= 0));
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawItems();
  drawBullets();
  drawBall();
  drawPaddle();
  drawHud();

  if (gameState === "gameOver") {
    drawMessage("Game Over", "按 Enter 回到難度選擇");
    return;
  }
  if (gameState === "won") {
    drawMessage("你贏了！", "按 Enter 再玩一次");
    return;
  }

  detectBrickCollisions();
  movePaddle();
  moveBall();
  updateItems();
  updateBullets();

  if (allBricksDestroyed()) gameState = "won";
  animationId = requestAnimationFrame(draw);
}

function showDifficultyPanel() {
  gameState = "choosing";
  difficultyPanel.hidden = false;
}

function handleKeyDown(event) {
  if (event.key === "ArrowRight") {
    rightPressed = true;
    event.preventDefault();
  } else if (event.key === "ArrowLeft") {
    leftPressed = true;
    event.preventDefault();
  } else if (event.code === "Space") {
    event.preventDefault();
    shoot();
  } else if (event.key === "Enter" && (gameState === "gameOver" || gameState === "won")) {
    showDifficultyPanel();
  }
}

function handleKeyUp(event) {
  if (event.key === "ArrowRight") rightPressed = false;
  if (event.key === "ArrowLeft") leftPressed = false;
}

difficultyPanel.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-difficulty]");
  if (button) startGame(button.dataset.difficulty);
});

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

// 選擇難度前先畫一個安靜的背景。
ctx.fillStyle = "#111827";
ctx.fillRect(0, 0, canvas.width, canvas.height);
