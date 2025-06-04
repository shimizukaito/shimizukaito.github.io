// js/sketchLoader.js

// 1. 複数のスケッチ関数を定義する（インスタンスモード）
//    必ず function(p) { … } という形で、p5 インスタンスを引数に受け取る

const sketches = [];

// --- スケッチ A（3次元のランダムウォーク） ---
function sketchA(p) {
  let walkers = [];
  const numWalkers = 30;
  const stepSize = 20;
  const zOffset = 500;

  p.setup = function() {
    // 修正済み：windowWidth のスペルミスを直し、幅をウィンドウ幅の1/3、高さを1/2に
    p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL)
     .parent('hero-canvas-container');
    p.background(255);
    for (let i = 0; i < numWalkers; i++) {
      walkers.push(new Walker(0, 0, 0, p));
    }
  };

  p.draw = function() {
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

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth/3, p.windowHeight/2);
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
    }

    update() {
      this.x = this.p.lerp(this.x, this.tx, 0.5);
      this.y = this.p.lerp(this.y, this.ty, 0.5);
      this.z = this.p.lerp(this.z, this.tz, 0.5);
    }

    display() {
      this.p.strokeWeight(2);
      this.p.noFill();
      for (let i = this.history.length - 1; i >= 0; i--) {
        let lineData = this.history[i];
        lineData.alpha -= 1;
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
sketches.push(sketchA);

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
    p.createCanvas(p.windowWidth, p.windowHeight).parent('hero-canvas-container');
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
    p.resizeCanvas(p.windowWidth, p.windowHeight);
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
sketches.push(sketchB);

// --- スケッチ C ---
// 必要に応じてさらに sketches.push(sketchC) …
function sketchC(p) {
  p.setup = function() {
    p.createCanvas(p.windowWidth, p.windowHeight).parent('hero-canvas-container');
    p.noStroke();
  };
  p.draw = function() {
    p.clear(); 
    // 100 個のランダムな線を毎フレーム描いてみる例
    for (let i = 0; i < 100; i++) {
      p.stroke(p.random(100, 255), p.random(100, 255), p.random(100, 255), 100);
      p.line(p.random(p.width), p.random(p.height), p.random(p.width), p.random(p.height));
    }
  };
  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
}
sketches.push(sketchC);

/* --- スケッチ D: パズルタイル＆接続ライン --- */
function sketchD(p) {
  let tiles = [];
  let cols = 10;
  let rows = 10;
  let w, h;
  let board = [];
  let isAnimating = false;
  let stepTime = 10;
  let connections = [];

  p.setup = function() {
    p.createCanvas(p.windowWidth, p.windowHeight).parent('hero-canvas-container');
    w = p.width / cols;
    h = p.height / rows;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let x = i * w;
        let y = j * h;
        let index = i + j * cols;
        board.push(index);
        let tile = new PuzzleTile(index, x, y, p);
        tiles.push(tile);
      }
    }

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        let index = i + j * cols;
        if (i < cols - 1) {
          let rightIndex = (i + 1) + j * cols;
          connections.push([index, rightIndex]);
        }
        if (j < rows - 1) {
          let downIndex = i + (j + 1) * cols;
          connections.push([index, downIndex]);
        }
      }
    }

    tiles.pop();
    board[0] = -1;
    board[cols / 2 - 1] = -1;
    board[board.length / 2] = -1;
    board[board.length / 2 + cols - 1] = -1;
    board[cols - 1] = -1;
    board[board.length / 2 + cols / 2 - 1] = -1;
    board[board.length - cols] = -1;
    board[board.length - cols / 2 - 1] = -1;
    board[board.length - 1] = -1;
  };

  p.draw = function() {
    p.background(0);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let index = i + j * cols;
        let tileIndex = board[index];
        if (tileIndex > -1) {
          let tile = tiles[tileIndex];
          tile.update();
          tile.show();
        }
      }
    }

    drawSmoothCurve();

    if (!isAnimating) {
      isAnimating = true;
      setTimeout(() => {
        randomNeighborMove();
        isAnimating = false;
      }, stepTime);
    }
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    w = p.width / cols;
    h = p.height / rows;
  };

  function drawSmoothCurve() {
    p.stroke(255, 0, 0);
    p.strokeWeight(1);
    p.noFill();

    for (let pair of connections) {
      let [idxA, idxB] = pair;
      let posA = getCurrentTileCenterPos(idxA);
      let posB = getCurrentTileCenterPos(idxB);

      if (posA && posB) {
        p.line(posA.x, posA.y, posB.x, posB.y);
      }
    }
  }

  function getCurrentTileCenterPos(initialIndex) {
    let posInBoard = board.indexOf(initialIndex);
    if (posInBoard == -1) return null;

    let colI = posInBoard % cols;
    let rowI = Math.floor(posInBoard / cols);
    let tileIndex = board[posInBoard];
    if (tileIndex > -1) {
      let tile = tiles[tileIndex];
      return {
        x: tile.currentX + w / 2,
        y: tile.currentY + h / 2
      };
    }
    return null;
  }

  class PuzzleTile {
    constructor(index, x, y, p5ref) {
      this.p = p5ref;
      this.index = index;
      this.currentX = x;
      this.currentY = y;
      this.targetX = x;
      this.targetY = y;
    }

    setTarget(x, y) {
      this.targetX = x;
      this.targetY = y;
    }

    update() {
      this.currentX = this.p.lerp(this.currentX, this.targetX, 0.1);
      this.currentY = this.p.lerp(this.currentY, this.targetY, 0.1);
    }

    show() {
      // 中心点のみ表示
      let centerX = this.currentX + w / 2;
      let centerY = this.currentY + h / 2;
      this.p.fill(255);
      this.p.noStroke();
      this.p.ellipse(centerX, centerY, 5, 5);
    }
  }

  function randomNeighborMove() {
    let blankIndices = findBlanks();
    let moves = [];

    for (let blankIndex of blankIndices) {
      let blankCol = blankIndex % cols;
      let blankRow = Math.floor(blankIndex / cols);

      let neighbors = [];
      if (blankCol > 0) neighbors.push([blankCol - 1, blankRow]);
      if (blankCol < cols - 1) neighbors.push([blankCol + 1, blankRow]);
      if (blankRow > 0) neighbors.push([blankCol, blankRow - 1]);
      if (blankRow < rows - 1) neighbors.push([blankCol, blankRow + 1]);

      if (neighbors.length > 0) {
        moves.push(p.random(neighbors));
      }
    }

    if (moves.length > 0) {
      let [colI, rowI] = p.random(moves);
      move(colI, rowI, board);
    }
  }

  function move(i, j, arr) {
    let blankIndices = findBlanks();

    for (let blank of blankIndices) {
      let blankCol = blank % cols;
      let blankRow = Math.floor(blank / cols);

      if (isNeighbor(i, j, blankCol, blankRow)) {
        let tileIndex = board[i + j * cols];
        let blankX = blankCol * w;
        let blankY = blankRow * h;

        if (tileIndex > -1) {
          tiles[tileIndex].setTarget(blankX, blankY);
        }
        swap(blank, i + j * cols, arr);
        break;
      }
    }
  }

  function isNeighbor(i, j, x, y) {
    return (Math.abs(i - x) + Math.abs(j - y) === 1);
  }

  function findBlanks() {
    let blanks = [];
    for (let i = 0; i < board.length; i++) {
      if (board[i] == -1) blanks.push(i);
    }
    return blanks;
  }

  function swap(i, j, arr) {
    let temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
}
sketches.push(sketchD);

