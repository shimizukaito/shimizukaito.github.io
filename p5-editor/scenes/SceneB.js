// ==========================================
// SceneB: Mondrian BSP (T-junction lines) + Snap Stops + Color Morph
// - HOLD -> MOVE -> HOLD ...
// - During MOVE, split ratios interpolate A -> B (eased)
// - During MOVE, colors interpolate colA -> colB
// - At stop, B becomes A and a new B is sampled
// - Generation avoids rectangles spanning full width/height too much
//
// Controls: click = regenerate, S = save PNG, R = regenerate
// ==========================================

class SceneB extends SceneBase {
  constructor() {
    super();

    // style
    this.LINE_W = 10;

    // timing (ms)
    this.HOLD_MS = 3000;
    this.MOVE_MS = 1000;

    // rectangle generation
    this.TARGET_MIN = 16;
    this.TARGET_MAX = 26;

    // Avoid blocks spanning almost full width/height
    this.SPAN_LIMIT = 0.78;

    // Size guards
    this.MIN_SPLIT_SIZE = 120;
    this.MIN_LEAF_SIZE  = 70;

    // split ratio constraints
    this.T_MIN = 0.22;
    this.T_MAX = 0.78;

    // how much the structure changes per transition
    this.DELTA_T = 0.18;

    // white-heavy palette
    this.palette = [
      [245,245,245],
      [245,245,245],
      [245,245,245],
      [245,245,245],
      [228,  40,  36], // red
      [ 35,  75, 210], // blue
      [244, 210,  40], // yellow
    ];

    // runtime
    this.root = null;
    this.leaves = [];
    this.segments = [];

    this.phase = "HOLD"; // "HOLD" | "MOVE"
    this.phaseStartMs = 0;
  }

  enter() {
    rectMode(CORNER);
    strokeCap(SQUARE);
    strokeJoin(MITER);

    this.regenerate();
  }

  draw() {
    push();

    background(245);

    // ----- timeline -----
    const now = millis();
    const dt = now - this.phaseStartMs;

    if (this.phase === "HOLD") {
      if (dt >= this.HOLD_MS) {
        this.phase = "MOVE";
        this.phaseStartMs = now;
      }
    } else { // MOVE
      if (dt >= this.MOVE_MS) {
        // snap: commit B->A and sample new B
        this.commitTargets(this.root);
        this.phase = "HOLD";
        this.phaseStartMs = now;
      }
    }

    // progress (eased) during MOVE, otherwise 0 (fixed at A)
    const p = (this.phase === "MOVE")
      ? constrain((millis() - this.phaseStartMs) / this.MOVE_MS, 0, 1)
      : 0;
    const e = this.easeInOutCubic(p);

    // ----- build current leaves -----
    this.leaves = [];
    this.buildLeaves(this.root, 0, 0, width, height, e);

    // ----- fill rectangles -----
    noStroke();
    for (const r of this.leaves) {
      fill(r.col[0], r.col[1], r.col[2]);
      rect(r.x, r.y, r.w, r.h);
    }

    // ----- segments (T-junction lines) -----
    this.segments = this.computeSegments(this.leaves);

    stroke(0);
    strokeWeight(this.LINE_W);
    for (const s of this.segments) line(s.x1, s.y1, s.x2, s.y2);

    // outer border
    noFill();
    rect(0, 0, width, height);

    pop();
  }

  mousePressed() {
    this.regenerate();
  }

  keyPressed(k, kc) {
    if (k === "s" || k === "S") saveCanvas("mondrian_snap", "png");
    if (k === "r" || k === "R") this.regenerate();
  }

  // ----------------------
  // node / generation
  // ----------------------

  makeNode(depth) {
    return {
      depth,
      rect: { x: 0, y: 0, w: width, h: height },
      split: null, // {dir:'V'|'H', tA, tB}
      a: null,
      b: null,
      colA: random(this.palette),
      colB: random(this.palette),
    };
  }

