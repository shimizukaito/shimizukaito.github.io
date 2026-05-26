// ==============================
// Scene: Square spiral pulse (2D canvas, pseudo-3D projection + Z rotation)
// ==============================

class SceneSquareSpiralPulse extends SceneBase {
  constructor() {
    super();

    // === Adjustable params ===
    this.TURNS = 3;
    this.NUM_POINTS = 1000;
    this.END_RADIUS_RATIO = 0.12;

    // single pulse
    this.SPEED_T_PER_SEC = 0.05;
    this.SIGMA_T = 0.015;
    this.SHARPNESS = 3;
    this.AMP_MIN = 50;
    this.AMP_MAX = 150;

    // auto pulse interval
    this.AUTO_PULSE_MAX_MS = 10000;

    // --- view (pseudo 3D) ---
    this.viewRX = -Math.PI / 6;
    this.viewRY = Math.PI / 1.5;
    this.viewRZ = Math.PI / 4;

    this.zoom = 1.0;
    this.persp = 900;

    this.spiral = []; // {x, z, t}[]
    this.startRadius = 100;
    this.endRadius = 20;

    this.pulses = [];
    this.nextPulseAt = 0;

    // style
    this.strokeCol = "#4CC968";
    this.bg = [6, 125, 133];
  }

  enter() {
    // 2D
    stroke(this.strokeCol);
    noFill();
    strokeWeight(6);
    strokeJoin(ROUND);
    strokeCap(ROUND);

    this.rebuildSpiral();
    this.scheduleNextPulse();
  }

  // called from main on windowResized (optional)
  onResize() {
    this.rebuildSpiral();
  }

  draw() {
    // 1) 状態汚染対策：このScene内だけの描画状態に閉じ込める
    push();

    // 2) 背景
    background(this.bg[0], this.bg[1], this.bg[2]);

    // 3) このSceneで必要なスタイルを毎フレーム強制
    stroke(this.strokeCol);
    noFill();
    strokeWeight(6);
    strokeJoin(ROUND);
    strokeCap(ROUND);

    const now = millis();

    // auto pulse
    if (now >= this.nextPulseAt) {
      this.addPulse();
      this.scheduleNextPulse();
    }

    // remove finished pulses
    this.pulses = this.pulses.filter((p) => {
      const s = ((now - p.startMs) / 1000) * p.speed;
      return s <= 1 + 3 * p.sigma;
    });

    // 4) 万一 spiral が未生成なら生成（保険）
    if (!this.spiral || this.spiral.length !== this.NUM_POINTS) {
      this.rebuildSpiral();
    }

    // 5) 描画
    beginShape();
    for (let i = 0; i < this.NUM_POINTS; i++) {
      const pt = this.spiral[i];
      if (!pt) continue;

      const x = pt.x;
      const z = pt.z;

      // pulse height y
      let y = 0;
      for (const p of this.pulses) {
        const s = ((now - p.startMs) / 1000) * p.speed;
        const d = pt.t - s;
        const envelope = -Math.exp(
          -Math.pow(Math.abs(d) / p.sigma, this.SHARPNESS)
        );
        y += p.amp * envelope;
      }

      const s2 = this.project3D(x, y, z);

      // NaN対策（念のため）
      if (!Number.isFinite(s2.x) || !Number.isFinite(s2.y)) continue;

      vertex(s2.x, s2.y);
    }
    endShape();

    pop();
  }

  // click to add pulse
  mousePressed() {
    this.addPulse();
  }

  // drag to orbit view
  // normal drag: rotateX / rotateY
  // Shift + drag: rotateZ
  mouseDragged() {
    if (keyIsDown(SHIFT)) {
      this.viewRZ += movedX * 0.006;
    } else {
      this.viewRY += movedX * 0.006;
      this.viewRX += movedY * 0.006;
    }
    this.viewRX = constrain(this.viewRX, -Math.PI * 0.49, Math.PI * 0.49);
  }

  // mouse wheel zoom
  mouseWheel(e) {
    this.zoom *= e.delta > 0 ? 0.95 : 1.05;
    this.zoom = constrain(this.zoom, 0.4, 3.0);
    return false;
  }

  // keyboard fine control for Z rotation
  keyPressed(k, kc) {
    if (k === "q" || k === "Q") this.viewRZ -= 0.05;
    if (k === "e" || k === "E") this.viewRZ += 0.05;
  }

  // ==============================
  // Utilities
  // ==============================

  rebuildSpiral() {
    const targetDiameter = height * 0.5;
    this.startRadius = targetDiameter / 2;
    this.endRadius = this.startRadius * this.END_RADIUS_RATIO;

    this.spiral = [];
    for (let i = 0; i < this.NUM_POINTS; i++) {
      const t = i / (this.NUM_POINTS - 1); // 0 outer -> 1 inner
      const r = lerp(this.startRadius, this.endRadius, t);
      const angle = TWO_PI * this.TURNS * t;

      // square mapping via L∞ norm (x,z plane)
      const u = Math.cos(angle);
      const v = Math.sin(angle);
      const m = Math.max(Math.abs(u), Math.abs(v));
      const x = (r * u) / m;
      const z = (r * v) / m;

      this.spiral.push({ x, z, t });
    }
  }

  addPulse() {
    this.pulses.push({
      startMs: millis(),
      speed: this.SPEED_T_PER_SEC,
      sigma: this.SIGMA_T,
      amp: random(this.AMP_MIN, this.AMP_MAX),
    });
  }

  scheduleNextPulse() {
    this.nextPulseAt = millis() + random(0, this.AUTO_PULSE_MAX_MS);
  }

  // ---- pseudo 3D projection (rotateZ, rotateX, rotateY, then perspective)
  project3D(x, y, z) {
    // scale
    x *= this.zoom;
    y *= this.zoom;
    z *= this.zoom;

    // rotate Z
    const cz = Math.cos(this.viewRZ),
      sz = Math.sin(this.viewRZ);
    const x0 = x * cz - y * sz;
    const y0 = x * sz + y * cz;
    const z0 = z;

    // rotate X
    const cx = Math.cos(this.viewRX),
      sx = Math.sin(this.viewRX);
    const y1 = y0 * cx - z0 * sx;
    const z1 = y0 * sx + z0 * cx;

    // rotate Y
    const cy = Math.cos(this.viewRY),
      sy = Math.sin(this.viewRY);
    const x2 = x0 * cy + z1 * sy;
    const z2 = -x0 * sy + z1 * cy;

    // perspective projection
    const k = this.persp / (this.persp + z2);

    return {
      x: x2 * k + width / 2,
      y: y1 * k + height / 2,
    };
  }
}
