function preload() {
    // setupより先に実行
    font = loadFont("Lato-BlackItalic.ttf");
  }

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas');
}

function draw() {
    background(200);
    
    name();


}

function name(){

    push();
    textFont("Silkscreen"); // 読み込んだフォントを文字に割当てる
    textSize(width/15);
    translate(width/4, height/6);
    text("Shimizu Kaito", 0, 0);
    pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
