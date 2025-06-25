const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let elapsedTime = 0;
let timerInterval = null;
let timerRunning = false;
let score = 0;
let ballRadius = 8;
let dx = 4;
let dy = -4;
let ballLaunched = false;
let x;
let y;
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
let secondBallActive = false;
let secondBall = { x: 0, y: 0, dx: 0, dy: 0 };
let secondBallDuration = 60000; // 1 minuut in ms
let rocketAmmo = 0; // aantal raketten dat nog afgevuurd mag worden

let bootBonusActive = false;
let boatX = 0;
let boatY = 0;
let boatSpeed = 2;
let boatTimer = 0;
let resetBricksOnDeath = false; // ← voeg deze hier toe
let waterOffsetX = 0; // horizontale schuiving
let waterOffset = 0;





const bonusBricks = [
  { col: 6, row: 8, type: "rocket" },
  { col: 8, row: 6, type: "power" },
  { col: 2, row: 9, type: "doubleball" },
  { col: 4, row: 14, type: "boot" },

];


const customBrickWidth = 70;   // pas aan zoals jij wilt
const customBrickHeight = 25;  // pas aan zoals jij wilt
const brickRowCount = 15;
const brickColumnCount = 9;
const brickWidth = customBrickWidth;
const brickHeight = customBrickHeight;


const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
  bricks[c] = [];
  for (let r = 0; r < brickRowCount; r++) {
    // standaardtype
    let type = "normal";

    // check of deze positie een bonusblok is
    const bonus = bonusBricks.find(b => b.col === c && b.row === r);
    if (bonus) type = bonus.type;

    // blok aanmaken met extra gegevens
    bricks[c][r] = {
      x: 0,
      y: 0,
      col: c,    // ← kolompositie (voor gedrag of debug)
      row: r,    // ← rijpositie
      status: 1,
      type: type
    };
  }
}

const boatPaddleImg = new Image();
boatPaddleImg.src = "pointpay_bood.png";



const bootBlockImg = new Image();
bootBlockImg.src = "boot_block_logo.png";

const boatImg = new Image();
boatImg.src = "pointpay_bood.png";

const doubleBallImg = new Image();
doubleBallImg.src = "2 balls.png";  // upload dit naar dezelfde map


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

const powerBlockImg = new Image(); // Voor bonusblok type 'power'
powerBlockImg.src = "power_block_logo.png";

const powerBlock2Img = new Image(); // Voor bonusblok type 'rocket'
powerBlock2Img.src = "signalblock2.png";

const rocketImg = new Image();
rocketImg.src = "raket1.png";

let rocketActive = false; // Voor nu altijd zichtbaar om te testen
let rocketX = 0;
let rocketY = 0;

  

console.log("keydown-handler wordt nu actief");

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
document.addEventListener("mousemove", mouseMoveHandler);

function keyDownHandler(e) {
  console.log("Toets ingedrukt:", e.key);

  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = true;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = true;
  }

  if ((e.key === "ArrowUp" || e.key === "Up") && !ballLaunched) {
    ballLaunched = true;
    ballMoving = true;
    dx = 0;
    dy = -4;
    if (!timerRunning) startTimer();
    score = 0;
    document.getElementById("scoreDisplay").textContent = "score 0 pxp.";
  }

  if (
    (e.code === "ArrowUp" || e.code === "Space") &&
    rocketActive &&
    rocketAmmo > 0 &&
    !rocketFired
  ) {
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
      resetBall(); // ✅ Zorg dat dit hier staat
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

  if (e.code === "KeyB") {
    startBootBonus();
  }
}


function keyUpHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
  else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
}

