// ==========================================
// Scene: Random-walk particles (center start) + oil-paint-ish trails
// - Particle count decreases by PAINTED AREA (coverage), not time.
// - Finally: exactly 1 particle per palette color remains.
// ==========================================

class SceneOilWalkers extends SceneBase {
  constructor() {
    super();

    // params
    this.NUM = 300;
    this.STEP = 1.5;
    this.JITTER = 0.35;
    this.R = 15;
    this.FADE = 1;

    this.ps = [];
    this.palette = [];

    // coverage grid
    this.CELL = 8;
    this.gw = 0;
    this.gh = 0;
    this.painted = null;  // Uint8Array
    this.paintedCount = 0;
  }

  enter() {
    pixelDensity(1);
    this.resetAll(true);
  }

  onResize() {
    // 簡単運用：サイズ変わったらカバー状況だけ作り直し、粒子は中にクランプ
    this.initCoverageGrid();
    for (const p of this.ps) p.clampInside();
  }

  draw() {
    // 背景を毎フレーム消さない（塗り重ね）
    // 必要なら薄い白でフェードもできる（今はコメントアウト）
    // noStroke();
    // fill(255, this.FADE);
    // rect(0, 0, width, height);

    for (const p of this.ps) {
      p.step();
      p.drawAndMarkCoverage();
    }

    this.cullParticlesByCoverage();
  }

  keyPressed(k, kc) {
    if (k === "r" || k === "R") {
      this.resetAll(false);
    }
  }

  // ---------------------------
  // Reset / init
  // ---------------------------
  resetAll(firstTime = false) {
    if (firstTime) {
      // palette
      this.palette = [
        color(25, 35, 60),
        color(215, 78, 60),
        color(230, 186, 70),
        color(55, 120, 90),
        color(120, 70, 140),
        color(235, 230, 215),
        color(60, 55, 50),
        color(40, 90, 160),
      ];
    }

    background(255);
    this.initCoverageGrid();

    const cx = width / 2;
    const cy = height / 2;

    this.ps = [];
    for (let i = 0; i < this.NUM; i++) {
      const colorIndex = i % this.palette.length;
      this.ps.push(new OilWalker(cx, cy, colorIndex, this));
    }
  }

  initCoverageGrid() {
    this.gw = ceil(width / this.CELL);
    this.gh = ceil(height / this.CELL);
    this.painted = new Uint8Array(this.gw * this.gh);
    this.paintedCount = 0;
  }

  coverage() {
    const total = this.gw * this.gh;
    return total === 0 ? 0 : this.paintedCount / total;
  }

  targetCountFromCoverage() {
    const c = this.coverage();
    const minCount = this.palette.length;
    const t = floor(lerp(this.NUM, minCount, c));
    return max(minCount, t);
  }

  cullParticlesByCoverage() {
    const target = this.targetCountFromCoverage();
    if (this.ps.length <= target) return;

    const buckets = Array.from({ length: this.palette.length }, () => []);
    for (let i = 0; i < this.ps.length; i++) buckets[this.ps[i].colorIndex].push(i);

    while (this.ps.length > target) {
      let bestColor = -1;
      let bestSize = 1; // 1以下は削れない
      for (let ci = 0; ci < buckets.length; ci++) {
        const size = buckets[ci].length;
        if (size > bestSize) {
          bestSize = size;
          bestColor = ci;
        }
      }
      if (bestColor === -1) break;

      const removeIndexInPs = buckets[bestColor].pop();
      const last = this.ps.length - 1;

      if (removeIndexInPs !== last) {
        const moved = this.ps[last];
        this.ps[removeIndexInPs] = moved;

        const b = buckets[moved.colorIndex];
        const k = b.indexOf(last);
        if (k !== -1) b[k] = removeIndexInPs;
      }
      this.ps.pop();
    }
  }

  // --- coverage marking ---
  markPaintedAt(x, y) {
    const gx0 = floor(x / this.CELL);
    const gy0 = floor(y / this.CELL);
    if (gx0 < 0 || gx0 >= this.gw || gy0 < 0 || gy0 >= this.gh) return;

    const id = gy0 * this.gw + gx0;
    if (this.painted[id] === 0) {
      this.painted[id] = 1;
      this.paintedCount++;
    }
  }
}

// ==========================================
// Walker
// ==========================================
class OilWalker {
  constructor(x, y, colorIndex, scene) {
    this.sc = scene;

    this.pos = createVector(x, y);
    const a = random(TWO_PI);
    this.vel = p5.Vector.fromAngle(a).mult(this.sc.STEP);

    this.colorIndex = colorIndex;
    this.base = this.sc.palette[colorIndex];

    this.tint = random(-18, 18);
    this.hj = random(-6, 6);
  }

  step() {
    this.vel.rotate(random(-this.sc.JITTER, this.sc.JITTER));
    this.vel.setMag(this.sc.STEP);
    this.pos.add(this.vel);

    const R = this.sc.R;

    if (this.pos.x < R) { this.pos.x = R; this.vel.x *= -1; }
    else if (this.pos.x > width - R) { this.pos.x = width - R; this.vel.x *= -1; }

    if (this.pos.y < R) { this.pos.y = R; this.vel.y *= -1; }
    else if (this.pos.y > height - R) { this.pos.y = height - R; this.vel.y *= -1; }
  }

  clampInside() {
    const R = this.sc.R;
    this.pos.x = constrain(this.pos.x, R, width - R);
    this.pos.y = constrain(this.pos.y, R, height - R);
  }

  drawAndMarkCoverage() {
    push();
    colorMode(HSB, 360, 100, 100, 255);

    const c = this.base;
    let h = hue(c);
    let s = saturation(c);
    let b = brightness(c);

    h = (h + this.hj + random(-2, 2) + 360) % 360;
    s = constrain(s + random(-6, 6), 10, 100);
    b = constrain(b + this.tint + random(-8, 8), 10, 100);

    const a = 40;
    noStroke();
    fill(h, s, b, a);

    const n = 3;
    const R = this.sc.R;

    for (let i = 0; i < n; i++) {
      const ox = random(-R * 0.25, R * 0.25);
      const oy = random(-R * 0.25, R * 0.25);
      const rr = R * random(0.8, 1.15);

      const sx = rr * random(0.9, 1.25);
      const sy = rr * random(0.75, 1.15);

      const x = this.pos.x + ox;
      const y = this.pos.y + oy;

      ellipse(x, y, sx * 2, sy * 2);

      // coverage mark
      this.sc.markPaintedAt(x, y);
    }

    pop();
  }
}
