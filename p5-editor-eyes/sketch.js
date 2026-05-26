// =====================================
// Eye Tiles (square grid + filled iris/sclera/pupil)
// - gaze target changes at intervals
// - NO lerp movement (no in-between motion)
// - direction switches via cross-fade (prev -> next)
// - colors (tile + iris) also cross-fade on each transition
// - pupil offset angle changes every time the gaze target changes
// - f/F: fullscreen toggle
// =====================================

// ===============================
// グローバル設定パラメータ（ここを調整）
// ===============================

// ---- グリッドの見た目 ----
let CELL = 180;        // 1マス（タイル）のサイズ（ピクセル）
let GAP = CELL / 10;   // タイル同士の隙間（ピクセル）
let PADDING = CELL / 5;// グリッド全体の外側余白（ピクセル）

// ---- 視線の動き ----
let HOLD_FRAMES = 360; // 注視点を切り替える間隔（フレーム数）
let FADE_FRAMES = 24;  // フェード時間（フレーム数）

// ---- 接点をズラす ----
let PUPIL_ANGLE_OFFSET_DEG = 90; // 瞳の方向だけ回転させる最大角度（度）
let PUPIL_LAG = 1.0;             // 瞳方向を混ぜる量（0..1）※1.0で完全に別方向

// ---- 形の比率 ----
let IRIS_D_RATIO   = 0.62; // 虹彩（色つき大円）
let SCLERA_D_RATIO = 0.40; // 白目
let PUPIL_D_RATIO  = 0.14; // 瞳
let HIGHLIGHT_D_RATIO = 0.0; // ハイライト（0で無効）

// ---- 目のズレ量 ----
let REACH_RATIO = 0.38;
let IRIS_SHIFT_MAX   = 0.06;
let SCLERA_SHIFT_MAX = 0.16;
let PUPIL_SHIFT_MAX  = 0.18;

// ===============================

// パレット
const TILE_COLORS = [
  "#3FA23C",
  "#2E2566",
  "#94AECB",
  "#D93A24",
  "#245EA6",
  "#A79F91",
  "#F2A100",
  "#4D6FB3",
  "#E1B9B9",
  "#4DB5D9",
];

const IRIS_COLORS = [
  "#003B63",
  "#55B8D9",
  "#F0D2BD",
  "#143280",
  "#3A2E26",
  "#E7E463",
  "#9E9486",
  "#86A8CF",
];

let cells = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  rectMode(CORNER);
  noStroke();
  initGrid();
}

function initGrid() {
  cells = [];

  const cols = max(1, floor((width  - 2 * PADDING + GAP) / (CELL + GAP)));
  const rows = max(1, floor((height - 2 * PADDING + GAP) / (CELL + GAP)));

  const totalW = cols * CELL + (cols - 1) * GAP;
  const totalH = rows * CELL + (rows - 1) * GAP;
  const ox = (width  - totalW) / 2;
  const oy = (height - totalH) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = ox + c * (CELL + GAP);
      const y0 = oy + r * (CELL + GAP);
      const cx = x0 + CELL / 2;
      const cy = y0 + CELL / 2;

      // 初期色
      const initTile = color(random(TILE_COLORS));
      const initIris = color(random(IRIS_COLORS));

      const st = {
        x0, y0, cx, cy,

        // ★色：prev/next を持つ
        prevTileCol: initTile,
        nextTileCol: initTile,
        prevIrisCol: initIris,
        nextIrisCol: initIris,

        // gaze target
        target: createVector(cx, cy),

        // timing
        phase: floor(random(0, HOLD_FRAMES)),

        // pupil offset
        pupilOffsetDeg: random(0, PUPIL_ANGLE_OFFSET_DEG),

        // fade state
        fadeStart: 0,
        fadeT: 1.0, // 0..1

        // directions (prev -> next)
        prevDir1: createVector(0, 0), // sclera direction
        prevDir2: createVector(0, 0), // pupil direction
        nextDir1: createVector(0, 0),
        nextDir2: createVector(0, 0),
      };

      // 最初のターゲット（この中で向き＆色も即反映）
      pickNewTargetInCell(st, true);

      cells.push(st);
    }
  }
}

function smoothstep01(u) {
  u = constrain(u, 0, 1);
  return u * u * (3 - 2 * u);
}

// 中心→ターゲットから v1/v2（方向）を作る
function computeDirectionsFromTarget(st) {
  let dx = st.target.x - st.cx;
  let dy = st.target.y - st.cy;
  const d = sqrt(dx * dx + dy * dy);

  let vx = 0, vy = 0;
  if (d > 1e-6) { vx = dx / d; vy = dy / d; }

  // v1: 白目方向
  const v1 = createVector(vx, vy);

  // v2: 瞳方向（オフセット角）
  const a1 = atan2(vy, vx);
  const a2 = a1 + radians(st.pupilOffsetDeg);

  let v2x = cos(a2);
  let v2y = sin(a2);

  // v2をv1と混ぜる（1.0ならv2そのまま）
  v2x = lerp(vx, v2x, PUPIL_LAG);
  v2y = lerp(vy, v2y, PUPIL_LAG);

  // 正規化
  const n = sqrt(v2x * v2x + v2y * v2y) || 1;
  const v2 = createVector(v2x / n, v2y / n);

  return { v1, v2, dist: d };
}