function spawnSecondBall() {
  secondBall.x = x;
  secondBall.y = y;
  secondBall.dx = dx;
  secondBall.dy = dy;
  secondBallActive = true;
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
         ctx.drawImage(powerBlock2Img, brickX, brickY, brickWidth, brickHeight);
         break;
         case "power":
         ctx.drawImage(powerBlockImg, brickX, brickY, brickWidth, brickHeight);
         break;
         case "doubleball":
         ctx.drawImage(doubleBallImg, brickX, brickY, brickWidth, brickHeight);
         break;
         case "signal":
         ctx.drawImage(signalBlockImg, brickX, brickY, brickWidth, brickHeight);
         break;
         default:
         ctx.drawImage(blockImg, brickX, brickY, brickWidth, brickHeight);
         break;
        case "boot":
        ctx.drawImage(bootBlockImg, brickX, brickY, brickWidth, brickHeight);
        break;

        }
      }
    }
  }
}

function drawBoat() {
  let boatY = canvas.height - 60 + Math.sin((paddleX + paddleWidth / 2 + waterOffset) * 0.04) * 8 - 40;
  ctx.drawImage(boatPaddleImg, paddleX, boatY, paddleWidth, paddleHeight + 20);
}


function drawWater() {
  ctx.save();

  // Laag 1 – diepe watergolf
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (let x = 0; x <= canvas.width; x++) {
    let y = canvas.height - 50 + Math.sin((x + waterOffset * 0.8) * 0.03) * 10;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();

  let gradient1 = ctx.createLinearGradient(0, canvas.height - 60, 0, canvas.height);
  gradient1.addColorStop(0, 'rgba(0, 140, 255, 0.5)');
  gradient1.addColorStop(1, 'rgba(0, 80, 200, 0.3)');
  ctx.fillStyle = gradient1;
  ctx.fill();

  // Laag 2 – voorgrondgolf
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (let x = 0; x <= canvas.width; x++) {
    let y = canvas.height - 55 + Math.sin((x + waterOffset) * 0.05) * 6;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();

  let gradient2 = ctx.createLinearGradient(0, canvas.height - 60, 0, canvas.height);
  gradient2.addColorStop(0, 'rgba(0, 170, 255, 0.35)');
  gradient2.addColorStop(1, 'rgba(0, 100, 255, 0.2)');
  ctx.fillStyle = gradient2;
  ctx.fill();

  ctx.restore();

  waterOffset += 1.5;
}





function drawBall() {
  ctx.drawImage(ballImg, x, y, ballRadius * 2, ballRadius * 2);
}

function drawPaddle() {
  if (bootBonusActive) return; // ⛔ Niet tekenen tijdens bootbonus

  ctx.beginPath();
  ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

function resetBall() {
  if (bootBonusActive) {
    // Center de bal op de boot
    x = boatX + paddleWidth / 2 - ballRadius;
    y = boatY - ballRadius * 2;
  } else {
    // Center de bal op de paddle
    x = paddleX + paddleWidth / 2 - ballRadius;
    y = canvas.height - paddleHeight - ballRadius * 2;
  }
}


function resetPaddle() {
  paddleX = (canvas.width - paddleWidth) / 2;

}

function startBootBonus() {
  bootBonusActive = true;
  waterY = canvas.height;
  waterState = 'rising';

  // Zet de boot in het midden op juiste hoogte
  boatX = paddleX;
  boatY = canvas.height - paddleHeight * 3;

  // Reset rocket, vlaggen en ballen voor zuiverheid
  rocketActive = false;
  rocketAmmo = 0;
  flagsOnPaddle = false;
  flyingCoins = [];
  secondBallActive = false;
}
 
function drawPaddleFlags() {
  if (flagsOnPaddle && Date.now() - flagTimer < 20000) {
    ctx.drawImage(vlagImgLeft, paddleX - 5, canvas.height - paddleHeight - 40, 45, 45);
    ctx.drawImage(vlagImgRight, paddleX + paddleWidth - 31, canvas.height - paddleHeight - 40, 45, 45);
  } else if (flagsOnPaddle && Date.now() - flagTimer >= 20000) {
    flagsOnPaddle = false;
  }
}

function shootFromFlags() {
  const coinSpeed = 8;

  // Linkervlag
  flyingCoins.push({
    x: paddleX - 5 + 12,
    y: canvas.height - paddleHeight - 40,
    dy: -coinSpeed,
    active: true
  });

  // Rechtervlag
  flyingCoins.push({
    x: paddleX + paddleWidth - 19 + 12,
    y: canvas.height - paddleHeight - 40,
    dy: -coinSpeed,
    active: true
  });
}

function checkFlyingCoinHits() {
  flyingCoins.forEach((coin) => {
    if (!coin.active) return;

    for (let c = 0; c < brickColumnCount; c++) {
      for (let r = 0; r < brickRowCount; r++) {
        const b = bricks[c][r];
        if (b.status === 1 &&
            coin.x > b.x &&
            coin.x < b.x + brickWidth &&
            coin.y > b.y &&
            coin.y < b.y + brickHeight) {
          b.status = 0;
          coin.active = false;    
          score += 10;
          document.getElementById("scoreDisplay").textContent = "score " + score + " pxp.";
          return; 
        }
      }
    }
  });
}



function startTimer() {
  timerRunning = true;
  timerInterval = setInterval(() => {
    elapsedTime++;
    const minutes = String(Math.floor(elapsedTime / 60)).padStart(2, '0');
    const seconds = String(elapsedTime % 60).padStart(2, '0');
    document.getElementById("timeDisplay").textContent = "time " + minutes + ":" + seconds;
  }, 1000);
}

function collisionDetection() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      let b = bricks[c][r];
      if (b.status === 1) {
        if (
          x > b.x &&
          x < b.x + brickWidth &&
          y > b.y &&
          y < b.y + brickHeight
        ) {
          dy = -dy;

          switch (b.type) {
            case "power":
              flagsOnPaddle = true;
              flagTimer = Date.now();
              break;
            case "rocket":
              rocketActive = true;
              rocketAmmo = 3; // geef 3 raketten
              break;
            case "doubleball":
              spawnSecondBall();
              setTimeout(() => {
                secondBallActive = false;
              }, secondBallDuration);
              break;
            case "boot":
              startBootBonus();
              break;
          }

          b.status = 0;
          b.type = "normal"; // terug naar normaal type na raken
          score += 10;
          spawnCoin(b.x, b.y);
          document.getElementById("scoreDisplay").textContent = "score " + score + " pxp.";
        }
      }
    }
  }
}

  

  function saveHighscore() {
  const timeText = document.getElementById("timeDisplay").textContent.replace("time ", "");
  const highscore = {
    name: window.currentPlayer || "Unknown",
    score: score,
   time: timeText
    
  };

  let highscores = JSON.parse(localStorage.getItem("highscores")) || [];
  if (!highscores.some(h => h.name === highscore.name && h.score === highscore.score && h.time === highscore.time)) {
    highscores.push(highscore);
  }
  highscores.sort((a, b) => b.score - a.score || a.time.localeCompare(b.time));
  highscores = highscores.slice(0, 10);
  localStorage.setItem("highscores", JSON.stringify(highscores));

  const list = document.getElementById("highscore-list");
  list.innerHTML = "";
  highscores.forEach((entry, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1} ${entry.name} - ${entry.score} pxp - ${entry.time}`;
    list.appendChild(li);
  });
}

const coinImg = new Image();
coinImg.src = "pxp coin perfect_clipped_rev_1.png";
let coins = [];

function spawnCoin(x, y) {
  coins.push({ x: x + brickWidth / 2 - 12, y: y, radius: 12, active: true });
}

function drawCoins() {
  coins.forEach(coin => {
    if (coin.active) {
      ctx.drawImage(coinImg, coin.x, coin.y, 24, 24);
      coin.y += 2;
    }
  });
}

function drawFlyingCoins() {
  flyingCoins.forEach((coin) => {
    if (coin.active) {
      ctx.drawImage(shootCoinImg, coin.x - 12, coin.y - 12, 24, 24);
      coin.y += coin.dy;
    }
  });
  
  flyingCoins = flyingCoins.filter(coin => coin.y > -24 && coin.active);
}
function checkRocketCollision() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      let b = bricks[c][r];
      if (b.status === 1 &&
          rocketX + 12 > b.x &&
          rocketX + 12 < b.x + brickWidth &&
          rocketY < b.y + brickHeight &&
          rocketY + 48 > b.y) {

        // vernietig max 4 blokjes (center + links + rechts + onder)
        const targets = [
          [c, r],
          [c - 1, r],
          [c + 1, r],
          [c, r + 1]
        ];

        targets.forEach(([col, row]) => {
  if (
    col >= 0 && col < brickColumnCount &&
    row >= 0 && row < brickRowCount &&
    bricks[col][row].status === 1
  ) {
    bricks[col][row].status = 0;
    score += 10;

    if (rocketAmmo <= 0) {
      rocketActive = false;
    }
  }
});

        document.getElementById("scoreDisplay").textContent = "score " + score + " pxp.";
        rocketFired = false;
        rocketActive = false;
       
        explosions.push({
          x: rocketX + 12,
          y: rocketY,
          radius: 10,
          alpha: 1
         
        });
        
        return; 
      }
    }
  }
}

function checkCoinCollision() {
  coins.forEach(coin => {
    if (
      coin.active &&
      coin.y + coin.radius * 2 >= canvas.height - paddleHeight &&
      coin.x + coin.radius > paddleX &&
      coin.x < paddleX + paddleWidth
    ) {
      coin.active = false;
      score += 5;
      document.getElementById("scoreDisplay").textContent = "score " + score + " pxp.";
  
    }
  });
}

function resetBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      bricks[c][r].status = 1;

      // Bonusblok opnieuw instellen
      const bonus = bonusBricks.find(b => b.col === c && b.row === r);
      bricks[c][r].type = bonus ? bonus.type : "normal";
    }
  }
}

function resetAfterBootBonus() {
  boatX = 0;
  boatY = 0;

  // Paddle neemt positie van de boot over
  paddleX = boatX;

  // Alleen resetBall als bal nog niet beweegt
  if (!ballLaunched && !ballMoving) {
    resetBall();
  }
}

  



function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawCoins();
  checkCoinCollision();
  drawBricks();
  drawPaddleFlags();
  drawFlyingCoins();
  checkFlyingCoinHits();

  if (bootBonusActive) {
  drawBoat();
  drawWater();

  }


  requestAnimationFrame(draw);
}

 if (bootBonusActive) {
  // Water stijgt
  if (waterState === 'rising') {
    waterY -= 1;
    if (waterY <= canvas.height - 100) {
      waterState = 'holding';
      waterTimer = 0;
    }
  }

  // Water wacht boven
  else if (waterState === 'holding') {
    waterTimer++;
    if (waterTimer > 120) {
      waterState = 'falling';
    }
  }

  // Water zakt
  else if (waterState === 'falling') {
    waterY += 1;
    if (waterY >= canvas.height + 30) {
      bootBonusActive = false;
      waterState = 'idle';
      resetAfterBootBonus();
    }
  }

  // Alleen boot beweegt nu
  if (leftPressed) boatX -= boatSpeed;
  if (rightPressed) boatX += boatSpeed;

  // Boot wordt opgeduwd door water
  boatY = waterY - paddleHeight * 3.5;
  ctx.drawImage(boatImg, boatX, boatY, paddleWidth, paddleHeight * 5);


}


// Paddle en bal tekenen
drawBall();
drawPaddle();

  function drawBoatPaddle() {
  let boatY = canvas.height - 60 + Math.sin((paddleX + paddleWidth / 2 + waterOffset) * 0.04) * 8 - 40;
  ctx.drawImage(boatPaddleImg, paddleX, boatY, paddleWidth, paddleHeight + 20);
}

 if (!bootBonusActive) {
  if (rightPressed && paddleX < canvas.width - paddleWidth) {
    paddleX += 7;
  } else if (leftPressed && paddleX > 0) {
    paddleX -= 7;
  }
}

  if (ballLaunched) {
    x += dx;
    y += dy;
  } else {
    x = paddleX + paddleWidth / 2 - ballRadius;
    y = canvas.height - paddleHeight - ballRadius * 2;
  }

  collisionDetection();

  if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) dx = -dx;
  if (y + dy < ballRadius) dy = -dy;

 if (!bootBonusActive) {
  // normale paddle botsing
  if (
    y + dy > canvas.height - paddleHeight - ballRadius &&
    y + dy < canvas.height + 2 &&
    x > paddleX &&
    x < paddleX + paddleWidth
  ) {
    const hitPos = (x - paddleX) / paddleWidth;
    const angle = (hitPos - 0.5) * Math.PI / 2;
    const speed = Math.sqrt(dx * dx + dy * dy);
    dx = speed * Math.sin(angle);
    dy = -Math.abs(speed * Math.cos(angle));
  }
} else {
  // botsing met de boot
  if (
    y + dy > boatY - ballRadius &&
    y + dy < boatY + paddleHeight * 2 &&
    x > boatX &&
    x < boatX + paddleWidth
  ) {
    const hitPos = (x - boatX) / paddleWidth;
    const angle = (hitPos - 0.5) * Math.PI / 2;
    const speed = Math.sqrt(dx * dx + dy * dy);
    dx = speed * Math.sin(angle);
    dy = -Math.abs(speed * Math.cos(angle));
  }

if (bootBonusActive) {
  paddleY = canvas.height - 60 + Math.sin((paddleX + paddleWidth / 2 + waterOffset) * 0.04) * 8 - 40;
} else {
  paddleY = canvas.height - paddleHeight - 10;
  
  }
 }

  if (y + dy > canvas.height - ballRadius) {
  saveHighscore();
  ballLaunched = false;
  ballMoving = false;
  dx = 4;
  dy = -4;
  elapsedTime = 0;
  resetBall();
  resetBricks();
}


  if (secondBallActive) {
    secondBall.x += secondBall.dx;
    secondBall.y += secondBall.dy;
    // ... (rest tweede bal logica)
    ctx.drawImage(ballImg, secondBall.x, secondBall.y, ballRadius * 2, ballRadius * 2);
  }

  if (rocketActive && !rocketFired) {
    rocketX = paddleX + paddleWidth / 2 - 12;
    rocketY = canvas.height - paddleHeight - 48;
    ctx.drawImage(rocketImg, rocketX, rocketY, 30, 65);
  } else if (rocketFired) {
    rocketY -= rocketSpeed;
    smokeParticles.push({ x: rocketX + 15, y: rocketY + 65, radius: Math.random() * 6 + 4, alpha: 1 });
    if (rocketY < -48) {
      rocketFired = false;
      rocketActive = false;
    } else {
      ctx.drawImage(rocketImg, rocketX, rocketY, 30, 65);
      checkRocketCollision();
    }
  }

  explosions.forEach(e => {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 165, 0, ${e.alpha})`;
    ctx.fill();
    e.radius += 2;
    e.alpha -= 0.05;
  });
  
  explosions = explosions.filter(e => e.alpha > 0);

  smokeParticles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(150, 150, 150, ${p.alpha})`;
    ctx.fill();
    p.y += 1;
    p.radius += 0.3;
    p.alpha -= 0.02;
  });
 
smokeParticles = smokeParticles.filter(p => p.alpha > 0);


let imagesLoaded = 0;
const totalImages = 13; // pas aan op basis van jouw echte aantal .src's

function onImageLoad() {
  imagesLoaded++;
  console.log("Afbeelding geladen:", imagesLoaded);

  if (imagesLoaded === totalImages) {
    x = paddleX + paddleWidth / 2 - ballRadius;
    y = canvas.height - paddleHeight - ballRadius * 2;
    draw(); // ✅ start spel pas als alles is geladen
  }
}

boatPaddleImg.onload = onImageLoad;
bootBlockImg.onload = onImageLoad;
boatImg.onload = onImageLoad;
doubleBallImg.onload = onImageLoad;
blockImg.onload = onImageLoad;
ballImg.onload = onImageLoad;
vlagImgLeft.onload = onImageLoad;
vlagImgRight.onload = onImageLoad;
shootCoinImg.onload = onImageLoad;
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
