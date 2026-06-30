// 取得 Canvas 與繪圖工具。所有遊戲圖形都會畫在 ctx 上。
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 板子的設定：位於畫面底部，由左右方向鍵控制。
const paddle = {
  width: 120,
  height: 16,
  x: 0,
  y: canvas.height - 42,
  speed: 8,
};

// 球的大小、位置和每一幀的移動距離。
const ball = {
  radius: 10,
  x: 0,
  y: 0,
  dx: 4,
  dy: -4,
};

// 磚塊排列設定。
const brickRowCount = 5;
const brickColumnCount = 10;
const brickWidth = 68;
const brickHeight = 22;
const brickPadding = 8;
const brickOffsetTop = 70;
const brickOffsetLeft = 24;

let bricks = [];
let score = 0;
let gameOver = false;
let rightPressed = false;
let leftPressed = false;

// 建立所有磚塊。status 為 1 代表還存在，0 代表已被打掉。
function createBricks() {
  bricks = [];

  for (let column = 0; column < brickColumnCount; column += 1) {
    bricks[column] = [];

    for (let row = 0; row < brickRowCount; row += 1) {
      bricks[column][row] = { x: 0, y: 0, status: 1 };
    }
  }
}

// 將遊戲回復到初始狀態，可在第一次載入及重新開始時使用。
function resetGame() {
  paddle.x = (canvas.width - paddle.width) / 2;
  ball.x = canvas.width / 2;
  ball.y = paddle.y - ball.radius;
  ball.dx = Math.random() > 0.5 ? 4 : -4;
  ball.dy = -4;
  score = 0;
  gameOver = false;
  rightPressed = false;
  leftPressed = false;
  createBricks();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();
  ctx.closePath();
}

function drawPaddle() {
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBricks() {
  const colors = ["#fb7185", "#fbbf24", "#4ade80", "#22d3ee", "#a78bfa"];

  for (let column = 0; column < brickColumnCount; column += 1) {
    for (let row = 0; row < brickRowCount; row += 1) {
      const brick = bricks[column][row];

      if (brick.status === 1) {
        brick.x = brickOffsetLeft + column * (brickWidth + brickPadding);
        brick.y = brickOffsetTop + row * (brickHeight + brickPadding);

        ctx.fillStyle = colors[row];
        ctx.fillRect(brick.x, brick.y, brickWidth, brickHeight);
      }
    }
  }
}

function drawScore() {
  ctx.font = "bold 22px Arial";
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "left";
  ctx.fillText(`分數：${score}`, 24, 36);
}

// 遊戲結束時，在 Canvas 中央顯示提示文字。
function drawGameOver() {
  ctx.fillStyle = "rgb(15 23 42 / 75%)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#fb7185";
  ctx.font = "bold 52px Arial";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 16);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "24px Arial";
  ctx.fillText("按空白鍵重新開始", canvas.width / 2, canvas.height / 2 + 36);
}

// 檢查球是否進入某一塊仍存在的磚塊。
function detectBrickCollisions() {
  for (let column = 0; column < brickColumnCount; column += 1) {
    for (let row = 0; row < brickRowCount; row += 1) {
      const brick = bricks[column][row];

      if (
        brick.status === 1
        && ball.x + ball.radius > brick.x
        && ball.x - ball.radius < brick.x + brickWidth
        && ball.y + ball.radius > brick.y
        && ball.y - ball.radius < brick.y + brickHeight
      ) {
        ball.dy = -ball.dy;
        brick.status = 0;
        score += 10;
        return; // 一幀只處理一塊磚，避免球同時重複反彈。
      }
    }
  }
}

function movePaddle() {
  if (rightPressed) {
    paddle.x = Math.min(paddle.x + paddle.speed, canvas.width - paddle.width);
  }

  if (leftPressed) {
    paddle.x = Math.max(paddle.x - paddle.speed, 0);
  }
}

function moveBall() {
  // 碰到左右牆壁時，反轉水平速度。
  if (
    ball.x + ball.dx + ball.radius > canvas.width
    || ball.x + ball.dx - ball.radius < 0
  ) {
    ball.dx = -ball.dx;
  }

  // 碰到上方牆壁時，反轉垂直速度。
  if (ball.y + ball.dy - ball.radius < 0) {
    ball.dy = -ball.dy;
  }

  // 球向下移動且碰到板子時，讓球往上反彈。
  const hitsPaddle = (
    ball.dy > 0
    && ball.y + ball.radius >= paddle.y
    && ball.y + ball.radius <= paddle.y + paddle.height
    && ball.x >= paddle.x
    && ball.x <= paddle.x + paddle.width
  );

  if (hitsPaddle) {
    ball.dy = -Math.abs(ball.dy);

    // 依照擊中板子的位置改變水平速度，遊戲操作會更有趣。
    const hitPosition = (ball.x - paddle.x) / paddle.width - 0.5;
    ball.dx = hitPosition * 10;
  }

  ball.x += ball.dx;
  ball.y += ball.dy;

  // 球的頂端也離開 Canvas 底部時，遊戲結束。
  if (ball.y - ball.radius > canvas.height) {
    gameOver = true;
  }
}

// requestAnimationFrame 會讓瀏覽器在每次準備更新畫面時執行 draw。
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawBall();
  drawPaddle();
  drawScore();

  if (gameOver) {
    drawGameOver();
    return; // 停止安排下一幀，直到玩家按空白鍵。
  }

  detectBrickCollisions();
  movePaddle();
  moveBall();
  requestAnimationFrame(draw);
}

function handleKeyDown(event) {
  if (event.key === "ArrowRight") {
    rightPressed = true;
    event.preventDefault();
  } else if (event.key === "ArrowLeft") {
    leftPressed = true;
    event.preventDefault();
  } else if (event.code === "Space" && gameOver) {
    event.preventDefault();
    resetGame();
    draw();
  }
}

function handleKeyUp(event) {
  if (event.key === "ArrowRight") {
    rightPressed = false;
  } else if (event.key === "ArrowLeft") {
    leftPressed = false;
  }
}

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

resetGame();
draw();