/* --- スケッチ E: カラフルなボールのランダムウォーク --- */
function sketchE(p) {
  let balls = [];

  p.setup = function() {
    p.createCanvas(p.windowWidth, p.windowHeight).parent('hero-canvas-container');
    let numBalls = p.windowWidth / 10;
    for (let i = 0; i < numBalls; i++) {
      balls.push(new Ball(p.width / 2, p.height / 2, 20, p));
    }
  };

  p.draw = function() {
    p.fill(0, 0, 0, 10);
    p.rect(0, 0, p.width, p.height);
    for (let ball of balls) {
      ball.update();
      ball.display();
    }
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  class Ball {
    constructor(x, y, rad, p5ref) {
      this.p = p5ref;
      this.x = x;
      this.y = y;
      this.rad = rad;
      this.step = 10;
      this.col = this.p.color(
        this.p.random(255),
        this.p.random(255),
        this.p.random(255)
      );
      this.chooseNewDirection();
    }

    update() {
      if (this.step > 0) {
        this.step -= 1;
      } else {
        this.step = 30;
        this.chooseNewDirection();
      }
      this.x += this.speedx;
      this.y += this.speedy;
      if (this.x < 0 || this.x > this.p.width) {
        this.speedx *= -1;
      }
      if (this.y < 0 || this.y > this.p.height) {
        this.speedy *= -1;
      }
    }

    display() {
      this.p.fill(this.col);
      this.p.noStroke();
      this.p.ellipse(this.x, this.y, this.rad, this.rad);
    }

    chooseNewDirection() {
      let direction = this.p.int(this.p.random(0, 4));
      if (direction === 0) {
        this.speedy = (-1) * (this.p.height / 250);
        this.speedx = 0;
      } else if (direction === 1) {
        this.speedx = this.p.width / 250;
        this.speedy = 0;
      } else if (direction === 2) {
        this.speedy = this.p.height / 250;
        this.speedx = 0;
      } else if (direction === 3) {
        this.speedx = (-1) * (this.p.width / 250);
        this.speedy = 0;
      }
    }
  }
}
sketches.push(sketchE);

/* --- スケッチ F: ブロックとボールの拡張プログラム --- */
function sketchF(p) {
  let blocks;
  let ball1;
  let ball2;
  let col1, col2;
  let blockSize;

  p.setup = function() {
    p.createCanvas(p.windowWidth, p.windowHeight / 1.3).parent('hero-canvas-container');
    col1 = p.color(135, 206, 250);
    col2 = p.color(50, 50, 50);

    blockSize = Math.floor(p.width / 25);
    ball1 = new Ball(blockSize * 5, p.height / 2, blockSize, col2, p);
    ball2 = new Ball(blockSize * 20, p.height / 2, blockSize, col1, p);
    setBlock();
  };

  p.draw = function() {
    p.background(0);
    blockDisplay();
    ballDisplay();
  };

  function ballDisplay() {
    ball1.display();
    ball1.update();
    ball2.display();
    ball2.update();
  }

  function blockDisplay() {
    for (let i = 0; i < blocks.length; i++) {
      let myBlock = blocks[i];
      myBlock.display();
      myBlock.checkCollision(ball1);
      myBlock.checkCollision(ball2);
    }
  }

  function setBlock() {
    blocks = [];
    for (let i = 0; i < p.width; i += blockSize) {
      for (let j = 0; j < p.height; j += blockSize) {
        let mode = i < p.width / 2 ? 0 : 1;
        let myBlock = new Block(i, j, blockSize, mode, p);
        blocks.push(myBlock);
      }
    }
  }

  class Ball {
    constructor(x, y, size, col, p5ref) {
      this.p = p5ref;
      this.x = x;
      this.y = y;
      this.size = size;
      this.col = col;
      this.xspeed = p.random(10, 15);
      this.yspeed = p.random(10, 15);
    }

    display() {
      this.p.push();
      this.p.noStroke();
      this.p.fill(this.col);
      this.p.translate(this.x, this.y);
      this.p.ellipse(0, 0, this.size, this.size);
      this.p.pop();
    }

    update() {
      this.x += this.xspeed;
      this.y += this.yspeed;
      if (this.x > p.width - this.size / 2 || this.x < this.size / 2) {
        this.boundx();
      }
      if (this.y > p.height - this.size / 2 || this.y < this.size / 2) {
        this.boundy();
      }
    }

    boundx() { this.xspeed = -this.xspeed; }
    boundy() { this.yspeed = -this.yspeed; }
    getx() { return this.x; }
    gety() { return this.y; }
    getcol() { return this.col; }
    getsize() { return this.size; }
  }

  class Block {
    constructor(x, y, size, colorMode, p5ref) {
      this.p = p5ref;
      this.x = x;
      this.y = y;
      this.size = size;
      this.colorMode = colorMode;
      this.col = null;
    }

    display() {
      if (this.colorMode === 0) {
        this.col = col1;
        this.p.fill(col1);
      } else {
        this.col = col2;
        this.p.fill(col2);
      }
      this.p.noStroke();
      this.p.rect(this.x, this.y, this.size, this.size);
    }

    checkCollision(ball) {
      if (ball.getcol().toString() === this.col.toString()) {
        if (
          ball.getx() + ball.getsize() / 2 > this.x &&
          ball.getx() - ball.getsize() / 2 < this.x + this.size &&
          ball.gety() + ball.getsize() / 2 > this.y &&
          ball.gety() - ball.getsize() / 2 < this.y + this.size
        ) {
          if (ball.getx() > this.x && ball.getx() < this.x + this.size) {
            ball.boundy();
          } else {
            ball.boundx();
          }
          this.colorMode = 1 - this.colorMode;
        }
      }
    }
  }
}
sketches.push(sketchF);




// 2. ページ読み込み時にランダムで一つを選んで起動
window.addEventListener('DOMContentLoaded', () => {
  // hero-canvas-container を必ずクリアしておく
  const container = document.getElementById('hero-canvas-container');
  container.innerHTML = '';
  // sketches 配列からランダムインデックスを取得
  const idx = Math.floor(Math.random() * sketches.length);
  // p5.js をインスタンスモードで起動
  new p5(sketches[idx]);
});
