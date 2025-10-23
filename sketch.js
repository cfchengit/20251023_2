// =================================================================
// 步驟一：模擬成績數據接收
// -----------------------------------------------------------------

// let scoreText = "成績分數: " + finalScore + "/" + maxScore;
// 確保這是全域變數
let finalScore = 0; 
let maxScore = 0;
let scoreText = ""; // 用於 p5.js 繪圖的文字

// Fireworks 相關狀態
let fireworks = [];         // 存放所有活躍的 firework（每個 firework 會包含多個 particle）
let fireworksActive = false; // 是否啟動煙火動畫
let fireworksDuration = 4000; // 煙火持續時間 (ms)
let fireworksStartTime = 0;  // 動畫開始時間

window.addEventListener('message', function (event) {
    // 執行來源驗證...
    // ...
    const data = event.data;
    
    if (data && data.type === 'H5P_SCORE_RESULT') {
        
        // !!! 關鍵步驟：更新全域變數 !!!
        finalScore = data.score; // 更新全域變數
        maxScore = data.maxScore;
        scoreText = `最終成績分數: ${finalScore}/${maxScore}`;
        
        console.log("新的分數已接收:", scoreText); 
        
        // ----------------------------------------
        // 關鍵步驟 2: 呼叫重新繪製 (見方案二)
        // ----------------------------------------
        if (typeof redraw === 'function') {
            redraw(); 
        }
    }
}, false);


// =================================================================
// 步驟二：使用 p5.js 繪製分數 (在網頁 Canvas 上顯示)
// -----------------------------------------------------------------

function setup() { 
    // ... (其他設置)
    createCanvas(windowWidth / 2, windowHeight / 2); 
    background(255); 
    noLoop(); // 如果您希望分數只有在改變時才繪製，保留此行
    textFont('Arial');
} 

// ------------------ Fireworks / Particle 類別 ------------------

// 簡單粒子類別
class Particle {
    constructor(x, y, vx, vy, col, life) {
        this.pos = createVector(x, y);
        this.vel = createVector(vx, vy);
        this.acc = createVector(0, 0.02); // 重力
        this.col = col;
        this.life = life; // 剩餘生命（帧數）
        this.initialLife = life;
    }
    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.life--;
    }
    done() {
        return this.life <= 0;
    }
    show() {
        let alpha = map(this.life, 0, this.initialLife, 0, 255);
        noStroke();
        fill(red(this.col), green(this.col), blue(this.col), alpha);
        // 大小依剩餘生命調整
        let size = map(this.life, 0, this.initialLife, 1, 6);
        ellipse(this.pos.x, this.pos.y, size, size);
    }
}

// 一個 Firework 實際上是一組從同一點爆開的 particles
class Firework {
    constructor(x, y) {
        this.particles = [];
        // 隨機色彩
        this.color = color(random(100,255), random(100,255), random(100,255));
        // 產生多個粒子從 (x,y) 向四周散開
        let count = int(random(40, 100));
        for (let i = 0; i < count; i++) {
            let angle = random(TWO_PI);
            let speed = random(1, 6);
            let vx = cos(angle) * speed;
            let vy = sin(angle) * speed;
            // 生命長短隨速度或角度不同
            let life = int(random(40, 140));
            this.particles.push(new Particle(x, y, vx, vy, this.color, life));
        }
    }
    update() {
        for (let p of this.particles) {
            p.update();
        }
        // 移除死亡的粒子
        this.particles = this.particles.filter(p => !p.done());
    }
    done() {
        return this.particles.length === 0;
    }
    show() {
        for (let p of this.particles) {
            p.show();
        }
    }
}

// ------------------ 控制煙火的函數 ------------------

// 啟動煙火（在 draw 第一次判斷到 percentage >= 90 時會呼叫）
function startFireworks() {
    if (fireworksActive) return;
    fireworksActive = true;
    fireworksStartTime = millis();
    loop(); // 開始動畫循環
    // 直接生成一些初始的煙火
    for (let i = 0; i < 5; i++) {
        let x = random(width * 0.2, width * 0.8);
        let y = random(height * 0.1, height * 0.4);
        fireworks.push(new Firework(x, y));
    }
}

