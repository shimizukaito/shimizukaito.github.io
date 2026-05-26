// ==========================================
// Scene: Lines only (black bg, white lines)
// - points move inside each grid cell (irregular spiral)
// - draw line only when two neighbor points are close enough
// ==========================================

class SceneLinesOnlyGrid extends SceneBase {
  constructor() {
    super();

    this.cells = [];
    this.CELL_MIN_PX = 120;

    this.cols = 1;
    this.rows = 1;

    this.cellSize = 0;
    this.gridW = 0;
    this.gridH = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    // drawing
    this.lineWeight = 5;
    this.thresholdMul = 1.3;
  }

  enter() {
    this.initGrid();
  }

  onResize() {
    this.initGrid();
  }

  draw() {
    push();

    background(0);

    // 1) update
    for (const c of this.cells) c.update();

    // 2) links only
    this.drawLinks();

    pop();
  }

  initGrid() {
    this.cells = [];

    this.cols = max(1, floor(width / this.CELL_MIN_PX));
    this.rows = max(1, floor(height / this.CELL_MIN_PX));

    this.cellSize = min(width / this.cols, height / this.rows);

    this.gridW = this.cellSize * this.cols;
    this.gridH = this.cellSize * this.rows;

    this.offsetX = (width - this.gridW) / 2;
    this.offsetY = (height - this.gridH) / 2;

    for (let gy = 0; gy < this.rows; gy++) {
      for (let gx = 0; gx < this.cols; gx++) {
        const cx = this.offsetX + gx * this.cellSize + this.cellSize / 2;
        const cy = this.offsetY + gy * this.cellSize + this.cellSize / 2;
        this.cells.push(new SpiralCellLines(cx, cy, this.cellSize));
      }
    }
  }

  idx(x, y) {
    return y * this.cols + x;
  }

  drawLinks() {
    const threshold = this.cellSize * this.thresholdMul;
    const thr2 = threshold * threshold;

    stroke(255);
    strokeWeight(this.lineWeight);

    // 8近傍のうち、二重描画を避けるセット
    const neighbors = [
      [1, 0],   // right
      [0, 1],   // bottom
      [1, 1],   // bottom-right
      [-1, 1],  // bottom-left
    ];

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const a = this.cells[this.idx(x, y)];
        if (!a) continue;

        for (const [dx, dy] of neighbors) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;

          const b = this.cells[this.idx(nx, ny)];
          if (!b) continue;

          const dxp = a.px - b.px;
          const dyp = a.py - b.py;
          const d2 = dxp * dxp + dyp * dyp;

          if (d2 < thr2) {
            const d = sqrt(d2);
            const alpha = map(d, 0, threshold, 255, 40);
            stroke(255, alpha);
            line(a.px, a.py, b.px, b.py);
          }
        }
      }
    }
  }
}

// ==========================================
// Spiral Cell (computes point position only)
// ==========================================
class SpiralCellLines {
  constructor(cx, cy, squareSize) {
    this.cx = cx;
    this.cy = cy;
    this.squareSize = squareSize;

    this.theta = random(TWO_PI);
    this.baseThetaSpeed = random(0.03, 0.06);

    this.rotDir = random([1, -1]);

    this.t = random();
    this.dir = random([1, -1]);
    this.nt = random(1000);

    this.px = cx;
    this.py = cy;

    this.rMin = 0;
    this.rMax = 0;
    this.rMinTarget = 0;
    this.rMaxTarget = 0;

    this.pickNewTargets(true);
  }

  pickNewTargets(initial = false) {
    const rLimit = this.squareSize / 2;
    const R_HARD_MIN = max(2, rLimit * 0.05);

    this.rMinTarget = random(R_HARD_MIN, rLimit * 0.8);
    this.rMaxTarget = random(this.rMinTarget + 5, rLimit);

    if (initial) {
      this.rMin = this.rMinTarget;
      this.rMax = this.rMaxTarget;
    }
  }

  update() {
    const rLimit = this.squareSize / 2;
    const R_HARD_MIN = max(2, rLimit * 0.05);

    this.rMin = lerp(this.rMin, this.rMinTarget, 0.05);
    this.rMax = lerp(this.rMax, this.rMaxTarget, 0.05);

    this.rMin = constrain(this.rMin, R_HARD_MIN, rLimit - 1);
    this.rMax = constrain(this.rMax, this.rMin + 1, rLimit);

    // radius ping-pong
    this.t += this.dir * 0.012;
    if (this.t >= 1) {
      this.t = 1;
      this.dir = -1;
      this.pickNewTargets();
    } else if (this.t <= 0) {
      this.t = 0;
      this.dir = 1;
      this.pickNewTargets();
    }

    const tt = easeInOutCubic(this.t);
    const r = lerp(this.rMin, this.rMax, tt);

    // rotation with wobble + direction
    const wobble = map(noise(this.nt), 0, 1, -0.03, 0.03);
    this.theta += (this.baseThetaSpeed + wobble) * this.rotDir;

    const angJitter = map(noise(this.nt + 1000), 0, 1, -0.3, 0.3);
    this.nt += 0.01;

    this.px = this.cx + r * cos(this.theta + angJitter);
    this.py = this.cy + r * sin(this.theta + angJitter);
  }
}
