// =======================================================
// Scene: Synced Tiled 4x4 DFS system + Intervals (global sync)
// =======================================================

class SceneA extends SceneBase {
  constructor() {
    super();

    this.N = 5;

    // UI
    this.showGrid = false;

    // shared speed for MOVE and FADE (px/s)
    this.speedPx = 400;

    // intervals (ms)
    this.START_PAUSE_MS = 500;
    this.GOAL_PAUSE_MS  = 500;

    // tiling
    this.sims = [];
    this.cols = 1;
    this.rows = 1;
    this.tileSize = 240;
    this.offsetX = 0;
    this.offsetY = 0;

    // global cycle phase
    this.cyclePhase = "START_WAIT"; // START_WAIT / MOVE / GOAL_WAIT / FADE
    this.phaseTimerMs = 0;

    // internal helpers
    this.desiredTile = 220; // density
  }

  enter() {
    textFont("monospace");
    this.buildTiles();
  }

  onResize() {
    this.buildTiles();
  }

  keyPressed(k, kc) {
    if (k === "a" || k === "A") this.showGrid = !this.showGrid;

    if (k === "1") this.speedPx = 200;
    if (k === "2") this.speedPx = 340;
  }

  draw() {
    // 状態汚染対策（他SceneのnoStroke等の影響を受けない）
    push();

    background(250);

    // update global phase timer
    this.phaseTimerMs -= deltaTime;

    // global phase transitions
    if (this.cyclePhase === "START_WAIT") {
      if (this.phaseTimerMs <= 0) {
        this.cyclePhase = "MOVE";
        for (const s of this.sims) s.setPhaseMove();
      }
    }
    else if (this.cyclePhase === "MOVE") {
      if (this.allTilesReachedGoal()) {
        this.cyclePhase = "GOAL_WAIT";
        this.phaseTimerMs = this.GOAL_PAUSE_MS;
        for (const s of this.sims) s.setPhaseHoldAtGoal();
      }
    }
    else if (this.cyclePhase === "GOAL_WAIT") {
      if (this.phaseTimerMs <= 0) {
        this.cyclePhase = "FADE";
        for (const s of this.sims) s.setPhaseFade();
      }
    }
    else if (this.cyclePhase === "FADE") {
      if (this.allTilesFadedOut()) {
        this.startNewCycleForAll();
      }
    }

    // update & draw tiles
    for (const s of this.sims) {
      s.update(deltaTime);
      s.draw(this.showGrid);
    }

    // UI
//     fill(0);
//     noStroke();
//     textSize(13);
//     text(`tiles: ${this.cols} x ${this.rows}`, 10, 18);
//     text(`grid: ${this.showGrid ? "ON" : "OFF"} (A)`, 10, 36);
//     text(`speed: ${Math.round(this.speedPx)} px/s (1/2)`, 10, 54);
//     text(`phase: ${this.cyclePhase}`, 10, 72);

//     pop();
  }

  // =======================================================
  // build / cycle
  // =======================================================

  buildTiles() {
    this.sims = [];

    this.cols = max(1, floor(width / this.desiredTile));
    this.rows = max(1, floor(height / this.desiredTile));

    this.tileSize = min(width / this.cols, height / this.rows);

    const totalW = this.cols * this.tileSize;
    const totalH = this.rows * this.tileSize;
    this.offsetX = (width - totalW) / 2;
    this.offsetY = (height - totalH) / 2;

    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        const x = this.offsetX + i * this.tileSize;
        const y = this.offsetY + j * this.tileSize;
        this.sims.push(new DFSTileSim(x, y, this.tileSize, this.N, () => this.speedPx));
      }
    }

    this.startNewCycleForAll();
  }

  startNewCycleForAll() {
    for (const s of this.sims) s.prepareNewRun();
    this.cyclePhase = "START_WAIT";
    this.phaseTimerMs = this.START_PAUSE_MS;
  }

  allTilesReachedGoal() {
    if (this.sims.length === 0) return false;
    for (const s of this.sims) if (!s.reachedGoal) return false;
    return true;
  }

  allTilesFadedOut() {
    if (this.sims.length === 0) return false;
    for (const s of this.sims) if (!s.fadedOut) return false;
    return true;
  }
}

