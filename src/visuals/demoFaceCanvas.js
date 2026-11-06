// src/visuals/demoFaceCanvas.js - Motion-Full Human Face & rPPG Explanatory Simulator
'use strict';

class DemoFaceCanvas {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.animId = null;

        // Kinematics & Motion State
        this.time = 0;
        this.breathPhase = 0;
        this.pulsePhase = 0;
        this.headY = 0;
        this.headAngle = 0;
        this.blinkProgress = 0;
        this.smileAmount = 0;
        this.gazeX = 0;
        this.gazeY = 0;

        // Explanatory Ticker Stages
        this.tickerStages = [
            '1. Optical rPPG detects capillary blood flow under skin',
            '2. Inhale deeply — hear the synth filter sweep bright',
            '3. Exhale slowly — hear the soundscape settle & calm',
            '4. Smiling triggers high-register celestial chimes',
            'Click [Try Live Webcam] when you are ready to test!'
        ];
        this.currentStageIdx = 0;
        this.stageTimer = 0;

        this.resize();
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width || 300;
        this.height = rect.height || 210;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        if (this.ctx) {
            this.ctx.resetTransform?.();
            this.ctx.scale(dpr, dpr);
        }
    }

    start() {
        if (this.animId) return;
        const loop = () => {
            this.update();
            this.draw();
            this.animId = requestAnimationFrame(loop);
        };
        this.animId = requestAnimationFrame(loop);
    }

    stop() {
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    }

    updateState({ pulsePhase, breathWave, smile }) {
        if (typeof pulsePhase === 'number') this.pulsePhase = pulsePhase;
        if (typeof breathWave === 'number') this.breathPhase = breathWave;
        if (smile !== undefined) {
            this.targetSmile = smile ? 1 : 0;
        }
    }

    update() {
        this.time += 0.025;

        // Smooth smile transition
        this.smileAmount += ((this.targetSmile || 0) - this.smileAmount) * 0.08;

        // Auto-cycle smile in demo mode if not manually triggered
        if (this.targetSmile === undefined) {
            const cycle = Math.sin(this.time * 0.4);
            this.smileAmount = cycle > 0.65 ? (cycle - 0.65) / 0.35 : 0;
        }

        // Breathing motion (head and torso micro-kinematics)
        const breath = this.breathPhase; // -1 to 1
        this.headY = Math.sin(this.time * 1.5) * 2 - (breath * 4.5);
        this.headAngle = Math.sin(this.time * 0.8) * 0.015;

        // Gaze saccades (subtle natural eye wandering)
        this.gazeX = Math.sin(this.time * 0.9) * 2.5;
        this.gazeY = Math.cos(this.time * 0.7) * 1.5;

        // Natural blinking
        const blinkCycle = (this.time * 2.2) % 12;
        if (blinkCycle > 11.7) {
            this.blinkProgress = Math.sin(((blinkCycle - 11.7) / 0.3) * Math.PI);
        } else {
            this.blinkProgress = 0;
        }

        // Explanatory Ticker cycling
        this.stageTimer++;
        if (this.stageTimer > 180) { // ~3 seconds per stage
            this.stageTimer = 0;
            this.currentStageIdx = (this.currentStageIdx + 1) % this.tickerStages.length;
        }
    }

    draw() {
        const { ctx, width, height } = this;
        if (!ctx || !width || !height) return;

        // Background: Clean cyber-medical scanner aesthetic
        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, width, height);

        // Tech grid lines
        this.drawScannerGrid(width, height);

        const cx = width / 2;
        const cy = height / 2 - 8;

        ctx.save();
        // Breathing vertical displacement and natural tilt
        ctx.translate(cx, cy + this.headY);
        ctx.rotate(this.headAngle);

        // 1. Shoulders & Upper Chest (Breathing motion)
        this.drawShouldersAndChest(ctx, 0, 0);

        // 2. Neck
        this.drawNeck(ctx, 0, 0);

        // 3. Head & Shaded Face
        this.drawFaceBase(ctx, 0, 0);

        // 4. Optical rPPG Perfusion Heatmap (Glowing blood pulse flush)
        this.drawPerfusionFlush(ctx, 0, 0);

        // 5. Facial Features (Eyes, Eyebrows, Nose, Mouth)
        this.drawFacialFeatures(ctx, 0, 0);

        // 6. Cybernetic Facial Mesh & Landmark Nodes
        this.drawFaceMeshLines(ctx, 0, 0);

        ctx.restore();

        // 7. Explanatory Callouts & HUD Guidance
        this.drawExplanatoryHUD(ctx, width, height);
    }

    drawScannerGrid(w, h) {
        const { ctx } = this;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.lineWidth = 1;

        for (let x = 0; x < w; x += 22) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 22) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawShouldersAndChest(ctx, x, y) {
        // Shoulders rise and broaden on inhale
        const breathSwell = (this.breathPhase + 1) * 3.5;

        const chestGrad = ctx.createLinearGradient(x, y + 55, x, y + 110);
        chestGrad.addColorStop(0, '#151c28');
        chestGrad.addColorStop(1, '#0c1017');

        ctx.save();
        ctx.fillStyle = chestGrad;
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.3)';
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.moveTo(x - 85 - breathSwell, y + 115);
        ctx.quadraticCurveTo(x - 55, y + 55 - breathSwell, x - 22, y + 52);
        ctx.lineTo(x + 22, y + 52);
        ctx.quadraticCurveTo(x + 55, y + 55 - breathSwell, x + 85 + breathSwell, y + 115);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Respiration Motion Vector Indicator
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.6)';
        ctx.beginPath();
        const arrowY = y + 78 - breathSwell * 0.8;
        ctx.moveTo(x, arrowY + 8);
        ctx.lineTo(x, arrowY);
        ctx.lineTo(x - 3, arrowY + 3);
        ctx.moveTo(x, arrowY);
        ctx.lineTo(x + 3, arrowY + 3);
        ctx.stroke();

        ctx.restore();
    }

    drawNeck(ctx, x, y) {
        const neckGrad = ctx.createLinearGradient(x - 18, y + 25, x + 18, y + 55);
        neckGrad.addColorStop(0, '#1b2333');
        neckGrad.addColorStop(1, '#111722');

        ctx.save();
        ctx.fillStyle = neckGrad;
        ctx.beginPath();
        ctx.rect(x - 18, y + 25, 36, 32);
        ctx.fill();

        // Subtle Carotid Artery Pulse Indicator
        const pulse = Math.max(0, this.pulsePhase);
        ctx.fillStyle = `rgba(247, 37, 133, ${pulse * 0.35})`;
        ctx.beginPath();
        ctx.arc(x - 14, y + 38, 4 + pulse * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawFaceBase(ctx, x, y) {
        ctx.save();
        // Warm shaded human face silhouette
        const faceGrad = ctx.createRadialGradient(x, y - 5, 10, x, y, 52);
        faceGrad.addColorStop(0, '#243044');
        faceGrad.addColorStop(0.7, '#18202e');
        faceGrad.addColorStop(1, '#0e141f');

        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        // Anatomical head oval
        ctx.ellipse(x, y, 42, 54, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outer glow contour
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.45)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
    }

    drawPerfusionFlush(ctx, x, y) {
        // High-fidelity rPPG capillary blood volume pulse flush
        const pulse = Math.max(0, this.pulsePhase); // 0 to 1
        if (pulse <= 0.05) return;

        ctx.save();
        // Forehead Perfusion ROI
        const fhGrad = ctx.createRadialGradient(x, y - 24, 2, x, y - 24, 26);
        fhGrad.addColorStop(0, `rgba(247, 37, 133, ${0.45 * pulse})`);
        fhGrad.addColorStop(0.6, `rgba(0, 245, 212, ${0.25 * pulse})`);
        fhGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = fhGrad;
        ctx.beginPath();
        ctx.ellipse(x, y - 24, 26, 13, 0, 0, Math.PI * 2);
        ctx.fill();

        // Left and Right Cheek Perfusion ROIs
        [-20, 20].forEach(xOff => {
            const chkGrad = ctx.createRadialGradient(x + xOff, y + 8, 2, x + xOff, y + 8, 18);
            chkGrad.addColorStop(0, `rgba(247, 37, 133, ${0.4 * pulse})`);
            chkGrad.addColorStop(0.7, `rgba(0, 245, 212, ${0.18 * pulse})`);
            chkGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = chkGrad;
            ctx.beginPath();
            ctx.arc(x + xOff, y + 8, 16, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    drawFacialFeatures(ctx, x, y) {
        ctx.save();

        // Eyebrows
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.6;
        [-17, 17].forEach((xOff, idx) => {
            const dir = idx === 0 ? 1 : -1;
            const browLift = this.smileAmount * 2.5;
            ctx.beginPath();
            ctx.moveTo(x + xOff - dir * 10, y - 18 - browLift);
            ctx.quadraticCurveTo(x + xOff, y - 21 - browLift, x + xOff + dir * 10, y - 17 - browLift);
            ctx.stroke();
        });

        // Eyes (with natural gaze and blink)
        const isBlinking = this.blinkProgress > 0.4;
        [-17, 17].forEach(xOff => {
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            if (isBlinking) {
                // Closed eyelid
                ctx.moveTo(x + xOff - 8, y - 8);
                ctx.quadraticCurveTo(x + xOff, y - 6, x + xOff + 8, y - 8);
                ctx.stroke();
            } else {
                // Open eye
                const eyeHeight = 5 * (1 - this.blinkProgress);
                ctx.ellipse(x + xOff, y - 8, 8, eyeHeight, 0, 0, Math.PI * 2);
                ctx.stroke();

                // Pupil with gaze saccades
                ctx.fillStyle = '#00f5d4';
                ctx.beginPath();
                ctx.arc(x + xOff + this.gazeX * 0.6, y - 8 + this.gazeY * 0.6, 2.2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Nose Bridge & Tip
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x - 2, y + 10);
        ctx.quadraticCurveTo(x, y + 13, x + 3, y + 10);
        ctx.stroke();

        // Mouth (Morphs between calm resting and smiling)
        const smile = this.smileAmount;
        ctx.beginPath();
        if (smile > 0.1) {
            ctx.strokeStyle = '#f72585';
            ctx.lineWidth = 2.0;
            // Warm smiling curve
            ctx.moveTo(x - 15 - smile * 3, y + 25 - smile * 2);
            ctx.quadraticCurveTo(x, y + 33 + smile * 4, x + 15 + smile * 3, y + 25 - smile * 2);
            ctx.stroke();

            // Lower lip shadow
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(247, 37, 133, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.arc(x, y + 28 + smile * 2, 7, 0.2, Math.PI - 0.2);
            ctx.stroke();
        } else {
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.moveTo(x - 12, y + 26);
            ctx.quadraticCurveTo(x, y + 29, x + 12, y + 26);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawFaceMeshLines(ctx, x, y) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.25)';
        ctx.fillStyle = '#00f5d4';
        ctx.lineWidth = 0.8;

        // Key facial tracking landmark dots
        const landmarks = [
            [x - 42, y], [x + 42, y], // temple
            [x, y - 54], [x, y + 54], // forehead top, chin
            [x - 17, y - 24], [x + 17, y - 24], // forehead rPPG ROI
            [x - 22, y + 8], [x + 22, y + 8], // cheeks
            [x - 16, y + 26], [x + 16, y + 26], // mouth corners
        ];

        landmarks.forEach(([lx, ly]) => {
            ctx.beginPath();
            ctx.arc(lx, ly, 1.6, 0, Math.PI * 2);
            ctx.fill();
        });

        // Delicate interconnecting tracking lines
        ctx.beginPath();
        ctx.moveTo(x - 17, y - 24); ctx.lineTo(x + 17, y - 24);
        ctx.moveTo(x - 17, y - 24); ctx.lineTo(x - 22, y + 8);
        ctx.moveTo(x + 17, y - 24); ctx.lineTo(x + 22, y + 8);
        ctx.moveTo(x - 22, y + 8); ctx.lineTo(x, y + 10); ctx.lineTo(x + 22, y + 8);
        ctx.stroke();

        ctx.restore();
    }

    drawExplanatoryHUD(ctx, w, h) {
        ctx.save();

        // 1. Target Bounding Box / Corner Reticles
        const pad = 12;
        const bLen = 14;
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.7)';
        ctx.lineWidth = 1.6;

        // Top-left
        ctx.beginPath(); ctx.moveTo(pad, pad + bLen); ctx.lineTo(pad, pad); ctx.lineTo(pad + bLen, pad); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(w - pad - bLen, pad); ctx.lineTo(w - pad, pad); ctx.lineTo(w - pad, pad + bLen); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(pad, h - pad - 26 - bLen); ctx.lineTo(pad, h - pad - 26); ctx.lineTo(pad + bLen, h - pad - 26); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(w - pad - bLen, h - pad - 26); ctx.lineTo(w - pad, h - pad - 26); ctx.lineTo(w - pad, h - pad - 26 - bLen); ctx.stroke();

        // 2. Animated Callout Labels
        ctx.font = '8px "JetBrains Mono", monospace';

        // Callout 1: Forehead rPPG Perfusion
        ctx.fillStyle = '#f72585';
        ctx.fillText('◄ rPPG ROI (PULSE)', w - 105, 34);

        // Callout 2: Respiration Motion
        ctx.fillStyle = '#00f5d4';
        ctx.fillText('RESPIRATION TRACE ▲', 16, h - 42);

        // Callout 3: Affect / Smile
        if (this.smileAmount > 0.4) {
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('SMILE DETECTED ☺', w - 95, h - 42);
        }

        // 3. Bottom Explanatory Ticker Bar
        const barY = h - 22;
        ctx.fillStyle = 'rgba(10, 13, 20, 0.92)';
        ctx.fillRect(0, barY, w, 22);
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.25)';
        ctx.beginPath(); ctx.moveTo(0, barY); ctx.lineTo(w, barY); ctx.stroke();

        ctx.font = '9px "Inter", -apple-system, sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        const currentMsg = this.tickerStages[this.currentStageIdx];
        ctx.fillText(currentMsg, w / 2, barY + 14);

        ctx.restore();
    }

    destroy() {
        this.stop();
    }
}

module.exports = { DemoFaceCanvas };
