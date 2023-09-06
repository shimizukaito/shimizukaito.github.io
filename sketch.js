let x=0,y=0;
let angle=0;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas');
}

function draw() {
  background(0);
  x = sin(angle);
  y = cos(angle);
  
  let radius = width/15;
  let earth = width/30;
  
  
  //太陽
  translate(width/4*3,height/2);
  fill(253,184,109);
  noStroke();
  ellipse(0,0,width/15,width/15);
  
  
  //水星
  x = sin(angle/0.2);
  y = cos(angle/0.2);
  noFill();
  strokeWeight(2);
  stroke(255);
  ellipse(0,0,width/15*2,width/15*2);
  fill(200);
  noStroke();
  ellipse(x * radius,y * radius,earth/3,earth/3);
  
  

  //金星
  x = sin(angle/0.6);
  y = cos(angle/0.6);
  noFill();
  stroke(255);
  ellipse(0,0,width/15*3,width/15*3);
  fill(247,220,141);
  noStroke();
  ellipse(x * radius*1.5,y * radius*1.5,earth*0.9,earth*0.9);
  
  
  //地球
  x = sin(angle);
  y = cos(angle);
  noFill();
  stroke(255);
  ellipse(0,0,width/15*4,width/15*4);
  fill(160,216,239);
  noStroke();
  ellipse(x * radius*2,y * radius*2,earth,earth);
  
  //火星
  x = sin(angle/1.8);
  y = cos(angle/1.8);
  noFill();
  stroke(255);
  ellipse(0,0,width/15*5,width/15*5);
  fill(217,94,77);
  noStroke();
  ellipse(x * radius*2.5,y * radius*2.5,earth/2,earth/2);
    
  //木星
  x = sin(angle/3);
  y = cos(angle/3);
  noFill();
  stroke(255);
  ellipse(0,0,width/15*7,width/15*7);
  fill(188,123,61);
  noStroke();
  ellipse(x * radius*3.5,y * radius*3.5,earth*2,earth*2);
  
  angle = angle + 0.01;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}