function startFadeToNewDirection(st, immediate = false) {
  const { v1, v2 } = computeDirectionsFromTarget(st);

  if (immediate) {
  st.prevTileCol = st.nextTileCol;
  st.prevIrisCol = st.nextIrisCol;
  st.fadeT = 1.0;
  return;
}

  // 現在の表示状態を prev に確定（方向）
  const curDir1 = p5.Vector.lerp(st.prevDir1, st.nextDir1, st.fadeT);
  const curDir2 = p5.Vector.lerp(st.prevDir2, st.nextDir2, st.fadeT);
  st.prevDir1.set(curDir1);
  st.prevDir2.set(curDir2);

  // 現在の表示状態を prev に確定（色）
  st.prevTileCol = lerpColor(st.prevTileCol, st.nextTileCol, st.fadeT);
  st.prevIrisCol = lerpColor(st.prevIrisCol, st.nextIrisCol, st.fadeT);

  // 新しい next（方向）
  st.nextDir1.set(v1);
  st.nextDir2.set(v2);

  // フェード開始
  st.fadeStart = frameCount;
  st.fadeT = 0.0;
}

function pickNewTargetInCell(st, immediate = false) {
  const m = CELL * 0.18;
  st.target.x = random(st.x0 + m, st.x0 + CELL - m);
  st.target.y = random(st.y0 + m, st.y0 + CELL - m);

  // 注視点が変わるたびに瞳オフセットも更新
  st.pupilOffsetDeg = random(0, PUPIL_ANGLE_OFFSET_DEG);

  // ★ここでfadeを先に開始する（fadeTを必ず0にする）
  startFadeToNewDirection(st, immediate);

  // ★next色は fade開始後にセットする
  if (!immediate) {
    st.nextTileCol = color(random(TILE_COLORS));
    st.nextIrisCol = color(random(IRIS_COLORS));
  }
}

function updateGaze(st) {
  // 一定間隔でターゲット更新（=フェード開始）
  if ((frameCount + st.phase) % HOLD_FRAMES === 0) {
    pickNewTargetInCell(st, false);
  }

  // フェード進行
  if (st.fadeT < 1.0) {
    const p = (frameCount - st.fadeStart) / FADE_FRAMES;
    st.fadeT = smoothstep01(p);
  }
}

function drawOneEye(st, irisColNow, dir1, dir2, alphaMul) {
  // 距離は target から算出（途中経過なし）
  const { dist } = computeDirectionsFromTarget(st);
  const reach = CELL * REACH_RATIO;
  const u = smoothstep01(dist / reach);

  // サイズ
  const irisD = CELL * IRIS_D_RATIO;
  const scleraD = CELL * SCLERA_D_RATIO;
  const pupilD = CELL * PUPIL_D_RATIO;
  const highlightD = CELL * HIGHLIGHT_D_RATIO;

  // ズレ量
  const irisShift   = CELL * IRIS_SHIFT_MAX   * u;
  const scleraShift = CELL * SCLERA_SHIFT_MAX * u;
  const pupilShift  = CELL * PUPIL_SHIFT_MAX  * u;

  const v1x = dir1.x, v1y = dir1.y;
  const v2x = dir2.x, v2y = dir2.y;

  // 各中心
  const irisCx = st.cx + v1x * irisShift;
  const irisCy = st.cy + v1y * irisShift;

  const scleraCx = st.cx + v1x * scleraShift;
  const scleraCy = st.cy + v1y * scleraShift;

  const pupilCx = scleraCx + v2x * pupilShift;
  const pupilCy = scleraCy + v2y * pupilShift;

  noStroke();

  push();
  drawingContext.globalAlpha = alphaMul;

  fill(irisColNow);
  circle(irisCx, irisCy, irisD);

  fill(245);
  circle(scleraCx, scleraCy, scleraD);

  fill("#1E1612");
  circle(pupilCx, pupilCy, pupilD);

  if (highlightD > 0.5) {
    fill(255, 210);
    circle(
      scleraCx + v1x * (CELL * 0.06),
      scleraCy + v1y * (CELL * 0.06),
      highlightD
    );
  }

  pop();
}

function drawEyeTile(st) {
  // 色の現在値（prev->next を fadeT で混ぜる）
  const a = st.fadeT; // 0..1
  const tileColNow = lerpColor(st.prevTileCol, st.nextTileCol, a);
  const irisColNow = lerpColor(st.prevIrisCol, st.nextIrisCol, a);

  // タイル背景（単体で塗る：二重描画しない）
  noStroke();
  fill(tileColNow);
  rect(st.x0, st.y0, CELL, CELL);

  // 目の向きは prev->next をクロスフェード
  drawOneEye(st, irisColNow, st.prevDir1, st.prevDir2, 1.0 - a);
  drawOneEye(st, irisColNow, st.nextDir1, st.nextDir2, a);
}

function draw() {
  background("#231A16");

  for (const st of cells) {
    updateGaze(st);
    drawEyeTile(st);
  }
}

// f/F fullscreen toggle
function keyPressed() {
  if (key === 'f' || key === 'F') {
    fullscreen(!fullscreen());
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initGrid();
}
