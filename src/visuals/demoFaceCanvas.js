// src/visuals/demoFaceCanvas.js - AI Computer Vision & Biometric rPPG Scanner Overlay
'use strict';

class DemoFaceCanvas {
    constructor(canvas) {
        this.canvas = canvas;
        if (!canvas) return;
        this.ctx = canvas.getContext('2d');
        this.animId = null;

        // Kinematics & Tracking State
        this.time = 0;
        this.pulsePhase = 0;
        this.breathPhase = 0;
        this.isSmiling = false;
        this.smileValence = 0;
        this.scanY = 0;
        this.pulseFlash = 0;

        // Ticker stages for UX guidance
        this.tickerStages = [
            '1. AI Optical rPPG detects microvascular blood volume pulse',
            '2. Inhale deeply — hear the synth harmonic filter swell bright',
            '3. Exhale slowly — hear the soundscape settle into deep calm',
            '4. Smiling triggers high-register celestial chime cascades',
            'Click [Switch to Live Webcam] when you wish to test your camera!'
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
        this.height = rect.height || 220;
        this.canvas.width = Math.floor(this.width * dpr);
        this.canvas.height = Math.floor(this.height * dpr);
        if (this.ctx) {
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }

    start() {
        if (this.animId || !this.ctx) return;
        const loop = () => {
            try {
                this.update();
                this.draw();
            } catch (err) {
                console.error('[DemoFaceCanvas] Render error:', err);
            }
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

    triggerHeartbeat() {
        this.pulseFlash = 1.0;
    }

    updateState({ pulsePhase, breathWave, smile }) {
        if (typeof pulsePhase === 'number') this.pulsePhase = pulsePhase;
        if (typeof breathWave === 'number') this.breathPhase = breathWave;
        if (smile !== undefined) {
            this.isSmiling = !!smile;
            this.smileValence = smile ? 0.9 : 0.1;
        }
    }

    update() {
        this.time += 0.03;

        // Pulse flash decay
        this.pulseFlash *= 0.88;

        // Scanning laser sweep bar
        this.scanY = (this.scanY + 1.6) % (this.height + 40);

        // Advance ticker guidance message every 7 seconds
        this.stageTimer += 0.03;
        if (this.stageTimer > 7.0) {
            this.stageTimer = 0;
            this.currentStageIdx = (this.currentStageIdx + 1) % this.tickerStages.length;
        }
    }

    draw() {
        const { ctx, width, height } = this;
        if (!ctx || !width || !height) return;

        // Clear overlay canvas (transparent so underlying video shows through)
        ctx.clearRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height * 0.46;
        const faceScale = width / 300;

        // 1. Draw MediaPipe-style 3D AI Landmark Mesh over the face
        this.drawAiLandmarkMesh(cx, cy, faceScale);

        // 2. Draw rPPG Region of Interest (ROI) Tracking Boxes (Forehead & Cheeks)
        this.drawRppgRoiBoxes(cx, cy, faceScale);

        // 3. Draw Laser Scanning Beam
        this.drawScanningLaser();

        // 4. Draw Corner Targeting Brackets & AI Telemetry HUD
        this.drawCameraHud(cx, cy);

        // 5. Draw Bottom Step-by-Step Ticker
        this.drawBottomTicker();
    }

    drawAiLandmarkMesh(cx, cy, s) {
        const { ctx } = this;
        ctx.save();

        // Subtly track head micro-motion
        const breathOffY = Math.sin(this.time * 1.4) * 1.5;
        const mX = cx;
        const mY = cy + breathOffY;

        // Key facial landmark anchor points (normalized to subject face)
        const landmarks = [
            // Forehead / Brow
            { x: mX - 42 * s, y: mY - 45 * s },
            { x: mX - 18 * s, y: mY - 52 * s },
            { x: mX,          y: mY - 54 * s },
            { x: mX + 18 * s, y: mY - 52 * s },
            { x: mX + 42 * s, y: mY - 45 * s },

            // Left Eye
            { x: mX - 38 * s, y: mY - 26 * s },
            { x: mX - 26 * s, y: mY - 30 * s },
            { x: mX - 14 * s, y: mY - 26 * s },
            { x: mX - 26 * s, y: mY - 22 * s },

            // Right Eye
            { x: mX + 14 * s, y: mY - 26 * s },
            { x: mX + 26 * s, y: mY - 30 * s },
            { x: mX + 38 * s, y: mY - 26 * s },
            { x: mX + 26 * s, y: mY - 22 * s },

            // Nose bridge & tip
            { x: mX,          y: mY - 24 * s },
            { x: mX,          y: mY - 6 * s },
            { x: mX - 12 * s, y: mY + 6 * s },
            { x: mX,          y: mY + 8 * s },
            { x: mX + 12 * s, y: mY + 6 * s },

            // Cheeks (Malar)
            { x: mX - 52 * s, y: mY - 2 * s },
            { x: mX - 32 * s, y: mY + 6 * s },
            { x: mX + 32 * s, y: mY + 6 * s },
            { x: mX + 52 * s, y: mY - 2 * s },

            // Mouth
            { x: mX - 24 * s, y: mY + 28 * s },
            { x: mX - 10 * s, y: mY + (this.isSmiling ? 25 : 27) * s },
            { x: mX,          y: mY + (this.isSmiling ? 24 : 27) * s },
            { x: mX + 10 * s, y: mY + (this.isSmiling ? 25 : 27) * s },
            { x: mX + 24 * s, y: mY + 28 * s },
            { x: mX,          y: mY + (this.isSmiling ? 35 : 33) * s },

            // Jawline & Chin
            { x: mX - 58 * s, y: mY + 12 * s },
            { x: mX - 44 * s, y: mY + 44 * s },
            { x: mX - 22 * s, y: mY + 62 * s },
            { x: mX,          y: mY + 68 * s },
            { x: mX + 22 * s, y: mY + 62 * s },
            { x: mX + 44 * s, y: mY + 44 * s },
            { x: mX + 58 * s, y: mY + 12 * s },
        ];

        // Draw connecting mesh lines (triangulation lines)
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < landmarks.length - 1; i++) {
            ctx.moveTo(landmarks[i].x, landmarks[i].y);
            ctx.lineTo(landmarks[i + 1].x, landmarks[i + 1].y);
        }
        // Cross connections for high-tech mesh feel
        ctx.moveTo(landmarks[2].x, landmarks[2].y); // forehead to nose
        ctx.lineTo(landmarks[14].x, landmarks[14].y);
        ctx.lineTo(landmarks[24].x, landmarks[24].y); // nose to mouth
        ctx.lineTo(landmarks[31].x, landmarks[31].y); // mouth to chin
        ctx.stroke();

        // Draw Landmark Vertex Nodes
        landmarks.forEach((pt, idx) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.4, 0, Math.PI * 2);
            ctx.fillStyle = idx >= 22 && idx <= 27 && this.isSmiling
                ? 'rgba(251, 191, 36, 0.95)' // gold smile nodes
                : 'rgba(0, 245, 212, 0.65)';
            ctx.fill();
        });

        ctx.restore();
    }

    drawRppgRoiBoxes(cx, cy, s) {
        const { ctx, pulseFlash } = this;
        ctx.save();

        const breathOffY = Math.sin(this.time * 1.4) * 1.5;
        const mX = cx;
        const mY = cy + breathOffY;

        // Flash opacity modulated by heartbeat thump
        const flashAlpha = 0.25 + pulseFlash * 0.45;

        // 1. Forehead rPPG Region of Interest (highest capillary density)
        const fhW = 76 * s;
        const fhH = 26 * s;
        const fhX = mX - (fhW / 2);
        const fhY = mY - 60 * s;

        ctx.fillStyle = `rgba(0, 245, 212, ${flashAlpha * 0.35})`;
        ctx.strokeStyle = `rgba(0, 245, 212, ${flashAlpha * 0.95})`;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(fhX, fhY, fhW, fhH);
        ctx.fillRect(fhX, fhY, fhW, fhH);

        // Forehead Tag
        ctx.font = '600 8.5px "JetBrains Mono", monospace';
        ctx.fillStyle = '#00f5d4';
        ctx.fillText('ROI: FOREHEAD rPPG', fhX + 3, fhY - 4);

        // 2. Left & Right Cheek (Malar) rPPG Regions
        const chkW = 30 * s;
        const chkH = 22 * s;

        // Left Cheek
        const lcX = mX - 44 * s;
        const lcY = mY - 2 * s;
        ctx.fillStyle = `rgba(247, 37, 133, ${flashAlpha * 0.35})`;
        ctx.strokeStyle = `rgba(247, 37, 133, ${flashAlpha * 0.95})`;
        ctx.strokeRect(lcX, lcY, chkW, chkH);
        ctx.fillRect(lcX, lcY, chkW, chkH);

        // Right Cheek
        const rcX = mX + 14 * s;
        const rcY = mY - 2 * s;
        ctx.strokeRect(rcX, rcY, chkW, chkH);
        ctx.fillRect(rcX, rcY, chkW, chkH);

        // Cheek Tag
        ctx.fillStyle = '#f72585';
        ctx.fillText('ROI: MALAR', rcX + 2, rcY + chkH + 9);

        ctx.restore();
    }

    drawScanningLaser() {
        const { ctx, width, scanY } = this;
        ctx.save();
        const laserGrad = ctx.createLinearGradient(0, scanY - 14, 0, scanY + 2);
        laserGrad.addColorStop(0, 'rgba(0, 245, 212, 0)');
        laserGrad.addColorStop(0.7, 'rgba(0, 245, 212, 0.12)');
        laserGrad.addColorStop(1, 'rgba(0, 245, 212, 0.7)');

        ctx.fillStyle = laserGrad;
        ctx.fillRect(0, scanY - 14, width, 14);

        ctx.strokeStyle = 'rgba(0, 245, 212, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(width, scanY);
        ctx.stroke();

        ctx.restore();
    }

    drawCameraHud(cx, cy) {
        const { ctx, width, height } = this;
        ctx.save();

        // Outer Target Bracket Corners
        const pad = 12;
        const len = 16;
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.75)';
        ctx.lineWidth = 2;

        // Top-Left
        ctx.beginPath();
        ctx.moveTo(pad, pad + len);
        ctx.lineTo(pad, pad);
        ctx.lineTo(pad + len, pad);
        ctx.stroke();

        // Top-Right
        ctx.beginPath();
        ctx.moveTo(width - pad - len, pad);
        ctx.lineTo(width - pad, pad);
        ctx.lineTo(width - pad, pad + len);
        ctx.stroke();

        // Bottom-Left
        ctx.beginPath();
        ctx.moveTo(pad, height - pad - len);
        ctx.lineTo(pad, height - pad);
        ctx.lineTo(pad + len, height - pad);
        ctx.stroke();

        // Bottom-Right
        ctx.beginPath();
        ctx.moveTo(width - pad - len, height - pad);
        ctx.lineTo(width - pad, height - pad);
        ctx.lineTo(width - pad, height - pad - len);
        ctx.stroke();

        // Top Status Header Pill
        ctx.font = '600 9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#00f5d4';
        ctx.fillText('● AI OPTICAL rPPG SCAN', pad + 4, pad + 14);

        ctx.font = '500 8.5px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillText('468 MESH · 30 FPS', width - pad - 96, pad + 14);

        ctx.restore();
    }

    drawBottomTicker() {
        const { ctx, width, height } = this;
        ctx.save();

        const barH = 22;
        const barY = height - barH;

        // Dark banner background for guidance ticker
        ctx.fillStyle = 'rgba(8, 12, 20, 0.88)';
        ctx.fillRect(0, barY, width, barH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, barY, width, barH);

        // Guidance text
        const text = this.tickerStages[this.currentStageIdx] || '';
        ctx.font = '500 9px "Inter", sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(text, width / 2, barY + 14);

        ctx.restore();
    }

    destroy() {
        this.stop();
    }
}

module.exports = { DemoFaceCanvas };
