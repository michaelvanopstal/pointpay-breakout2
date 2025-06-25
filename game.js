const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let elapsedTime = 0;
let timerInterval = null;
let timerRunning = false;
let score = 0;
let ballRadius = 8;
let ballLaunched = false;
let paddleHeight = 10;
let paddleWidth = 100;
let paddleX = (canvas.width - paddleWidth) / 2;
let rightPressed = false;
let leftPressed = false;
let flagsOnPaddle = false;
let flagTimer = 0;
let flyingCoins = [];
let lives = 3;
let level = 1;
let gameOver = false;
let ballMoving = false;
let rocketFired = false;
let rocketSpeed = 10;
let smokeParticles = [];
let explosions = [];
let rocketAmmo = 0;
let balls = [];

balls.push({
  x: canvas.width / 2,
  y: canvas.height - paddleHeight - ballRadius * 2,
  dx: 3,
  dy: -3,
  radius: ballRadius,
  isMain: true
});

const bonusBricks = [
  { col: 6, row: 8, type: "rocket" },
  { col: 8, row: 6, type: "power" },
  { col: 2, row: 9, type: "doubleball" }
];

const customBrickWidth = 70;
const customBrickHeight = 25;
const brickRowCount = 15;
const brickColumnCount = 9;
const brickWidth = customBrickWidth;
const brickHeight = customBrickHeight;

const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
  bricks[c] = [];
  for (let r = 0; r < brickRowCount; r++) {
    let type = "normal";
    const bonus = bonusBricks.find(b => b.col === c && b.row === r);
    if (bonus) type = bonus.type;
    bricks[c][r] = {
      x: 0,
      y: 0,
      col: c,
      row: r,
      status: 1,
      type: type
    };
  }
}

const doubleBallImg = new Image();
doubleBallImg.src = "2 balls.png";
const blockImg = new Image();
blockImg.src = "block_logo.png";
const ballImg = new Image();
ballImg.src = "ball_logo.png";
const vlagImgLeft = new Image();
vlagImgLeft.src = "vlaggetje1.png";
const vlagImgRight = new Image();
vlagImgRight.src = "vlaggetje2.png";
const shootCoinImg = new Image();
shootCoinImg.src = "3.png";
const powerBlockImg = new Image();
powerBlockImg.src = "power_block_logo.png";
const powerBlock2Img = new Image();
powerBlock2Img.src = "signalblock2.png";
const rocketImg = new Image();
rocketImg.src = "raket1.png";

let rocketActive = false;
let rocketX = 0;
let rocketY = 0;

console.log("keydown-handler wordt nu actief");

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
document.addEventListener("mousemove", mouseMoveHandler);

function keyDownHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
  else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;

  if ((e.key === "ArrowUp" || e.key === "Up") && !ballLaunched) {
    ballLaunched = true;
    ballMoving = true;
    if (!timerRunning) startTimer();
    score = 0;
    document.getElementById("scoreDisplay").textContent = "score 0 pxp.";
  }

  if ((e.code === "ArrowUp" || e.code === "Space") && rocketActive && rocketAmmo > 0 && !rocketFired) {
    rocketFired = true;
    rocketAmmo--;
  }

  if (flagsOnPaddle && (e.code === "Space" || e.code === "ArrowUp")) {
    shootFromFlags();
  }

  if (!ballMoving && (e.code === "ArrowUp" || e.code === "Space")) {
    if (lives <= 0) {
      lives = 3;
      score = 0;
      level = 1;
      resetBricks();
      resetBall();
      resetPaddle();
      startTime = new Date();
      gameOver = false;
      document.getElementById("scoreDisplay").textContent = "score " + score + " pxp.";
      document.getElementById("timeDisplay").textContent = "time 00:00";
      flagsOnPaddle = false;
      flyingCoins = [];
    }
    ballMoving = true;
  }
}

function keyUpHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
  else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
}

function mouseMoveHandler(e) {
  const relativeX = e.clientX - canvas.offsetLeft;
  if (relativeX > 0 && relativeX < canvas.width) {
    paddleX = relativeX - paddleWidth / 2;
  }
}

function drawBricks() {
  const totalBricksWidth = brickColumnCount * brickWidth;
  const offsetX = (canvas.width - totalBricksWidth) / 2;
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status === 1) {
        const brickX = offsetX + c * brickWidth;
        const brickY = r * brickHeight;
        b.x = brickX;
        b.y = brickY;
        switch (b.type) {
          case "rocket":
            ctx.drawImage(powerBlock2Img, brickX, brickY, brickWidth, brickHeight); break;
          case "power":
            ctx.drawImage(powerBlockImg, brickX, brickY, brickWidth, brickHeight); break;
          case "doubleball":
            ctx.drawImage(doubleBallImg, brickX, brickY, brickWidth, brickHeight); break;
          default:
            ctx.drawImage(blockImg, brickX, brickY, brickWidth, brickHeight); break;
        }
      }
    }
  }
}

function drawBalls() {
  balls.forEach(ball => {
    ctx.drawImage(ballImg, ball.x, ball.y, ball.radius * 2, ball.radius * 2);
  });
}

function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

function resetBall() {
  balls = [{
    x: paddleX + paddleWidth / 2 - ballRadius,
    y: canvas.height - paddleHeight - ballRadius * 2,
    dx: 0,
    dy: -4,
    radius: ballRadius,
    isMain: true
  }];
}

function resetPaddle() {
  paddleX = (canvas.width - paddleWidth) / 2;
}

function spawnExtraBall(originBall) {
  const angleOffset = Math.PI / 6;
  const speed = Math.sqrt(originBall.dx ** 2 + originBall.dy ** 2);
  const angle1 = Math.atan2(originBall.dy, originBall.dx) - angleOffset;
  originBall.dx = speed * Math.cos(angle1);
  originBall.dy = speed * Math.sin(angle1);
  const angle2 = Math.atan2(originBall.dy, originBall.dx) + 2 * angleOffset;
  balls.push({
    x: originBall.x,
    y: originBall.y,
    dx: speed * Math.cos(angle2),
    dy: speed * Math.sin(angle2),
    radius: ballRadius,
    isMain: false
  });
}

function collisionDetection() {
  balls.forEach(ball => {
    for (let c = 0; c < brickColumnCount; c++) {
      for (let r = 0; r < brickRowCount; r++) {
        const b = bricks[c][r];
        if (b.status === 1 &&
            ball.x > b.x && ball.x < b.x + brickWidth &&
            ball.y > b.y && ball.y < b.y + brickHeight) {
          ball.dy = -ball.dy;
          switch (b.type) {
            case "power":
              flagsOnPaddle = true;
              flagTimer = Date.now();
              break;
            case "rocket":
              rocketActive = true;
              rocketAmmo = 3;
              break;
            case "doubleball":
              spawnExtraBall(ball);
              break;
          }
          b.status = 0;
          b.type = "normal";
          score += 10;
          spawnCoin(b.x, b.y);
          document.getElementById("scoreDisplay").textContent = "score " + score + " pxp.";
        }
      }
    }
  });
}

let imagesLoaded = 0;
function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === 5) {
    resetBall();
    draw();
  }
}
blockImg.onload = onImageLoad;
ballImg.onload = onImageLoad;
powerBlockImg.onload = onImageLoad;
powerBlock2Img.onload = onImageLoad;
rocketImg.onload = onImageLoad;


document.addEventListener("mousedown", function () {
  if (rocketActive && rocketAmmo > 0 && !rocketFired) {
    rocketFired = true;
    rocketAmmo--;
  } else if (flagsOnPaddle) {
    shootFromFlags();
  }
}); 

