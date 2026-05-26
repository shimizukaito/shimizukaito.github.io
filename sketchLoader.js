// js/sketchLoader.js

// 1. 複数のスケッチ関数を定義する（インスタンスモード）
//    必ず function(p) { … } という形で、p5 インスタンスを引数に受け取る

const sketches = [];
const sketchContainerId = 'sketch-root';
function sketchContainer() { return document.getElementById(sketchContainerId); }
function sketchWidth() { const el = sketchContainer(); return Math.max(320, Math.floor((el?.getBoundingClientRect().width || window.innerWidth))); }
function sketchHeight() { const el = sketchContainer(); return Math.max(320, Math.floor((el?.getBoundingClientRect().height || window.innerHeight * 0.72))); }

// --- スケッチ A（3次元のランダムウォーク） ---
function sketchA(p) {
  let walkers = [];
  const numWalkers = 20;
  const stepSize = 20;
  const zOffset = 500;

  p.setup = function () {
    p.pixelDensity(1); // Retina対策
    p.frameRate(30);   // 安定化
    p.createCanvas(sketchWidth(), sketchHeight(), p.WEBGL)
     .parent('sketch-root');
    for (let i = 0; i < numWalkers; i++) {
      walkers.push(new Walker(0, 0, 0, p));
    }
  };

  p.draw = function () {
    p.background(255);
    let target = walkers[0];
    let camZ = target.z + zOffset;
    p.camera(0, 0, camZ, 0, 0, target.z, 0, 1, 0);

    for (let walker of walkers) {
      walker.update();
      walker.maybeStep();
      walker.display();
    }
  };

  p.windowResized = function () {
    p.resizeCanvas(sketchWidth(), sketchHeight());
  };

  class Walker {
    constructor(x, y, z, p5ref) {
      this.p = p5ref;
      this.x = x;
      this.y = y;
      this.z = z;
      this.tx = x;
      this.ty = y;
      this.tz = z;

      this.prevX = x;
      this.prevY = y;
      this.prevZ = z;
      this.prevDir = null;
      this.history = [];

      this.stepInterval = 100;
      this.lastStepTime = this.p.millis();
    }

    maybeStep() {
      if (this.p.millis() - this.lastStepTime < this.stepInterval) return;
      this.lastStepTime = this.p.millis();

      this.prevX = this.tx;
      this.prevY = this.ty;
      this.prevZ = this.tz;

      let possibleDirs = [];
      if (this.ty - stepSize >= -this.p.height / 3 && this.prevDir !== 'down') {
        possibleDirs.push('up');
      }
      if (this.ty + stepSize <= this.p.height / 3 && this.prevDir !== 'up') {
        possibleDirs.push('down');
      }
      if (this.tx - stepSize >= -this.p.width / 3 && this.prevDir !== 'right') {
        possibleDirs.push('left');
      }
      if (this.tx + stepSize <= this.p.width / 3 && this.prevDir !== 'left') {
        possibleDirs.push('right');
      }
      if (this.prevDir !== 'front') {
        possibleDirs.push('front');
      }
      if (possibleDirs.length === 0) return;

      let dir = this.p.random(possibleDirs);
      if (dir === 'up') this.ty -= stepSize;
      else if (dir === 'down') this.ty += stepSize;
      else if (dir === 'left') this.tx -= stepSize;
      else if (dir === 'right') this.tx += stepSize;
      else if (dir === 'front') this.tz += stepSize;

      this.prevDir = dir;

      this.history.push({
        x1: this.prevX,
        y1: this.prevY,
        z1: this.prevZ,
        x2: this.tx,
        y2: this.ty,
        z2: this.tz,
        alpha: 255
      });

      // 履歴制限
      if (this.history.length > 100) {
        this.history.shift();
      }
    }

    update() {
      this.x = this.p.lerp(this.x, this.tx, 0.8);
      this.y = this.p.lerp(this.y, this.ty, 0.8);
      this.z = this.p.lerp(this.z, this.tz, 0.8);
    }

    display() {
      this.p.strokeWeight(2);
      this.p.noFill();
      for (let i = this.history.length - 1; i >= 0; i--) {
        let lineData = this.history[i];
        lineData.alpha -= 5;
        if (lineData.alpha <= 0) {
          this.history.splice(i, 1);
          continue;
        }
        this.p.stroke(0, lineData.alpha);
        this.p.beginShape();
        this.p.vertex(lineData.x1, lineData.y1, lineData.z1);
        this.p.vertex(lineData.x2, lineData.y2, lineData.z2);
        this.p.endShape();
      }

      this.p.push();
      this.p.stroke(0);
      this.p.fill(0);
      this.p.translate(this.x, this.y, this.z);
      this.p.sphere(4);
      this.p.pop();
    }
  }
}

