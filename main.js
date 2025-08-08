// Space Invaders Main Game Logic
// All rights reserved. No external libraries used.
// Author: Genie

// =================== EMBED YANG LI FACE =================== //
const yangImg = new Image();
yangImg.src = 'DATA_URI'; // Replace DATA_URI with your Base64 image string

// =================== CONFIG =================== //
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 18;
const PLAYER_COLOR = "#39ff14";
const PLAYER_SPEED = 6;
const BULLET_WIDTH = 6;
const BULLET_HEIGHT = 16;
const BULLET_SPEED = 9;
const ENEMY_BULLET_SPEED = 5;
const ENEMY_COLOR = "#39ff14";
const ENEMY_ROWS = 5;
const ENEMY_COLS = 10;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 28;
const ENEMY_HORZ_PADDING = 16;
const ENEMY_VERT_PADDING = 22;
const ENEMY_START_Y = 80;
const ENEMY_START_X = 60;
const ENEMY_X_STEP = 22;
const ENEMY_Y_STEP = 20;
const ENEMY_MOVE_INTERVAL = 32; // ms before next move
const ENEMY_SHOOT_CHANCE = 0.003; // per frame per invader
const LIVES_START = 3;

// =================== UTILITY =================== //
function clamp(x, min, max) {
  return Math.max(min, Math.min(x, max));
}

// =================== CLASSES =================== //

// -------- Bullet --------
class Bullet {
  constructor(x, y, dy, owner = "player") {
    this.x = x;
    this.y = y;
    this.dy = dy;
    this.owner = owner; // "player" or "enemy"
    this.active = true;
  }

  update() {
    this.y += this.dy;
    // Remove if out of bounds
    if (this.y < -BULLET_HEIGHT || this.y > CANVAS_HEIGHT + BULLET_HEIGHT) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.owner === "player" ? "#fff" : "#ff5252";
    ctx.fillRect(this.x - BULLET_WIDTH/2, this.y, BULLET_WIDTH, BULLET_HEIGHT);
    ctx.restore();
  }

  collides(rect) {
    // rect: { x, y, width, height }
    return (
      this.x > rect.x &&
      this.x < rect.x + rect.width &&
      this.y + BULLET_HEIGHT > rect.y &&
      this.y < rect.y + rect.height
    );
  }
}

