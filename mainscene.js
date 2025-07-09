// Функция для нормального распределения
function normalPDF(x, mu, sigma) {
    const coefficient = 1 / (sigma * Math.sqrt(2 * Math.PI));
    const exponent = -((x - mu) ** 2) / (2 * sigma ** 2);
    return coefficient * Math.exp(exponent);
}

// Класс монетки
class mCoin extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        this.setAngle(Phaser.Math.Between(-7, 7));
    }
}

// Класс основной монеты
class Coin extends Phaser.GameObjects.Mesh {
    constructor(scene, x, y) {
        super(scene, x, y, 'texture');
        scene.add.existing(this);

        this.isJumping = false;
        this.isHolding = false;
        this.del_flag = true;
        this.floor_f = false;
        this.velocityY = 0;
        this.velocityX = 0;
        this.velocityZ = 1;
        this.currentSpin = 0;
        this.curentScale = 2.5;
        this.holdStartTime = 0;
        this.px_0 = 0;
        this.py_0 = 0;
        this.rot_amp = Phaser.Math.FloatBetween(0.05, 0.15);
        this.rot_f = Phaser.Math.FloatBetween(0.07, 0.1);
        this.setTint(0xFFFFFF);
        this.setAlpha(1);
        this.y_o = 0;
        this.s_y_o = 0;				
        this.cshdw = scene.add.mesh(0, 0, 'cshdw');	
        this.d_x = 0;		
        this.yoffset = 0;	
        this.ZforSpin = 0;
    }

    adjustBrightness(factor) {
        const value = Math.floor(255 * factor);
        const tint = Phaser.Display.Color.GetColor(value, value, value);
        this.setTint(tint);
    }		
}