sketches.push({ kind: 'p5', name: 'random-walk', sketch: sketchA });

// --- スケッチ B（QRコード） ---
function sketchB(p) {
  let oldQRPattern;
  let newQRPattern;
  let speedMap;

  let messages = [
  "Hello",        // 英語
  "Hola",         // スペイン語
  "Bonjour",      // フランス語
  "Hallo",        // ドイツ語
  "Ciao",         // イタリア語
  "Olá",          // ポルトガル語
  "你好",          // 中国語（簡体字）
  "こんにちは",    // 日本語
  "안녕하세요",     // 韓国語
];
  let qrSize;
  let scale, offsetX, offsetY;
  let currentIndex = -1;           // -1 からスタート
  let isTransitioning = false;
  let transitionFrame = 0;
  const transitionDuration = 20;
  let transitionToBlack = false;

  p.setup = function() {
    p.createCanvas(sketchWidth(), sketchHeight()).parent('sketch-root');
    p.background(255);

    qrSize = 21;
    // 画面幅の半分を QR 全体の幅にする
    scale = p.width / (qrSize * 2);
    const qrTotalWidth = qrSize * scale;
    offsetX = (p.width - qrTotalWidth) / 2;
    offsetY = (p.height - qrTotalWidth) / 2;

    // 初期状態
    oldQRPattern = Array.from({ length: qrSize }, () => Array(qrSize).fill(true));
    newQRPattern = Array.from({ length: qrSize }, () => Array(qrSize).fill(false));

    speedMap = Array.from({ length: qrSize }, () =>
      Array.from({ length: qrSize }, () => p.random(0.2, 3))
    );

    // 3秒ごとにトランジションを開始
    setInterval(() => {
      if (!isTransitioning) {
        triggerTransition();
      }
    }, 3000);
  };

  p.draw = function() {
    if (!isTransitioning) return;
    p.noStroke();

    for (let row = 0; row < qrSize; row++) {
      for (let col = 0; col < qrSize; col++) {
        const oldVal = oldQRPattern[row][col];
        const newVal = newQRPattern[row][col];
        const progress = p.min(
          1,
          transitionFrame / (transitionDuration * speedMap[row][col])
        );

        const xPos = offsetX + col * scale;
        const yPos = offsetY + row * scale;

        if (oldVal === newVal) {
          p.fill(oldVal ? 0 : 255);
          p.rect(xPos, yPos, scale, scale);
        } else {
          // 白→黒
          if (!oldVal && newVal) {
            const sizeNow = scale * progress;
            p.fill(0);
            p.push();
            p.rectMode(p.CENTER);
            p.rect(xPos + scale / 2, yPos + scale / 2, sizeNow, sizeNow);
            p.pop();
          }
          // 黒→白
          else if (oldVal && !newVal) {
            p.fill(0);
            p.rect(xPos, yPos, scale, scale);
            const sizeNow = scale * progress;
            p.fill(255);
            p.push();
            p.rectMode(p.CENTER);
            p.rect(xPos + scale / 2, yPos + scale / 2, sizeNow, sizeNow);
            p.pop();
          }
        }
      }
    }

    transitionFrame++;
    const maxSpeed = Math.max(...speedMap.flat());
    if (transitionFrame > transitionDuration * maxSpeed) {
      if (transitionToBlack) {
        p.background(0);
      } else {
        drawQR(newQRPattern);
      }
      // ここで currentIndex をリセットして「最初の文字列へ戻る」ように変更
      if (currentIndex === messages.length - 1) {
        currentIndex = -1;      // 次回の triggerTransition で 0 になる
      }
      isTransitioning = false;
    }
  };

  p.windowResized = function() {
    p.resizeCanvas(sketchWidth(), sketchHeight());
    scale = p.width / (qrSize * 2);
    const qrTotalWidth = qrSize * scale;
    offsetX = (p.width - qrTotalWidth) / 2;
    offsetY = (p.height - qrTotalWidth) / 2;
  };

  function getQRPattern(inputText) {
    const qr = qrcode(0, 'L');
    const utf8Text = utf8Encode(inputText);
    qr.addData(utf8Text, 'Byte');
    qr.make();
    const size = qr.getModuleCount();

    const pattern = [];
    for (let r = 0; r < size; r++) {
      pattern[r] = [];
      for (let c = 0; c < size; c++) {
        pattern[r][c] = qr.isDark(r, c);
      }
    }
    return pattern;
  }

  function drawQR(pattern) {
    for (let row = 0; row < qrSize; row++) {
      for (let col = 0; col < qrSize; col++) {
        const xPos = offsetX + col * scale;
        const yPos = offsetY + row * scale;
        p.fill(pattern[row][col] ? 0 : 255);
        p.rect(xPos, yPos, scale, scale);
      }
    }
  }

  function triggerTransition() {
    if (currentIndex === messages.length - 1) {
      // 最後のメッセージが済んだら「全て黒→最初の文字列」に遷移
      oldQRPattern = newQRPattern;
      newQRPattern = Array.from({ length: qrSize }, () => Array(qrSize).fill(true));
      transitionToBlack = true;
    } else {
      currentIndex++;
      oldQRPattern = newQRPattern;
      newQRPattern =
        currentIndex >= 0
          ? getQRPattern(messages[currentIndex])
          : Array.from({ length: qrSize }, () => Array(qrSize).fill(false));
      transitionToBlack = false;
    }
    transitionFrame = 0;
    isTransitioning = true;
  }

  function utf8Encode(string) {
    return unescape(encodeURIComponent(string));
  }
}
sketches.push({ kind: 'p5', name: 'qr', sketch: sketchB });


