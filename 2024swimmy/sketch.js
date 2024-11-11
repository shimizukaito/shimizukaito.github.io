let cam;
let slitScanVertical, slitScanHorizontal, slitScanGrid;
let currentMode = 1; // 現在の表示モード (1: 縦スリット, 2: 横スリット, 3: マス目)
let modeChangeInterval = 1800; // 120フレームごとにモードを切り替え (2秒間隔)

function setup() {
  frameRate(30);
  createCanvas(windowWidth, windowHeight);
  cam = createCapture(VIDEO);
  cam.size(width, height);
  cam.hide(); // デフォルトのビデオ要素を非表示にする

  // 3種類のスリットスキャンインスタンスを作成
  slitScanVertical = new SlitScanVertical();
  slitScanHorizontal = new SlitScanHorizontal();
  slitScanGrid = new SlitScanGrid();
}

function draw() {
  background(0);

  // 現在のモードに応じて異なるスリットスキャン表示
  if (currentMode === 1) {
    slitScanVertical.display();
  } else if (currentMode === 2) {
    slitScanHorizontal.display();
  } else if (currentMode === 3) {
    slitScanGrid.display();
  }

  // 一定のフレーム数ごとにモードを切り替える
  if (frameCount % modeChangeInterval === 0) {
    currentMode = (currentMode % 3) + 1; // 1 -> 2 -> 3 -> 1 と繰り返し
  }
}

// ウィンドウサイズ変更時にキャンバスをリサイズ
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cam.size(width, height);
  slitScanVertical.resize();
  slitScanHorizontal.resize();
  slitScanGrid.resize();
}

// 縦スリットスキャンクラス
class SlitScanVertical {
  constructor() {
    this.h = 8;
    this.history = [];
    this.historyIndex = 0;
    this.offset = 0;
    this.initializeHistory();
  }

  initializeHistory() {
    this.history = [];
    for (let i = 0; i < height / this.h; i++) {
      this.history.push(createGraphics(width, height));
    }
  }

  resize() {
    this.initializeHistory();
  }

  display() {
    for (let i = 0; i < this.history.length; i++) {
      let y = i * this.h;
      let currentIndex = (i + this.offset) % this.history.length;
      copy(this.history[currentIndex], 0, y, width, this.h, 0, y, width, this.h);
    }
    this.offset++;
    this.history[this.historyIndex].image(cam, 0, 0, width, height);
    this.historyIndex = (this.historyIndex + 1) % this.history.length;
  }
}

// 横スリットスキャンクラス
class SlitScanHorizontal {
  constructor() {
    this.w = 8;
    this.history = [];
    this.historyIndex = 0;
    this.offset = 0;
    this.initializeHistory();
  }

  initializeHistory() {
    this.history = [];
    for (let i = 0; i < width / this.w; i++) {
      this.history.push(createGraphics(width, height));
    }
  }

  resize() {
    this.initializeHistory();
  }

  display() {
    for (let i = 0; i < this.history.length; i++) {
      let x = i * this.w;
      let currentIndex = (i + this.offset) % this.history.length;
      copy(this.history[currentIndex], x, 0, this.w, height, x, 0, this.w, height);
    }
    this.offset++;
    this.history[this.historyIndex].image(cam, 0, 0, width, height);
    this.historyIndex = (this.historyIndex + 1) % this.history.length;
  }
}

// マス目スリットスキャンクラス
class SlitScanGrid {
  constructor() {
    this.gridSize = 10;
    this.history = [];
    this.historyIndex = 0;
    this.offset = 0;
    this.initializeHistory();
  }

  initializeHistory() {
    this.cellWidth = width / this.gridSize;
    this.cellHeight = height / this.gridSize;
    this.history = [];
    for (let i = 0; i < this.gridSize * this.gridSize; i++) {
      this.history.push(createGraphics(width, height));
    }
  }

  resize() {
    this.initializeHistory();
  }

  display() {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        let x = col * this.cellWidth;
        let y = row * this.cellHeight;
        let currentIndex = (row * this.gridSize + col + this.offset) % this.history.length;
        copy(this.history[currentIndex], x, y, this.cellWidth, this.cellHeight, x, y, this.cellWidth, this.cellHeight);
      }
    }
    this.offset++;
    this.history[this.historyIndex].image(cam, 0, 0, width, height);
    this.historyIndex = (this.historyIndex + 1) % this.history.length;
  }
}
