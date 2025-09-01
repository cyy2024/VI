// 预加载自定义光标图像
let customCursor;

function preload() {
  // 请将 'custom-cursor.png' 替换为您的光标图片文件名
  // 如果您的光标图片在项目目录中，请确保路径正确
  customCursor = loadImage('p1.png');
}

let paths = [];   // 存放所有正在生长的分枝
let num = 25;     // 🌱 初始分枝数量 ← 可调
let count = 0;    // 生长计数器
let branchStart = 0.8; // 🌱 分叉开始的高度比例（画布高度 * branchStart）
let windTime = 0; // 风的时间计数器
let windIntensity = 2.0; // 风力强度参数

class Pathfinder {
  constructor(startX = null, parent = null) {
    if (parent === null) {
      // 🌱 主干起点：均匀分布在画布底部
      this.location = createVector(startX, height);
      this.lastLocation = this.location.copy();
      this.velocity = createVector(0, -10);  // 初始速度向上
      this.diameter = 5;                    // 主干初始粗细
      this.isFinished = false;
      this.segments = []; // 存储所有线段
      this.originalSegments = []; // 存储原始线段位置（用于风效计算）
    } else {
      // 🌱 子分枝
      this.location = parent.location.copy();
      this.lastLocation = parent.lastLocation.copy();
      this.velocity = parent.velocity.copy();
      this.diameter = parent.diameter * 0.62; // 子分枝更细
      this.isFinished = parent.isFinished;
      parent.diameter = this.diameter;        // 父分枝继续变细
      this.segments = [];
      this.originalSegments = [];
    }
    
    // 每个树枝的随机风响应参数
    this.windResponse = random(0.8, 2.0);
    this.flexibility = random(0.02, 0.05);
  }

  update() {
    if (this.isFinished) {
      // 树枝生长完成后，应用风效
      this.applyWindEffect();
      return;
    }
    
    if (
      this.location.x > -10 &&
      this.location.x < width + 10 &&
      this.location.y > -10 &&
      this.location.y < height + 10
    ) {
      this.lastLocation.set(this.location.x, this.location.y);

      if (this.diameter > 0.2) {
        count++;

        // 🌱 随机扰动（让树枝有弯曲感）
        let bump = createVector(random(-1, 1), random(-1, 1));
        this.velocity.normalize();
        bump.mult(0.15);
        this.velocity.mult(0.8);
        this.velocity.add(bump);

        // ✅ 向上偏置
        let upwardBias = createVector(0, -0.1);
        this.velocity.add(upwardBias);

        // 🌱 生长步长
        this.velocity.mult(random(5, 10));
        this.location.add(this.velocity);

        // 记录线段（用于风效）
        this.segments.push({
          start: this.lastLocation.copy(),
          end: this.location.copy(),
          diameter: this.diameter
        });
        
        // 保存原始位置（用于风效计算）
        this.originalSegments.push({
          start: this.lastLocation.copy(),
          end: this.location.copy(),
          diameter: this.diameter
        });

        // 🌱 分叉
        if (this.location.y < height * branchStart && random(1) < 0.2) {
          paths.push(new Pathfinder(null, this));
        }
      } else {
        // 过细则停止生长
        if (!this.isFinished) {
          this.isFinished = true;
        }
      }
    }
  }
  
  applyWindEffect() {
    // 对已完成的树枝应用风效果
    for (let i = 0; i < this.segments.length; i++) {
      // 计算风的影响因子（树梢受风影响更大）
      let heightFactor = 1.0 - (this.originalSegments[i].start.y / height);
      
      // 风效果 - 使用正弦波模拟摇摆
      let windEffect = sin(windTime + i * 0.1) * windIntensity * heightFactor * this.windResponse;
      
      // 应用风效到线段
      this.segments[i].start.x = this.originalSegments[i].start.x + windEffect;
      this.segments[i].end.x = this.originalSegments[i].end.x + windEffect;
    }
  }
  
  draw() {
    // 绘制所有线段
    for (let i = 0; i < this.segments.length; i++) {
      let seg = this.segments[i];
      
      // 🎨 高度渐变颜色
      let t = map(seg.start.y, 0, height, 0, 1);
      let r = lerp(245, 6, t);   // 红色分量
      let g = lerp(186, 66, t);  // 绿色分量
      let b = lerp(187, 50, t);  // 蓝色分量

      stroke(r, g, b);
      strokeWeight(seg.diameter);
      line(seg.start.x, seg.start.y, seg.end.x, seg.end.y);
    }
  }
}

function setup() {
  // 创建画布并放入指定容器中
  let canvas = createCanvas(465, 584);
  canvas.parent('canvas-container');
  
  background(225);
  noFill();
  smooth();
  resetTree();
  
  // 隐藏默认光标
  noCursor();
}

function draw() {
  background(225);
  
  // 更新风的时间
  windTime += 0.08;
  
  // 🌱 树枝绘制 & 更新
  for (let i = 0; i < paths.length; i++) {
    paths[i].draw();
    paths[i].update();
  }
  
  // 绘制自定义光标
  drawCustomCursor();
}

// 绘制自定义光标
function drawCustomCursor() {
  if (customCursor) {
    // 计算光标位置（跟随鼠标）
    let cursorX = mouseX;
    let cursorY = mouseY;
    
    // 确保光标在画布范围内
    if (cursorX >= 0 && cursorX <= width && cursorY >= 0 && cursorY <= height) {
      // 绘制光标图像
      imageMode(CENTER);
      image(customCursor, cursorX, cursorY, 32, 32);
    }
  }
}

// 🌱 重置并生成新树
function resetTree() {
  count = 0;
  paths = [];
  background(225);

  let spacing = width / (num + 1);
  for (let i = 0; i < num; i++) {
    let baseX = spacing * (i + 1);
    let jitter = random(-10, 10);
    let startX = constrain(baseX + jitter, 0, width);
    paths.push(new Pathfinder(startX));
  }
}

// ⌨️ 键盘控制
function keyPressed() {
  if (key === ' ') {
    resetTree();
  }
  // +/- 键调整风力
  if (key === '+') {
    windIntensity = min(windIntensity + 0.5, 5.0);
  }
  if (key === '-') {
    windIntensity = max(windIntensity - 0.5, 0.5);
  }
}