// =======================================================
// Tile simulation (per tile)
// =======================================================

class DFSTileSim {
  constructor(x, y, size, N, getSpeedPx) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.N = N;

    this.getSpeedPx = getSpeedPx;

    this.cellSize = this.size / this.N;
    this.ballDiam = this.cellSize * 0.8;
    this.trailThick = this.cellSize * 0.8;

    this.minTrailPointDist = 3.0;

    // logic start/goal
    this.start = { x: this.N - 1, y: 0 }; // initial start top-right
    this.goal  = { x: 0, y: 0 };

    this.pendingStart = { ...this.start };

    // path/move
    this.path = [];
    this.segIndex = 0;
    this.segT = 0;
    this.ballPos = this.cellCenter(this.start.x, this.start.y);

    // trail points (tile-local coords)
    this.trail = [];

    // per-cycle flags
    this.reachedGoal = false;
    this.fadedOut = false;

    // per-tile phase (driven by global)
    this.phase = "HOLD_START"; // HOLD_START / MOVE / HOLD_GOAL / FADE
  }

  // ---- global-controlled hooks ----

  prepareNewRun() {
    this.start = { ...this.pendingStart };
    this.goal = this.randomGoalCornerExcept(this.start);

    this.path = this.computeDFSPathInstant(this.start, this.goal);
    if (!this.path || this.path.length === 0) {
      this.goal = this.randomGoalCornerExcept(this.start);
      this.path = this.computeDFSPathInstant(this.start, this.goal);
    }

    this.segIndex = 0;
    this.segT = 0;

    const p0 = this.path[0];
    this.ballPos = this.cellCenter(p0.x, p0.y);

    this.trail = [{ x: this.ballPos.x, y: this.ballPos.y }];

    this.reachedGoal = false;
    this.fadedOut = false;

    this.phase = "HOLD_START";
  }

  setPhaseMove() { this.phase = "MOVE"; }
  setPhaseHoldAtGoal() { this.phase = "HOLD_GOAL"; }
  setPhaseFade() { this.phase = "FADE"; }

  // ---- update/draw ----

  update(dtMs) {
    if (this.phase === "MOVE") {
      this.stepBallMovement(dtMs);
      this.addTrailPoint(this.ballPos.x, this.ballPos.y);
    } else if (this.phase === "HOLD_GOAL") {
      const g = this.cellCenter(this.goal.x, this.goal.y);
      this.ballPos = { x: g.x, y: g.y };
    } else if (this.phase === "FADE") {
      const g = this.cellCenter(this.goal.x, this.goal.y);
      this.ballPos = { x: g.x, y: g.y };
      this.stepTrailFadeDistanceBased(dtMs);
    } else {
      const s = this.cellCenter(this.start.x, this.start.y);
      this.ballPos = { x: s.x, y: s.y };
    }
  }

  draw(showGrid) {
    push();
    translate(this.x, this.y);

    if (showGrid) this.drawGrid();
    this.drawTrail();
    this.drawBall(this.ballPos.x, this.ballPos.y);

    pop();
  }

  // ---- DFS instant ----

  computeDFSPathInstant(s, g) {
    const visited = Array.from({ length: this.N }, () => Array(this.N).fill(false));
    const stack = [{ ...s }];
    visited[s.y][s.x] = true;

    while (stack.length > 0) {
      const cur = stack[stack.length - 1];

      if (cur.x === g.x && cur.y === g.y) {
        return stack.map(p => ({ ...p }));
      }

      const neighbors = this.getNeighbors(cur).filter(p => !visited[p.y][p.x]);
      if (neighbors.length > 0) {
        const next = random(neighbors);
        visited[next.y][next.x] = true;
        stack.push({ ...next });
      } else {
        stack.pop();
      }
    }
    return [];
  }

  getNeighbors(p) {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    return dirs
      .map(d => ({ x: p.x + d.x, y: p.y + d.y }))
      .filter(n => n.x >= 0 && n.x < this.N && n.y >= 0 && n.y < this.N);
  }

  randomGoalCornerExcept(s) {
    const corners = [
      { x: 0, y: 0 },
      { x: 0, y: this.N - 1 },
      { x: this.N - 1, y: this.N - 1 },
      { x: this.N - 1, y: 0 }
    ];
    const cand = corners.filter(c => !(c.x === s.x && c.y === s.y));
    return random(cand);
  }

  // ---- geometry ----

  cellCenter(cx, cy) {
    return {
      x: cx * this.cellSize + this.cellSize / 2,
      y: cy * this.cellSize + this.cellSize / 2
    };
  }

  // ---- smooth movement ----

  stepBallMovement(dtMs) {
    if (!this.path || this.path.length < 1) return;

    if (this.path.length === 1) {
      this.onReachGoal();
      return;
    }

    this.segIndex = constrain(this.segIndex, 0, this.path.length - 2);

    const a0 = this.cellCenter(this.path[this.segIndex].x, this.path[this.segIndex].y);
    const b0 = this.cellCenter(this.path[this.segIndex + 1].x, this.path[this.segIndex + 1].y);
    const segLen = dist(a0.x, a0.y, b0.x, b0.y);

    const dt = dtMs / 1000;
    const speedPx = this.getSpeedPx();
    const dT = segLen > 0 ? (speedPx * dt) / segLen : 1;
    this.segT += dT;

    while (this.segT >= 1 && this.segIndex < this.path.length - 2) {
      this.segT -= 1;
      this.segIndex++;
    }

    const a = this.cellCenter(this.path[this.segIndex].x, this.path[this.segIndex].y);
    const b = this.cellCenter(this.path[this.segIndex + 1].x, this.path[this.segIndex + 1].y);

    const isLast = this.segIndex === this.path.length - 2;
    if (isLast && this.segT >= 1) {
      this.ballPos = { x: b.x, y: b.y };
      this.onReachGoal();
      return;
    }

    this.segT = constrain(this.segT, 0, 1);
    this.ballPos = {
      x: lerp(a.x, b.x, this.segT),
      y: lerp(a.y, b.y, this.segT)
    };
  }

  onReachGoal() {
    this.pendingStart = { ...this.goal };
    this.reachedGoal = true;
    this.phase = "HOLD_GOAL";
  }

  // ---- trail ----

  addTrailPoint(x, y) {
    if (this.trail.length === 0) {
      this.trail.push({ x, y });
      return;
    }
    const last = this.trail[this.trail.length - 1];
    if (dist(last.x, last.y, x, y) >= this.minTrailPointDist) {
      this.trail.push({ x, y });
    }
  }

  stepTrailFadeDistanceBased(dtMs) {
    if (!this.trail || this.trail.length === 0) {
      this.fadedOut = true;
      return;
    }

    let remaining = this.getSpeedPx() * (dtMs / 1000);

    if (this.trail.length === 1) {
      this.trail = [];
      this.fadedOut = true;
      return;
    }

    while (remaining > 0 && this.trail.length >= 2) {
      const p0 = this.trail[0];
      const p1 = this.trail[1];
      const d = dist(p0.x, p0.y, p1.x, p1.y);

      if (d <= 1e-6) {
        this.trail.shift();
        continue;
      }

      if (remaining >= d) {
        this.trail.shift();
        remaining -= d;
      } else {
        const t = remaining / d;
        this.trail[0] = {
          x: lerp(p0.x, p1.x, t),
          y: lerp(p0.y, p1.y, t)
        };
        remaining = 0;
      }
    }

    if (this.trail.length === 0) this.fadedOut = true;
  }

  // ---- drawing ----

  drawGrid() {
    stroke(30);
    strokeWeight(2);
    noFill();
    rect(0, 0, this.size, this.size);

    stroke(150);
    strokeWeight(1);
    for (let i = 1; i < this.N; i++) {
      line(i * this.cellSize, 0, i * this.cellSize, this.size);
      line(0, i * this.cellSize, this.size, i * this.cellSize);
    }
  }

  drawTrail() {
    if (!this.trail || this.trail.length < 2) return;

    stroke(0);
    strokeWeight(this.trailThick);
    strokeCap(ROUND);
    strokeJoin(ROUND);
    noFill();

    beginShape();
    for (const p of this.trail) vertex(p.x, p.y);
    endShape();
  }

  drawBall(x, y) {
    noStroke();
    fill(0);
    circle(x, y, this.ballDiam);
  }
}