/* --- スケッチ E: カラフルなボールのランダムウォーク --- */
function sketchF(p) {
  let blocks = [];
  let ball1, ball2;
  let col1, col2;
  let blockSize;
  let cols, rows;

  p.setup = function () {
    p.createCanvas(sketchWidth(), sketchHeight()).parent('sketch-root');
    col1 = p.color(135, 206, 250); // 青
    col2 = p.color(50, 50, 50);    // 黒
    blockSize = Math.floor(p.width / 25);
    cols = Math.ceil(p.width / blockSize);
    rows = Math.ceil(p.height / blockSize);

    ball1 = new Ball(blockSize * 5, p.height / 2, blockSize, col2, p);
    ball2 = new Ball(blockSize * 20, p.height / 2, blockSize, col1, p);
    setBlock();
  };

  p.draw = function () {
    p.background(0);
    blockDisplay();
    ballDisplay();
  };

  function setBlock() {
    for (let i = 0; i < cols; i++) {
      blocks[i] = [];
      for (let j = 0; j < rows; j++) {
        let x = i * blockSize;
        let y = j * blockSize;
        let mode = x < p.width / 2 ? 0 : 1;
        blocks[i][j] = new Block(x, y, blockSize, mode, p);
      }
    }
  }

  function blockDisplay() {
    // ① 画面全体のブロックを表示
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        blocks[i][j].display();
      }
    }

    // ② 衝突判定は各ボールの周辺ブロックのみに限定
    [ball1, ball2].forEach((ball) => {
      let cx = Math.floor(ball.x / blockSize);
      let cy = Math.floor(ball.y / blockSize);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          let i = cx + dx;
          let j = cy + dy;
          if (i >= 0 && i < cols && j >= 0 && j < rows) {
            blocks[i][j].checkCollision(ball);
          }
        }
      }
    });
  }

  function ballDisplay() {
    ball1.display();
    ball1.update();
    ball2.display();
    ball2.update();
  }

  class Ball {
    constructor(x, y, size, col, p5ref) {
      this.p = p5ref;
      this.x = x;
      this.y = y;
      this.size = size;
      this.col = col;
      this.xspeed = p.random(8, 12);
      this.yspeed = p.random(8, 12);
    }

    display() {
      this.p.noStroke();
      this.p.fill(this.col);
      this.p.ellipse(this.x, this.y, this.size, this.size);
    }

    update() {
      this.x += this.xspeed;
      this.y += this.yspeed;

      // 微小ランダム性追加
      this.xspeed += this.p.random(-0.1, 0.1);
      this.yspeed += this.p.random(-0.1, 0.1);

      // 速度制限
      let maxSpeed = 15;
      let minSpeed = 5;
      this.xspeed = this.p.constrain(this.xspeed, -maxSpeed, maxSpeed);
      this.yspeed = this.p.constrain(this.yspeed, -maxSpeed, maxSpeed);
      if (Math.abs(this.xspeed) < minSpeed) this.xspeed = this.xspeed > 0 ? minSpeed : -minSpeed;
      if (Math.abs(this.yspeed) < minSpeed) this.yspeed = this.yspeed > 0 ? minSpeed : -minSpeed;

      // 画面端でバウンド
      if (this.x < this.size / 2 || this.x > p.width - this.size / 2) this.xspeed *= -1;
      if (this.y < this.size / 2 || this.y > p.height - this.size / 2) this.yspeed *= -1;
    }
  }

  class Block {
    constructor(x, y, size, colorMode, p5ref) {
      this.p = p5ref;
      this.x = x;
      this.y = y;
      this.size = size;
      this.colorMode = colorMode; // 0: col1, 1: col2
    }

    display() {
      this.p.noStroke();
      this.p.fill(this.colorMode === 0 ? col1 : col2);
      this.p.rect(this.x, this.y, this.size, this.size);
    }

    checkCollision(ball) {
      let ballMode = ball.col.toString() === col1.toString() ? 0 : 1;
      if (ballMode !== this.colorMode) return;

      let bx = ball.x;
      let by = ball.y;
      let r = ball.size / 2;

      if (
        bx + r > this.x &&
        bx - r < this.x + this.size &&
        by + r > this.y &&
        by - r < this.y + this.size
      ) {
        // 衝突方向の推定と反転
        if (bx > this.x && bx < this.x + this.size) {
          ball.yspeed *= -1;
        } else {
          ball.xspeed *= -1;
        }
        this.colorMode = 1 - this.colorMode; // 色を切り替え
      }
    }
  }
}