// -------- Invader --------
class Invader {
  constructor(x, y, row, col) {
    this.x = x;
    this.y = y;
    this.width = ENEMY_WIDTH;
    this.height = ENEMY_HEIGHT;
    this.row = row;
    this.col = col;
    this.alive = true;
    this.spriteToggle = false;
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    const isOdd = (this.row + this.col) % 2 === 1;

    const drawGreenInvader = () => {
      ctx.strokeStyle = ENEMY_COLOR;
      ctx.lineWidth = 2;
      ctx.fillStyle = "#39ff14";
      ctx.beginPath();
      ctx.rect(this.x+8, this.y+6, 24, 8);
      ctx.rect(this.x+12, this.y+2, 16, 6);
      ctx.rect(this.x+4, this.y+14, 32, 8);
      ctx.rect(this.x, this.y+22, 8, 4);
      ctx.rect(this.x+32, this.y+22, 8, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    const drawBlueInvader = () => {
      ctx.strokeStyle = ENEMY_COLOR;
      ctx.lineWidth = 2;
      ctx.fillStyle = "#189bff";
      ctx.beginPath();
      ctx.rect(this.x+8, this.y+6, 24, 8);
      ctx.rect(this.x+12, this.y+2, 16, 6);
      ctx.rect(this.x+4, this.y+14, 32, 8);
      ctx.rect(this.x, this.y+22, 8, 4);
      ctx.rect(this.x+32, this.y+22, 8, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    if (isOdd) {
      if (yangImg.complete && yangImg.naturalWidth > 0) {
        ctx.drawImage(yangImg, this.x, this.y, this.width, this.height);
      } else {
        drawBlueInvader();
      }
    } else {
      drawGreenInvader();
    }
    ctx.restore();
  }
}

// -------- Player --------
class Player {
  constructor() {
    this.width = PLAYER_WIDTH;
    this.height = PLAYER_HEIGHT;
    this.x = (CANVAS_WIDTH - this.width) / 2;
    this.y = CANVAS_HEIGHT - 60;
    this.color = PLAYER_COLOR;
    this.lives = LIVES_START;
    this.canShoot = true;
    this.shootCooldown = 0;
  }

  move(dx) {
    this.x += dx;
    this.x = clamp(this.x, 0, CANVAS_WIDTH - this.width);
  }

  update() {
    if (this.shootCooldown > 0) {
      this.shootCooldown -= 1;
      if (this.shootCooldown <= 0) {
        this.canShoot = true;
      }
    }
  }

  shoot() {
    if (this.canShoot) {
      this.canShoot = false;
      this.shootCooldown = 10; // frames
      // Center of ship
      return new Bullet(this.x + this.width / 2, this.y - BULLET_HEIGHT, -BULLET_SPEED, "player");
    }
    return null;
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.fillStyle = this.color;
    // Draw a simple retro spaceship
    ctx.beginPath();
    ctx.moveTo(this.x + this.width/2, this.y);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// -------- Game --------
class Game {
  constructor(ctx) {
    this.ctx = ctx;
    this.state = "start"; // start, playing, gameover
    this.score = 0;
    this.lives = LIVES_START;
    this.player = new Player();
    this.bullets = [];
    this.enemyBullets = [];
    this.invaders = [];
    this.invaderDirection = 1; // 1 = right, -1 = left
    this.invaderMoveTimer = 0;
    this.invaderMoveInterval = ENEMY_MOVE_INTERVAL;
    this.lastInvaderEdge = false;
    this.keys = {};
    this.frameCount = 0;
    this.setupInvaders();
    this.bindInput();
  }

  setupInvaders() {
    this.invaders = [];
    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
        let x = ENEMY_START_X + col * (ENEMY_WIDTH + ENEMY_HORZ_PADDING);
        let y = ENEMY_START_Y + row * (ENEMY_HEIGHT + ENEMY_VERT_PADDING);
        this.invaders.push(new Invader(x, y, row, col));
      }
    }
    this.invaderDirection = 1;
    this.invaderMoveTimer = 0;
    this.lastInvaderEdge = false;
  }

  reset() {
    this.state = "playing";
    this.score = 0;
    this.lives = LIVES_START;
    this.player = new Player();
    this.bullets = [];
    this.enemyBullets = [];
    this.frameCount = 0;
    this.setupInvaders();
    this.updateScoreboard();
  }

  bindInput() {
    window.addEventListener("keydown", (e) => {
      if (this.state === "start" && e.key === "Enter") {
        this.reset();
      }
      if (this.state === "gameover" && (e.key === "Enter" || e.key === " ")) {
        this.reset();
      }
      if (this.state === "playing") {
        if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
          this.keys[e.key] = true;
        }
      }
    });
    window.addEventListener("keyup", (e) => {
      if (this.state === "playing") {
        if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
          this.keys[e.key] = false;
        }
      }
    });
  }

  updateScoreboard() {
    const scoreElem = document.getElementById("score");
    const livesElem = document.getElementById("lives");
    if (scoreElem) scoreElem.innerText = "Score: " + this.score;
    if (livesElem) livesElem.innerText = "Lives: " + this.player.lives;
  }

  handleInput() {
    if (this.keys["ArrowLeft"]) {
      this.player.move(-PLAYER_SPEED);
    }
    if (this.keys["ArrowRight"]) {
      this.player.move(PLAYER_SPEED);
    }
    if (this.keys[" "]) {
      const bullet = this.player.shoot();
      if (bullet) this.bullets.push(bullet);
    }
  }

  update() {
    if (this.state !== "playing") return;

    this.frameCount++;
    this.handleInput();
    this.player.update();

    // Update invaders
    this.invaderMoveTimer += 1;
    let shouldDescend = false;
    if (this.invaderMoveTimer > this.invaderMoveInterval) {
      this.invaderMoveTimer = 0;
      // Find edges
      let minX = Infinity, maxX = -Infinity;
      for (const inv of this.invaders) {
        if (!inv.alive) continue;
        minX = Math.min(minX, inv.x);
        maxX = Math.max(maxX, inv.x + inv.width);
      }
      if (minX === Infinity) {
        // All invaders dead: Win!
        this.state = "gameover";
        return;
      }
      // Reverse and descend if at edge
      if ((this.invaderDirection === 1 && maxX + ENEMY_X_STEP > CANVAS_WIDTH - 10)
        || (this.invaderDirection === -1 && minX - ENEMY_X_STEP < 10)) {
        this.invaderDirection *= -1;
        shouldDescend = true;
      }
      // Move invaders
      for (const inv of this.invaders) {
        if (!inv.alive) continue;
        if (shouldDescend) {
          inv.y += ENEMY_Y_STEP;
        } else {
          inv.x += this.invaderDirection * ENEMY_X_STEP;
        }
        // Toggle sprite for simple animation
        inv.spriteToggle = !inv.spriteToggle;
      }
    }

    // Invader shooting
    for (const inv of this.invaders) {
      if (inv.alive && Math.random() < ENEMY_SHOOT_CHANCE && this.frameCount > 60) {
        // Only bottom-most invader in a column can shoot
        let isLowest = true;
        for (const other of this.invaders) {
          if (other.col === inv.col && other.row > inv.row && other.alive) {
            isLowest = false;
            break;
          }
        }
        if (isLowest) {
          this.enemyBullets.push(
            new Bullet(inv.x + inv.width/2, inv.y + inv.height, ENEMY_BULLET_SPEED, "enemy")
          );
        }
      }
    }

    // Update player bullets
    for (const bullet of this.bullets) bullet.update();
    // Remove inactive
    this.bullets = this.bullets.filter(b => b.active);

    // Update enemy bullets
    for (const bullet of this.enemyBullets) bullet.update();
    this.enemyBullets = this.enemyBullets.filter(b => b.active);

    // Bullet vs Invader collisions
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      for (const inv of this.invaders) {
        if (!inv.alive) continue;
        if (bullet.collides({
          x: inv.x, y: inv.y,
          width: inv.width, height: inv.height
        })) {
          inv.alive = false;
          bullet.active = false;
          this.score += 100;
          this.updateScoreboard();
          break;
        }
      }
    }

    // Enemy bullet vs player collisions
    for (const bullet of this.enemyBullets) {
      if (!bullet.active) continue;
      if (bullet.collides({
        x: this.player.x, y: this.player.y,
        width: this.player.width, height: this.player.height
      })) {
        bullet.active = false;
        this.player.lives--;
        this.updateScoreboard();
        // Flash effect or pause could be added
        if (this.player.lives <= 0) {
          this.state = "gameover";
        }
      }
    }

    // Invader reaches player = game over
    for (const inv of this.invaders) {
      if (!inv.alive) continue;
      if (inv.y + inv.height >= this.player.y) {
        this.state = "gameover";
        break;
      }
    }
  }

  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Draw background grid lines for arcade effect
    this.ctx.save();
    this.ctx.strokeStyle = "#1a1a1a";
    this.ctx.lineWidth = 1;
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(CANVAS_WIDTH, y);
      this.ctx.stroke();
    }
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, CANVAS_HEIGHT);
      this.ctx.stroke();
    }
    this.ctx.restore();

    // Draw entities
    this.player.draw(this.ctx);
    for (const inv of this.invaders) inv.draw(this.ctx);
    for (const bullet of this.bullets) bullet.draw(this.ctx);
    for (const bullet of this.enemyBullets) bullet.draw(this.ctx);

    // Draw UI overlays
    this.ctx.save();
    this.ctx.font = "24px 'Press Start 2P', monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#39ff14";
    if (this.state === "start") {
      this.ctx.shadowColor = "#39ff14";
      this.ctx.shadowBlur = 10;
      this.ctx.fillText("SPACE INVADERS", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 60);
      this.ctx.font = "18px 'Press Start 2P', monospace";
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = "#fff";
      this.ctx.fillText("Press ENTER to Start", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 10);
      this.ctx.font = "14px 'Press Start 2P', monospace";
      this.ctx.fillStyle = "#39ff14";
      this.ctx.fillText("← → Move   SPACE Shoot", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 60);
    } else if (this.state === "gameover") {
      this.ctx.shadowColor = "#ff5252";
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = "#ff5252";
      this.ctx.fillText("GAME OVER", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 40);
      this.ctx.shadowBlur = 0;
      this.ctx.font = "16px 'Press Start 2P', monospace";
      this.ctx.fillStyle = "#fff";
      this.ctx.fillText("Score: " + this.score, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 20);
      this.ctx.font = "14px 'Press Start 2P', monospace";
      this.ctx.fillStyle = "#39ff14";
      this.ctx.fillText("Press ENTER to Restart", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 60);
    }
    this.ctx.restore();
  }
}

// =================== BOOTSTRAP GAME =================== //
window.onload = () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  let game = new Game(ctx);

  function loop() {
    if (game.state === "playing") {
      game.update();
    }
    game.draw();
    requestAnimationFrame(loop);
  }

  loop();
};