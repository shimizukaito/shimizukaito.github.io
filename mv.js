

let blocks; // ブロックのリスト
let ball1;
let ball2;

let col1, col2;

let blocksize;

function preload() {
  // setupより先に実行
  font = loadFont("Lato-BlackItalic.ttf");
}

function setup() {
  blocks = [];
  col1 = color(135, 206, 250); //lightskyblue
  col2 = color(50, 50, 50);
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas');

  blocksize = Math.trunc(width/25);
	
  ball1 = new Ball(blocksize * 5, height / 2, blocksize , col2);
  ball2 = new Ball(blocksize * 20, height / 2, blocksize , col1);

  setBlock();
}

function draw() {
  background(0);
  blockDisplay();
  ballDisplay();
  name();
}

function ballDisplay() {
  ball1.display();
  ball1.update();
  ball2.display();
  ball2.update();
}

function blockDisplay() {
  for (let i = 0; i < blocks.length; i++) {
    let myBlock = blocks[i];
    myBlock.display();
    myBlock.checkCollision(ball1); // 衝突検知
    myBlock.checkCollision(ball2); // 衝突検知
  }
}

function setBlock() {
  let colorMode;

  for (let i = 0; i < width; i += blocksize) {
    for (let j = 0; j < height; j += blocksize) {
      if (i < width / 2) {
        colorMode = 0;
      } else {
        colorMode = 1;
      }
      let myBlock = new Block(i, j, blocksize, colorMode);
      blocks.push(myBlock);
    }
  }
}

class Ball {
  constructor(x, y, size, col) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.col = col;
    this.xspeed = random(10, 15);
    this.yspeed = random(10, 15);
  }

  display() {
    push();
    noStroke();
    fill(this.col);
    translate(this.x, this.y);
    ellipse(0, 0, this.size, this.size);
    pop();
  }

  update() {
    this.x += this.xspeed;
    this.y += this.yspeed;

    // 画面端に達したら反転する
    if (this.x > width - this.size / 2 || this.x < this.size / 2) {
      this.boundx();
    }
    if (this.y > height - this.size / 2 || this.y < this.size / 2) {
      this.boundy();
    }
  }

  boundx() {
    this.xspeed = -this.xspeed;
  }

  boundy() {
    this.yspeed = -this.yspeed;
  }

  getx() {
    return this.x;
  }

  gety() {
    return this.y;
  }

  getcol() {
    return this.col;
  }

  getsize() {
    return this.size;
  }
}

class Block {
  constructor(x, y, size, colorMode) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.colorMode = colorMode;
    this.col = null;
  }

  display() {
    if (this.colorMode === 0) {
      this.col = col1;
      fill(col1);
    } else if (this.colorMode === 1) {
      this.col = col2;
      fill(col2);
    }

    push();
    noStroke();
    translate(this.x, this.y);
    rect(0, 0, this.size, this.size);
    pop();
  }

  checkCollision(ball) {
    if (ball.getcol() == this.col) {
      if (
        ball.getx() + ball.getsize() / 2 > this.x &&
        ball.getx() - ball.getsize() / 2 < this.x + this.size &&
        ball.gety() + ball.getsize() / 2 > this.y &&
        ball.gety() - ball.getsize() / 2 < this.y + this.size
      ) {
        if (ball.getx() > this.x && ball.getx() < this.x + this.size) {
          ball.boundy(); // 上下の衝突の場合、Y軸でバウンド
        } else {
          ball.boundx(); // 左右の衝突の場合、X軸でバウンド
        }
        this.colorMode = 1 - this.colorMode; // colorModeを反転させる (1なら0に、0なら1に)
      }
    }
  }

}

function name(){

    push();
    textFont("Silkscreen"); // 読み込んだフォントを文字に割当てる
    textSize(width/15);
    translate(width/8,height/2);
    fill(col2);
    text("Shimizu", 0, 0);
    pop();
    
    push();
    textFont("Silkscreen"); // 読み込んだフォントを文字に割当てる
    textSize(width/15);
    translate(width/8*5,height/2);
    fill(col1);
    text("Kaito", 0, 0);
    pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
}