  regenerate() {
    this.root = this.makeNode(0);
    this.phase = "HOLD";
    this.phaseStartMs = millis();

    const targetLeaves = int(random(this.TARGET_MIN, this.TARGET_MAX));

    // grow by splitting leaves
    let safety = 0;
    while (this.countLeaves(this.root) < targetLeaves && safety++ < 5000) {
      // ensure leaf rect sizes
      this.rebuildRects(this.root, 0, 0, width, height);

      // pick leaf
      const leaf = this.pickLeafPreferSpanning(this.root, this.SPAN_LIMIT);
      if (!leaf) break;

      const r = leaf.rect;
      const canV = r.w > this.MIN_SPLIT_SIZE * 2;
      const canH = r.h > this.MIN_SPLIT_SIZE * 2;
      if (!canV && !canH) break;

      // spanning checks
      const spansFullH = r.h > height * this.SPAN_LIMIT;
      const spansFullW = r.w > width  * this.SPAN_LIMIT;

      // choose split direction
      let dir = null;
      if (spansFullH && canH) dir = "H";
      else if (spansFullW && canV) dir = "V";
      else {
        if (canV && canH) {
          if (r.w / r.h > 1.25) dir = "V";
          else if (r.h / r.w > 1.25) dir = "H";
          else dir = (random() < 0.5 ? "V" : "H");
        } else dir = canV ? "V" : "H";
      }

      this.splitLeaf(leaf, dir);
    }

    // init targets for splits & colors
    this.initTargets(this.root);
  }

  splitLeaf(node, dir) {
    node.split = {
      dir,
      tA: random(this.T_MIN, this.T_MAX),
      tB: random(this.T_MIN, this.T_MAX),
    };
    node.a = this.makeNode(node.depth + 1);
    node.b = this.makeNode(node.depth + 1);

    // children colors: independent
    node.a.colA = random(this.palette); node.a.colB = random(this.palette);
    node.b.colA = random(this.palette); node.b.colB = random(this.palette);
  }

  initTargets(node) {
    if (!node) return;

    node.colA = random(this.palette);
    node.colB = random(this.palette);

    if (node.split) {
      node.split.tB = constrain(
        node.split.tA + random(-this.DELTA_T, this.DELTA_T),
        this.T_MIN, this.T_MAX
      );
      this.initTargets(node.a);
      this.initTargets(node.b);
    }
  }

  // At MOVE end: commit B->A and choose new B
  commitTargets(node) {
    if (!node) return;

    node.colA = node.colB;
    node.colB = random(this.palette);

    if (node.split) {
      node.split.tA = node.split.tB;
      node.split.tB = constrain(
        node.split.tA + random(-this.DELTA_T, this.DELTA_T),
        this.T_MIN, this.T_MAX
      );
      this.commitTargets(node.a);
      this.commitTargets(node.b);
    }
  }

  // ----------------------
  // building rectangles
  // ----------------------

  // Rebuild rect sizes for generation picking (uses current tA only)
  rebuildRects(node, x, y, w, h) {
    if (!node) return;
    node.rect = { x, y, w, h };

    if (!node.split) return;

    const t = constrain(node.split.tA, 0.18, 0.82);

    if (node.split.dir === "V") {
      const w1 = w * t;
      const w2 = w - w1;
      this.rebuildRects(node.a, x, y, w1, h);
      this.rebuildRects(node.b, x + w1, y, w2, h);
    } else {
      const h1 = h * t;
      const h2 = h - h1;
      this.rebuildRects(node.a, x, y, w, h1);
      this.rebuildRects(node.b, x, y + h1, w, h2);
    }
  }

