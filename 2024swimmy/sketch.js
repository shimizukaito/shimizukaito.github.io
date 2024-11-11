let cam;
let slitScans;
let currentSlitScan;
let modeChangeInterval = 1800;

function setup() {
  frameRate(30);
  createCanvas(windowWidth, windowHeight);
  cam = createCapture(VIDEO);
  cam.size(width, height);
  cam.hide(); // デフォルトのビデオ要素を非表示にする

  // スリットスキャンのインスタンスを作成
  slitScans = [
    new SlitScan(true),         // 縦スリットスキャン
    new SlitScan(false),        // 横スリットスキャン
    new SlitScanGrid(10)        // グリッドスキャン
  ];
  currentSlitScan = slitScans[0];
}

function draw() {
  background(0);
  currentSlitScan.display();

  // 一定のフレーム数ごとにモードを切り替える
  if (frameCount % modeChangeInterval === 0) {
    let nextIndex = (slitScans.indexOf(currentSlitScan) + 1) % slitScans.length;
    currentSlitScan = slitScans[nextIndex];
  }
}

// ウィンドウサイズ変更時にキャンバスをリサイズ
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cam.size(width, height);
  slitScans.forEach(scan => scan.resize());
}

// スリットスキャンの基底クラス
class SlitScanBase {
  constructor() {
    this.history = [];
    this.historyIndex = 0;
    this.offset = 0;
  }

  initializeHistory() {
    this.history = [];
    for (let i = 0; i < this.historySize; i++) {
      this.history.push(createGraphics(width, height));
    }
  }

  resize() {
    this.initializeHistory();
  }

  updateHistory() {
    this.history[this.historyIndex].image(cam, 0, 0, width, height);
    this.historyIndex = (this.historyIndex + 1) % this.history.length;
    this.offset++;
  }
}

// 縦または横スリットスキャン用のクラス
class SlitScan extends SlitScanBase {
  constructor(isVertical) {
    super();
    this.isVertical = isVertical;
    this.historySize = this.isVertical ? height / 8 : width / 8;
    this.initializeHistory();
  }

  display() {
    for (let i = 0; i < this.history.length; i++) {
      let pos = i * 8;
      let currentIndex = (i + this.offset) % this.history.length;
      if (this.isVertical) {
        copy(this.history[currentIndex], 0, pos, width, 8, 0, pos, width, 8);
      } else {
        copy(this.history[currentIndex], pos, 0, 8, height, pos, 0, 8, height);
      }
    }
    this.updateHistory();
  }
}

// マス目スリットスキャンクラス
class SlitScanGrid extends SlitScanBase {
  constructor(gridSize) {
    super();
    this.gridSize = gridSize;
    this.historySize = this.gridSize * this.gridSize;
    this.initializeHistory();
  }

  display() {
    let cellWidth = width / this.gridSize;
    let cellHeight = height / this.gridSize;
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        let x = col * cellWidth;
        let y = row * cellHeight;
        let currentIndex = (row * this.gridSize + col + this.offset) % this.history.length;
        copy(this.history[currentIndex], x, y, cellWidth, cellHeight, x, y, cellWidth, cellHeight);
      }
    }
    this.updateHistory();
  }
}