sketches.push({ kind: 'p5', name: 'bouncing-balls', sketch: sketchF });

function sketchP5Editor(container) {
  const frame = document.createElement('iframe');
  frame.className = 'sketch-frame';
  frame.title = 'p5 Editor sketch';
  frame.src = 'p5-editor/index.html';
  frame.loading = 'eager';
  container.append(frame);
}

sketches.push({ kind: 'iframe', name: 'p5-editor', sketch: sketchP5Editor });

function sketchP5EditorEyes(container) {
  const frame = document.createElement('iframe');
  frame.className = 'sketch-frame';
  frame.title = 'p5 Editor eye tiles sketch';
  frame.src = 'p5-editor-eyes/index.html';
  frame.loading = 'eager';
  container.append(frame);
}

sketches.push({ kind: 'iframe', name: 'p5-editor-eyes', sketch: sketchP5EditorEyes });




window.addEventListener('load', () => {
  const container = sketchContainer();
  if (!container) return;
  container.innerHTML = '';
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('sketch');
  const selected =
    sketches.find((sketch) => sketch.name === requested) ||
    sketches[Math.floor(Math.random() * sketches.length)];

  if (selected.kind === 'iframe') {
    selected.sketch(container);
    return;
  }

  if (!window.p5) return;
  new window.p5(selected.sketch);
});