  // Build leaves for drawing (uses interpolation A->B by eased progress e)
  buildLeaves(node, x, y, w, h, e) {
    if (!node) return;

    node.rect = { x, y, w, h };

    const col = this.lerpColorRGB(node.colA, node.colB, e);

    if (!node.split) {
      this.leaves.push({ x, y, w, h, col });
      return;
    }

    // interpolate split ratio
    const t = lerp(node.split.tA, node.split.tB, e);
    const tClamped = constrain(t, 0.18, 0.82);

    if (node.split.dir === "V") {
      const w1 = w * tClamped;
      const w2 = w - w1;

      if (w1 < this.MIN_LEAF_SIZE || w2 < this.MIN_LEAF_SIZE) {
        this.leaves.push({ x, y, w, h, col });
        return;
      }
      this.buildLeaves(node.a, x, y, w1, h, e);
      this.buildLeaves(node.b, x + w1, y, w2, h, e);
    } else {
      const h1 = h * tClamped;
      const h2 = h - h1;

      if (h1 < this.MIN_LEAF_SIZE || h2 < this.MIN_LEAF_SIZE) {
        this.leaves.push({ x, y, w, h, col });
        return;
      }
      this.buildLeaves(node.a, x, y, w, h1, e);
      this.buildLeaves(node.b, x, y + h1, w, h2, e);
    }
  }

  // ----------------------
  // partial line segments (T-junction)
  // ----------------------

  computeSegments(rects) {
    const segs = [];
    const eps = 0.5;

    for (let i = 0; i < rects.length; i++) {
      const A = rects[i];
      for (let j = i + 1; j < rects.length; j++) {
        const B = rects[j];

        // vertical adjacency
        if (abs((A.x + A.w) - B.x) < eps || abs((B.x + B.w) - A.x) < eps) {
          const xEdge = abs((A.x + A.w) - B.x) < eps ? (A.x + A.w) : (B.x + B.w);
          const y0 = max(A.y, B.y);
          const y1 = min(A.y + A.h, B.y + B.h);
          if (y1 - y0 > 1) segs.push({ x1: xEdge, y1: y0, x2: xEdge, y2: y1 });
        }

        // horizontal adjacency
        if (abs((A.y + A.h) - B.y) < eps || abs((B.y + B.h) - A.y) < eps) {
          const yEdge = abs((A.y + A.h) - B.y) < eps ? (A.y + A.h) : (B.y + B.h);
          const x0 = max(A.x, B.x);
          const x1 = min(A.x + A.w, B.x + B.w);
          if (x1 - x0 > 1) segs.push({ x1: x0, y1: yEdge, x2: x1, y2: yEdge });
        }
      }
    }
    return segs;
  }

  // ----------------------
  // picking leaves
  // ----------------------

  countLeaves(node) {
    if (!node) return 0;
    if (!node.split) return 1;
    return this.countLeaves(node.a) + this.countLeaves(node.b);
  }

  collectLeafNodes(node, out) {
    if (!node) return;
    if (!node.split) { out.push(node); return; }
    this.collectLeafNodes(node.a, out);
    this.collectLeafNodes(node.b, out);
  }

  pickLeafPreferSpanning(node, spanLimit) {
    const list = [];
    this.collectLeafNodes(node, list);
    if (list.length === 0) return null;

    let sum = 0;
    const weights = list.map(n => {
      const r = n.rect;
      const area = r.w * r.h;

      const spanW = (r.w / width)  > spanLimit ? 8.0 : 1.0;
      const spanH = (r.h / height) > spanLimit ? 8.0 : 1.0;

      const wgt = area * spanW * spanH;
      sum += wgt;
      return wgt;
    });

    let t = random(sum);
    for (let i = 0; i < list.length; i++) {
      t -= weights[i];
      if (t <= 0) return list[i];
    }
    return random(list);
  }

  // ----------------------
  // utilities
  // ----------------------

  lerpColorRGB(a, b, t) {
    return [
      lerp(a[0], b[0], t),
      lerp(a[1], b[1], t),
      lerp(a[2], b[2], t),
    ];
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4*t*t*t : 1 - pow(-2*t + 2, 3)/2;
  }
}
