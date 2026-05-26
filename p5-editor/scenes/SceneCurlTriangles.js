// ======================================
// Scene: Curl particles (triangles) + grid points background
// NO TRAILS VERSION
// ======================================

class SceneCurlTriangles extends SceneBase {
  constructor() {
    super();

    // --- params (from your sketch)
    this.NUM = 600;

    this.palette = [];

    this.noiseScale = 0.0020;
    this.particleTimeSpeed = 0.0005;

    this.epsilon = 0.6;
    this.stepLen = 1.4;

    this.ps = [];

    this.cols = 16;
    this.unit = 0;
  }

  enter() {
    // palette needs p5 color() => create it here (after p5 is ready)
    this.palette = [
      color(234, 85, 80),
      color(103, 65, 150),
      color(160, 216, 239),
      color(250, 222, 168),
    ];

    this.unit = width / this.cols;

    this.ps = [];
    for (let i = 0; i < this.NUM; i++) {
      this.ps.push(new CurlParticle(this));
    }

    background(255);
  }

  draw() {
    const t = frameCount * this.particleTimeSpeed;

    // ---- clear background every frame (NO TRAILS)
    background(255);

    // ---- grid points
    this.drawGridPoints();

    // ---- particles
    noStroke();
    for (const p of this.ps) {
      p.update(t);
      p.display();
    }
  }

  drawGridPoints() {
    stroke(0);
    strokeWeight(2);
    for (let j = 0; j < this.cols; j++) {
      for (let i = 0; i < this.cols; i++) {
        point((i + 0.5) * this.unit, (j + 0.5) * this.unit);
      }
    }
  }
}

// ======================================
// Particle (scene-owned parameters)
// ======================================
class CurlParticle {
  constructor(scene) {
    this.sc = scene;

    this.pos = createVector(0, 0);
    this.vel = createVector(0, 0);
    this.velTarget = createVector(0, 0);

    this.baseSize = 24;
    this.life = 0;
    this.maxLife = 0;

    this.smooth = 0.12;

    this.appearPortion = 0.18;
    this.vanishPortion = 0.22;

    this.col = color(0);

    this.respawn();
  }

  respawn() {
    this.pos.set(random(width), random(height));

    this.vel = p5.Vector.random2D();
    this.velTarget.set(0, 0);

    this.baseSize = random(20.0, 30.0);
    this.maxLife = int(random(220, 420));
    this.life = this.maxLife;

    this.col = random(this.sc.palette);
  }

  update(t) {
    const eps = this.sc.epsilon;
    const ns = this.sc.noiseScale;

    const fx1 = noise((this.pos.x + eps) * ns, this.pos.y * ns, t);
    const fx2 = noise((this.pos.x - eps) * ns, this.pos.y * ns, t);
    const dx = (fx1 - fx2) / (2 * eps);

    const fy1 = noise(this.pos.x * ns, (this.pos.y + eps) * ns, t);
    const fy2 = noise(this.pos.x * ns, (this.pos.y - eps) * ns, t);
    const dy = (fy1 - fy2) / (2 * eps);

    this.velTarget.set(-dy, dx);

    if (this.velTarget.magSq() > 1e-9) this.velTarget.normalize();
    this.velTarget.mult(this.sc.stepLen);

    this.vel.lerp(this.velTarget, this.smooth);
    this.pos.add(this.vel);

    this.life--;
    if (
      this.life <= 0 ||
      this.pos.x < -30 || this.pos.x > width + 30 ||
      this.pos.y < -30 || this.pos.y > height + 30
    ) {
      this.respawn();
    }
  }

  display() {
    const u = 1.0 - this.life / this.maxLife;
    let fade;

    if (u < this.appearPortion) {
      fade = constrain(u / this.appearPortion, 0, 1);
    } else if (u > 1.0 - this.vanishPortion) {
      fade = constrain((1.0 - u) / this.vanishPortion, 0, 1);
    } else {
      fade = 1.0;
    }
    fade = easeInOutCubic(fade);

    const s = this.baseSize * fade;
    if (s < 0.2) return;

    const ang = atan2(this.vel.y, this.vel.x);

    push();
    translate(this.pos.x, this.pos.y);
    rotate(ang);

    fill(red(this.col), green(this.col), blue(this.col), 200 * fade);

    triangle(
      s, 0,
      -s * 0.7, -s * 0.45,
      -s * 0.7,  s * 0.45
    );
    pop();
  }
}

// easing (same as your sketch)
function easeInOutCubic(x) {
  x = constrain(x, 0, 1);
  return (x < 0.5)
    ? 4 * x * x * x
    : 1 - pow(-2 * x + 2, 3) / 2;
}