// Основная игровая сцена
class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.score = 0;
        this.gravity = 0.5;
        this.bounceDamping = 0.8;
        this.minHoldTime = 0;
        this.maxHoldTime = 800;
        this.maxJumpForceX = 25;
        this.maxJumpForceY = 60;
        this.maxJumpForceZ = 60;				
        this.maxDx = 100;
        this.maxDy = 100;
        this.baseYOffset = 200;
        this.soundVolume = 0.6;
        this.bg01_height = 405;
        this.bg02_height = 491;
        this.mcoin_width = 53;
        this.mcoin_height = 41;
        this.pile_high = 0;
        this.resolution_coeff = 1;
        this.max_i = 0;
        this.e_flag = true;
    }

    preload() {
        // Ресурсы уже загружены в LoadScene
    }

    create() {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.MainButton.hide();
            window.Telegram.WebApp.onEvent('backButtonClicked', () => {
                this.scene.start('MenuScene');
            });
        }
        
        coins = this.add.group();
        pile = this.add.group();

        this.bounceSound = this.sound.add('coinDrop', { volume: this.soundVolume });
        this.upSound = this.sound.add('coinUp', { volume: this.soundVolume });
        this.mSound = this.sound.add('magic', { volume: this.soundVolume - 0.2 });

        this.bg = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'bg');

        this.plane01 = this.add.plane(this.cameras.main.centerX, this.cameras.main.height, 'bg01').panZ(0);	
        this.plane02 = this.add.plane(this.cameras.main.centerX, this.cameras.main.height, 'bg02').panZ(0);				
        
        this.plane01.setDepth(100);
        this.plane01.z = 1;
        this.plane02.setDepth(200);
        this.plane02.z = 0.5;				

        const scaleX = this.cameras.main.width / this.bg.width;
        const scaleY = this.cameras.main.height / this.bg.height;
        this.scale = Math.max(scaleX, scaleY);
        
        this.bg.setScale(this.scale).setScrollFactor(0);
        this.plane01.setScale(this.scale);
        this.plane01.y = (this.bg.height - this.bg01_height) * this.scale;
        this.plane02.setScale(this.scale);
        this.plane02.y = (this.bg.height - 2 * this.bg01_height - this.bg02_height) * this.scale;	
            
        this.stnLevel = (this.bg.height - 2 * this.bg01_height) * this.scale;
        this.baseYOffset = 450 * this.scale;
        this.target_y = (this.bg.height - 2 * this.bg01_height - 2 * this.bg02_height + 300) * this.scale;
        this.target_x = this.cameras.main.centerX;
        this.pileX = this.target_x;
        this.pileY = (this.bg.height - 2 * this.bg01_height - 0.8 * this.bg02_height) * this.scale;
        this.perspective = 112 * this.scale;
        this.zfactor = 500 * this.scale;
        this.coin_h = 30 * this.scale;
        this.target_r = 240;
        
        this.b1 = (this.zfactor / this.perspective + 1) * 0.57;
        this.b2 = (this.zfactor / this.perspective + 1) * 0.85;
        this.b3 = (this.zfactor / this.perspective + 1) * 1;				
        
        this.scoreText = this.add.text(20, 30, "Монет : 0", {
            font: '28px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setScrollFactor(0);
        
        this.is_n = Phaser.Math.Between(1, 5);
        this.createMultiCoin(this.is_n);
        this.get_up_coin();
        this.InitPile();
    }
            
    createMultiCoin(n) {
        this.mSound.play();
        const randomX = Phaser.Math.Between(-this.cameras.main.width / 3.5, this.cameras.main.width / 3.5);
        const x = this.cameras.main.centerX + randomX;
        this.triggerLightning(x, this.cameras.main.centerY + this.baseYOffset);
        for (let i = 1; i <= n; i++) {	
            const y = (i - 1) * this.coin_h;
            this.createNewCoin(x, y);
        }
    }
    
    sc(x, y, h, w) {
        return 1 - 0.3 * (Math.pow(x / w, 4) + Math.pow(y / h, 4));
    }

    tnt(x, y, h, w) {
        const r = 255 - 220 * (Math.exp(2 * (y - h) / h)) + 20 * Math.pow(2 * Math.abs(x - w / 300) / w, 3);
        return Math.max(20, Math.min(255, r));
    }
    
    UpPile() {
        this.pile_high += 0.01;
        if (this.pile_high > 1) this.pile_high = 1;
    }
    
    SetPile() {
        if (this.pile_high < 1) {
            for (const mcoin of pile.getChildren()) {
                const c_y = mcoin.y - (0.01 * 220) * this.scale;
                mcoin.y = c_y;
                const rd = Math.sqrt(Math.pow((this.target_x - mcoin.x), 2) + Math.pow((this.target_y - c_y), 2));
                if (rd < (this.target_r + this.mcoin_width - 80 * (1 - this.pile_high)) * this.scale) {
                    mcoin.setVisible(true);
                }
            }
        }
    }
    
    InitPile() {
        const h = 400 * this.scale;
        const w = 400 * this.scale;
        let coin_dx = -w;
        let hh = 0;
        let dpt = 0.4;
        
        for (let i = 0; i <= 2000; i++) {
            const ss = this.scale * this.sc(coin_dx, hh, h, w);
            if (i >= 250) {
                const bx = hh * normalPDF(coin_dx / w, 0, 0.6);					
                const x = Phaser.Math.Between(coin_dx - this.mcoin_width / 2 * ss, coin_dx + this.mcoin_width / 2 * ss);
                const coin_dy = Phaser.Math.Between(-this.mcoin_height / 2 * ss, this.mcoin_height / 2 * ss);
                const c_x = this.pileX + x;
                const c_y = this.pileY - bx - coin_dy;
                const rd = Math.sqrt(Math.pow((this.target_x - c_x), 2) + Math.pow((this.target_y - c_y), 2));
                
                if (rd < (this.target_r + this.mcoin_width) * this.scale) {		
                    const c_im_p = Phaser.Math.Between(0, 3);
                    const c_im_t = 'coin_t' + c_im_p;
                    const mcoin = new mCoin(this, this.pileX + x, this.pileY - bx - coin_dy + 0.5 * this.bg02_height * this.scale, c_im_t);
                    mcoin.setVisible(false);
                    mcoin.setDepth(dpt);
                    let sc_xy = 1.3 - Math.abs(1.4 * coin_dx / w) / 2 - Math.abs(0.7 * hh / h) / 1.3;
                    if (sc_xy < 0.1) sc_xy = 0.1;
                    mcoin.setScale(ss, ss * sc_xy); 
                    const tint0 = this.tnt(coin_dx, hh - 100 * this.scale, h, w);
                    const tint = Phaser.Display.Color.GetColor(
                        tint0 - Phaser.Math.Between(10, 20), 
                        tint0 - Phaser.Math.Between(0, 10), 
                        tint0
                    );
                    mcoin.setTint(tint);
                    pile.add(mcoin);
                }
            }
            coin_dx += ss * this.mcoin_width / 2;
            if (coin_dx > w) {
                coin_dx = -w;
                hh += this.mcoin_height / 3 * ss;
                dpt = 20 + Phaser.Math.FloatBetween(-15, 15);
            }
        }
    }
        
    createNewCoin(x, y) {
        const randomX = Phaser.Math.Between(-50 * this.scale, 50 * this.scale);
        const randomZOffset = Phaser.Math.FloatBetween(-0.02, 0.02);
        this.currentYOffset = this.baseYOffset - 150 * randomZOffset;
        
        const startY = this.cameras.main.centerY - 300;
        const targetY = this.cameras.main.centerY + this.currentYOffset - y;				
        const targetX = x + randomX;
        
        const coin = new Coin(this, targetX, startY);		
        coin.addVerticesFromObj('coin', 0.1).panZ(7).modelRotation.x += 0.6;
        
        coin.yoffset = y;
        coin.z += 0.9 + randomZOffset;
        coin.setScale(coin.curentScale);
        coin.setDepth(200);
        
        coin.cshdw.addVerticesFromObj('coin', 0.1).panZ(7).modelRotation.x += 0.6;
        coin.cshdw.setPosition(targetX - 10 * this.scale, targetY + 50 * this.scale);
        coin.cshdw.setDepth(150);
        coin.cshdw.setScale(1.1 * coin.curentScale);
        coin.cshdw.setAlpha(0.3);
        if (coin.yoffset != 0) coin.cshdw.setVisible(false); 
        
        const circle = new Phaser.Geom.Circle(0, 0, 300);
        coin.setInteractive({ hitArea: circle, hitAreaCallback: Phaser.Geom.Circle.Contains });
        coin.disableInteractive();
        
        this.tweens.add({
            targets: coin,
            alpha: { from: 0, to: 1 },
            y: { from: startY, to: targetY },
            duration: 300,
            ease: 'Cubic.easeOut'
        });
        
        this.tweens.add({
            targets: coin.cshdw,
            alpha: { from: 0, to: 0.3 },
            duration: 300
        });
        
        coin.on('pointerdown', p => {
            this.UpPile();
            this.SetPile();
            if (!coin.isJumping) {
                coin.isHolding = true;
                coin.holdStartTime = this.time.now;
                coin.px_0 = p.x;
                coin.py_0 = p.y;
            }
        });

        this.input.on('pointerup', p => {
            if (coin.isHolding && !coin.isJumping) {
                this.upSound.play();
                const holdDuration = Phaser.Math.Clamp(this.time.now - coin.holdStartTime, 0, this.maxHoldTime);
                const holdX = Phaser.Math.Clamp(coin.px_0 - p.x, -this.maxDx, this.maxDx) / this.maxDx;
                const holdY = Phaser.Math.Clamp(coin.py_0 - p.y, 0, this.maxDy) / this.maxDy;
                
                if (holdDuration >= this.minHoldTime && holdY > 0) {
                    coin.velocityY = -0.9 * this.resolution_coeff * Phaser.Math.Clamp(17 * this.maxJumpForceY * holdY / holdDuration, 4, 23);
                    coin.velocityZ = 0.9 * Phaser.Math.Clamp(0.07 * this.maxJumpForceZ * holdY / holdDuration, 0.08, 0.15);
                    coin.velocityX = -this.maxJumpForceX * holdX / 3;
                    coin.ZforSpin = coin.velocityZ;
                    coin.isJumping = true;
                    this.get_up_coin();
                    coin.modelRotation.y -= coin.velocityX / 17;
                    coin.cshdw.setVisible(true); 
                    coin.isHolding = false;
                    coin.currentSpin = (coin.velocityZ <= 0.9 * 0.08 && coin.velocityY > -7) ? -0.05 : 0.2;
                }
            }
        });
        
        coins.add(coin);
    }

    get_c_len() {
        let i = 0;
        coins.getChildren().forEach(coin => {
            if (!coin.isJumping) i += 1;
        });
        return i;
    }
    
    get_up_coin() {
        let max = -1;
        this.max_i = 0;
        coins.getChildren().forEach((coin, index) => {
            if (!coin.isJumping && coin.yoffset > max) {
                max = coin.yoffset;
                this.max_i = index;
            }
        });
        
        if (coins.getChildren()[this.max_i]) {
            coins.getChildren()[this.max_i].setInteractive();
        }
    }
            
    update(time, delta) {
        const cl = this.get_c_len();
        const dt = 1.5 * delta / 16.66667;
        
        if (cl == 0 && this.e_flag) {
            this.time.delayedCall(500, () => {
                this.is_n = Phaser.Math.Between(1, 5);					
                this.createMultiCoin(this.is_n);
                this.get_up_coin();
            });    
            this.e_flag = false;		
        }
                        
        coins.getChildren().forEach(coin => {
            if (!coin.isJumping) {
                if (coin.rot_amp >= 0.01) {
                    coin.rot_amp *= 1 / (1 + coin.rot_f);
                    coin.modelRotation.x = 0.6 - coin.rot_amp * Math.sin(this.time.now * coin.rot_f);
                    coin.modelRotation.z = coin.rot_amp * Math.sin(this.time.now * coin.rot_f + Math.PI / 2);
                    coin.cshdw.setScale(1.1 * coin.curentScale * Math.cos(coin.modelRotation.z), 1.1 * coin.curentScale * Math.cos(coin.modelRotation.x));
                }
            } else {
                if (cl > 0) this.e_flag = true;
                
                coin.velocityY += this.gravity * dt;
                coin.z += coin.velocityZ * dt;
                coin.y += coin.velocityY * dt;
                
                if (coin.cshdw) {
                    coin.cshdw.y -= -coin.s_y_o + this.perspective * (coin.z - 1) - coin.yoffset;
                    const dsh_y = Phaser.Math.Clamp(0.7 * (coin.cshdw.y - coin.y) / 15, 3.3, 100);
                    coin.cshdw.setAlpha(1 / dsh_y);
                }
                
                coin.y -= -coin.y_o + this.perspective * (coin.z - 1);
                coin.y_o = this.perspective * (coin.z - 1);		
                coin.s_y_o = this.perspective * (coin.z - 1) - coin.yoffset;						
                coin.curentScale = 2.5 / coin.z;
                coin.setScale(coin.curentScale);
                
                if (coin.cshdw) {
                    coin.cshdw.setScale(2.8 / coin.z, 2.5 * Math.sin(coin.modelRotation.x) / coin.z);
                }
                
                coin.x += coin.velocityX * dt;
                if (coin.cshdw) {
                    coin.cshdw.x = coin.x - 5;	
                }
                
                if (Math.abs(coin.modelRotation.x - Math.PI / 2) < 0.2 || Math.abs(coin.modelRotation.x - 3 * Math.PI / 2) < 0.2) {
                    coin.setTint(0xFFFFFF);
                    coin.setBlendMode(Phaser.BlendModes.ADD);
                    coin.setAlpha(1.5);						
                } else {
                    coin.adjustBrightness(Math.pow(coin.curentScale / 2.5, 0.25));
                    coin.setBlendMode(Phaser.BlendModes.NORMAL);
                    coin.setAlpha(1);						
                }
                
                coin.modelRotation.x += coin.currentSpin * (coin.ZforSpin / 0.1) * dt;
                if (coin.modelRotation.x > 2 * Math.PI) {
                    coin.modelRotation.x -= 2 * Math.PI;
                }
                
                coin.floor_f = false;
                
                if (coin.z <= this.b1) coin.d_x = 1;
                if (coin.z > this.b1 && coin.z <= this.b2) coin.d_x = 2;
                if (coin.z >= this.b2 && coin.z < this.b3 && coin.y < this.stnLevel - 85) {
                    coin.d_x = 3;
                    if (coin.del_flag) coin.cshdw.setVisible(true);
                }			
                if (coin.z >= this.b3) {
                    const rd = Math.sqrt(Math.pow((this.target_x - coin.x), 2) + Math.pow((this.target_y - coin.y), 2));
                    if (coin.d_x < 5) coin.d_x = 4;													
                    if (rd < this.target_r * this.scale) coin.d_x = 5;
                }			
                
                if (coin.y >= this.cameras.main.centerY + this.currentYOffset - this.perspective * (coin.z - 1)) {
                    coin.floor_f = true;
                }

                if (coin.d_x == 4 && coin.del_flag) {
                    coin.z = this.b3;
                    coin.velocityZ = (coin.velocityZ < 0.04) ? -0.04 : -0.04;
                    if (coin.y < 100) coin.velocityZ = -0.004;
                    
                    if (Math.abs(coin.velocityY) > 1) {
                        this.bounceSound.play({
                            volume: Phaser.Math.Clamp(Math.abs(coin.velocityY) / 25, 0.3, 1)
                        });
                    } 
                    if (coin.x > this.target_x + (this.target_r - 150) * this.scale) {
                        coin.velocityX = -Math.abs(coin.velocityY / 1);
                    }
                }
                
                if (coin.d_x == 2) coin.cshdw.setVisible(false);
                
                if (coin.d_x == 2 && coin.y >= this.stnLevel - 30 && coin.del_flag) {
                    coin.setDepth(70);
                    this.time.delayedCall(300, () => {	
                        coin.destroy();		
                    });
                    coin.del_flag = false;				
                }	

                if (coin.d_x == 5) {
                    coin.cshdw.setVisible(false);							
                    if (coin.del_flag) {
                        coin.setDepth(45);
                        this.score += 1;
                        this.scoreText.setText(`Монет : ${this.score}`);								
                        this.time.delayedCall(1000, () => {	
                            if (coin) coin.destroy();										
                        });
                        coin.del_flag = false;				
                    }
                }			

                if (coin.y > 3000 && coin) coin.destroy();
                
                if (coin.floor_f && coin.d_x != 2 && coin.del_flag) { 
                    this.score += 1;
                    coin.y = this.cameras.main.centerX + this.currentYOffset - this.perspective * (coin.z - 1);
                    coin.velocityY *= -this.bounceDamping;
                    coin.velocityZ = 0 + (coin.velocityZ - 0) / 1.8;
                    coin.velocityX = coin.velocityX / 3;
                    
                    if (Math.abs(coin.velocityY) > 1) {
                        this.bounceSound.play({
                            volume: Phaser.Math.Clamp(Math.abs(coin.velocityY) / 25, 0.3, 1)
                        });
                    }

                    if (Math.abs(coin.velocityY) < 1) {
                        if (Math.abs(coin.modelRotation.x) - 0.6 < 0.2 || 
                            Math.abs(coin.modelRotation.x) - (2 * Math.PI + 0.6) < 0.2) {
                            coin.velocityY = 0;
                            coin.velocityX = 0;
                            coin.cshdw.setVisible(false);
                            this.tweens.add({
                                targets: [coin, coin.cshdw],
                                alpha: 0,
                                duration: 300,
                                ease: 'Cubic.easeOut',
                                onComplete: () => {
                                    if (coin.del_flag) {
                                        this.time.delayedCall(500, () => {	
                                            coin.destroy();
                                            coin.cshdw.destroy();		
                                        });	
                                        coin.del_flag = false;
                                    }
                                }
                            });
                        } else {
                            coin.modelRotation.x -= 0.3;
                        }						
                    }
                }						
            }
        });
    }

    triggerLightning(x, y) {
        const points = [];
        const segments = 15;
        const maxDeviation = 170;

        points.push(new Phaser.Math.Vector2(x, 0));

        for (let i = 1; i < segments; i++) {
            const progress = i / segments;
            const yPos = y * progress;
            const deviation = maxDeviation * Math.sin(progress * Math.PI);
            const xDev = Phaser.Math.Between(-deviation, deviation);
            points.push(new Phaser.Math.Vector2(x + xDev, yPos));
        }

        points.push(new Phaser.Math.Vector2(x, y));
        const lightningCurve = new Phaser.Curves.Spline(points);

        const lightning = this.add.particles(0, 0, 'flares', {
            frame: { frames: ['white', 'yellow', 'blue'], cycle: true },
            blendMode: 'ADD',
            lifespan: { min: 100, max: 300 },
            quantity: 3,
            scale: { start: 1.9, end: 0 },
            alpha: { start: 0.6, end: 0.0 },
            advance: 0,
            emitZone: {
                type: 'edge',
                source: lightningCurve,
                quantity: 64,
                stepRate: 0
            }
        });
        lightning.setDepth(200);
        lightning.explode(64);

        this.time.delayedCall(30, () => {
            lightning.explode(32);
        });
        this.time.delayedCall(10, () => {
            lightning.explode(16);
        });
    
        this.cameras.main.shake(200, 0.02);

        this.time.delayedCall(200, () => {
            lightning.destroy();
        });
    }           	 
}

// Регистрируем сцену в Phaser
if (typeof Phaser !== 'undefined') {
    Phaser.GameObjects.GameObjectFactory.register('mCoin', function (x, y, texture) {
        return this.displayList.add(new mCoin(this.scene, x, y, texture));
    });
}