// 在煙火期間，定期新增煙火
function maybeSpawnMoreFireworks() {
    // 每隔幾幀生成一個或多個煙火（frameRate 60 假設）
    if (frameCount % 12 === 0) {
        let x = random(width * 0.1, width * 0.9);
        let y = random(height * 0.05, height * 0.45);
        fireworks.push(new Firework(x, y));
    }
}

// 停止煙火並回到 noLoop（只有在所有粒子都消失且時間到時）
function stopFireworksIfDone() {
    if (!fireworksActive) return;
    // 持續時間到了之後，如果所有 firework 都已完成，停止循環
    if (millis() - fireworksStartTime > fireworksDuration) {
        if (fireworks.length === 0) {
            fireworksActive = false;
            noLoop();
        }
    }
}

// ------------------ draw ------------------

function draw() { 
    // 清除背景並畫底色（保留一點殘影效果可看到煙火軌跡，或直接用純白清除）
    if (fireworksActive) {
        // 畫一個半透明黑背景，讓煙火留下殘影效果
        background(0, 20); // (r,g,b,alpha)，alpha 越小殘影越明顯
    } else {
        background(255); // 普通狀態使用白底
    }

    // 計算百分比（避免除以 0）
    let percentage = 0;
    if (maxScore > 0) percentage = (finalScore / maxScore) * 100;

    textSize(80); 
    textAlign(CENTER);
    
    // -----------------------------------------------------------------
    // A. 根據分數區間改變文本顏色和內容 (畫面反映一)
    // -----------------------------------------------------------------
    if (percentage >= 90) {
        // 滿分或高分：顯示鼓勵文本，使用鮮豔顏色
        fill(0, 200, 50); // 綠色 [6]
        text("恭喜！優異成績！", width / 2, height / 2 - 50);
        
        // 啟動煙火特效（只會在第一次進入時啟動）
        if (!fireworksActive) {
            startFireworks();
        }
        
    } else if (percentage >= 60) {
        // 中等分數：顯示一般文本，使用黃色 [6]
        fill(255, 181, 35); 
        text("成績良好，請再接再厲。", width / 2, height / 2 - 50);
        
    } else if (percentage > 0) {
        // 低分：顯示警示文本，使用紅色 [6]
        fill(200, 0, 0); 
        text("需要加強努力！", width / 2, height / 2 - 50);
        
    } else {
        // 尚未收到分數或分數為 0
        fill(150);
        text(scoreText, width / 2, height / 2);
    }

    // 顯示具體分數
    textSize(50);
    fill(50);
    text(`得分: ${finalScore}/${maxScore}`, width / 2, height / 2 + 50);
    
    
    // -----------------------------------------------------------------
    // B. 根據分數觸發不同的幾何圖形反映 (畫面反映二)
    // -----------------------------------------------------------------
    
    if (percentage >= 90) {
        // 畫一個大圓圈代表完美，並啟用煙火
        fill(0, 200, 50, 150); // 帶透明度
        noStroke();
        circle(width / 2, height / 2 + 150, 150);
        
        // 如果煙火正在執行，就更新/繪製它們
        if (fireworksActive) {
            // 可能新增更多煙火
            maybeSpawnMoreFireworks();
            // 更新與繪製
            for (let fw of fireworks) {
                fw.update();
                fw.show();
            }
            // 移除完成的 firework
            fireworks = fireworks.filter(fw => !fw.done());
            // 嘗試停止煙火（時間到了並且已無活動粒子時）
            stopFireworksIfDone();
        }
        
    } else if (percentage >= 60) {
        // 畫一個方形 [4]
        fill(255, 181, 35, 150);
        rectMode(CENTER);
        rect(width / 2, height / 2 + 150, 150, 150);
    }
    
    // 如果您想要更複雜的視覺效果，還可以根據分數修改線條粗細 (strokeWeight) 
    // 或使用 sin/cos 函數讓圖案的動畫效果有所不同 [8, 9]。
}

// 對於視窗大小改變時的處理（可選）
function windowResized() {
    resizeCanvas(windowWidth / 2, windowHeight / 2);
    redraw();
}
