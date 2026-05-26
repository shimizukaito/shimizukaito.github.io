let scenes = [];
let current = 0;

// ===== transition state =====
let transitioning = false;
let transStartMs = 0;
let transDurationMs = 1500;   // フェード時間（300〜1200くらいで調整）
let transNextIndex = 0;

let prevFrame = null;        // p5.Image（前シーンのスナップショット）

// ===== auto transition =====
let autoMode = true;         // 自動切替ON/OFF
let autoIntervalMs = 30000;   // 8秒ごとに切替
let nextAutoMs = 0;          // 次回切替予定時刻


// =====================================================
// setup
// =====================================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  scenes = [
    new SceneA(),
    new SceneB(),
    new SceneCurlTriangles(),
    new SceneSquareSpiralPulse(),
    new SceneLinesOnlyGrid(),
    new SceneOilWalkers(),
  ];

  scenes[current].enter();

  // 自動切替の初回予約
  nextAutoMs = millis() + autoIntervalMs;
}


// =====================================================
// draw loop
// =====================================================
function draw() {

  // ===== auto switching by time =====
  if (autoMode && !transitioning && millis() >= nextAutoMs) {
    requestScene(current + 1);
    nextAutoMs = millis() + autoIntervalMs;
  }

  // ===== normal drawing =====
  if (!transitioning) {
    scenes[current].draw();
    return;
  }

  // ===== during transition =====
  const now = millis();
  const u = constrain((now - transStartMs) / transDurationMs, 0, 1);
  const a = easeInOutCubic(u);

  // (1) 前シーンの最後の静止画を表示
  if (prevFrame) {
    image(prevFrame, 0, 0, width, height);
  }

  // (2) 黒フェードアウト（前半）
  noStroke();
  fill(0, 255 * a);
  rect(0, 0, width, height);

  // (3) 真っ黒付近でシーン切替
  if (u >= 0.5 && current !== transNextIndex) {
    scenes[current].exit();
    current = transNextIndex;
    scenes[current].enter();
  }

  // (4) 後半は次シーン描画 → 黒フェードイン
  if (u >= 0.5) {
    scenes[current].draw();

    const a2 = easeInOutCubic(map(u, 0.5, 1.0, 1.0, 0.0));
    noStroke();
    fill(0, 255 * a2);
    rect(0, 0, width, height);
  }

  // (5) 完了
  if (u >= 1.0) {
    transitioning = false;
    prevFrame = null;
  }
}


// =====================================================
// smooth scene switching
// =====================================================
function requestScene(index) {

  const next = (index + scenes.length) % scenes.length;

  if (next === current) return;
  if (transitioning) return; // 連打防止

  // 前シーンの画を保存
  prevFrame = get(0, 0, width, height);

  // 遷移開始
  transitioning = true;
  transStartMs = millis();
  transNextIndex = next;

  // 自動切替タイマーを更新（暴発防止）
  if (autoMode) {
    nextAutoMs = millis() + autoIntervalMs;
  }
}


// =====================================================
// keyboard
// =====================================================
function keyPressed() {

  // --- scene jump ---
  if (key === "1") requestScene(0);
  if (key === "2") requestScene(1);
  if (key === "3") requestScene(2);
  if (key === "4") requestScene(3);
  if (key === "5") requestScene(4);
  if (key === "6") requestScene(5);

  // next / prev
  if (key === "n" || key === "N") requestScene(current + 1);
  if (key === "p" || key === "P") requestScene(current - 1);

  // fullscreen toggle
  if (key === "f" || key === "F") toggleFullscreen();

  // auto mode toggle
  if (key === "a" || key === "A") {
    autoMode = !autoMode;
    nextAutoMs = millis() + autoIntervalMs;
  }

  // interval adjust
  if (key === "-") autoIntervalMs = max(1000, autoIntervalMs - 1000);
  if (key === "=") autoIntervalMs = min(60000, autoIntervalMs + 1000);

  // transition speed adjust
  if (key === "[") transDurationMs = max(120, transDurationMs - 80);
  if (key === "]") transDurationMs = min(2000, transDurationMs + 80);

  // scene-specific key handling
  if (!transitioning && scenes[current].keyPressed) {
    scenes[current].keyPressed(key, keyCode);
  }
}


// =====================================================
// mouse routing
// =====================================================
function mousePressed() {
  if (!transitioning && scenes[current].mousePressed) {
    scenes[current].mousePressed();
  }
}

function mouseDragged() {
  if (!transitioning && scenes[current].mouseDragged) {
    scenes[current].mouseDragged();
  }
}

function mouseWheel(e) {
  if (!transitioning && scenes[current].mouseWheel) {
    return scenes[current].mouseWheel(e);
  }
  return false;
}


// =====================================================
// fullscreen
// =====================================================
function toggleFullscreen() {
  fullscreen(!fullscreen());
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // 遷移キャプチャ破棄
  prevFrame = null;

  if (scenes[current].onResize) {
    scenes[current].onResize();
  }
}


// =====================================================
// easing
// =====================================================
function easeInOutCubic(x) {
  x = constrain(x, 0, 1);
  return (x < 0.5)
    ? 4 * x * x * x
    : 1 - pow(-2 * x + 2, 3) / 2;
}
