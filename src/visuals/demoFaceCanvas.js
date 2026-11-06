// src/visuals/demoFaceCanvas.js - Holographic Facial rPPG Simulation Canvas
'use strict';

class DemoFaceCanvas {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.animId = null;
        this.phase = 0;
        this.isSmiling = false;
        this.blinkTimer = 0;
        this.pulseIntensity = 0;

        this.resize();
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width || 220;
        this.height = rect.height || 150;
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
        this.phase = (this.phase + 0.03) % (Math.PI * 2);
        this.isSmiling = !!smile;
        // pulseIntensity peaks on systolic phase
        this.pulseIntensity = Math.max(0, pulsePhase || 0);
        this.breathWave = breathWave || 0;
    }

    draw() {
        const { ctx, width, height } = this;
        if (!ctx || !width || !height) return;

        // Dark scanner background
        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        // Subtle vertical motion from breathing
        const cy = height / 2 + (this.breathWave || 0) * 3;

        // Draw background grid lines (cyber medical scanner)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // 1. Forehead & Cheek rPPG Perfusion Heatmap (Optical vascular blood flow)
        this.drawPerfusionHeatmap(cx, cy);

        // 2. Holographic Face Wireframe / Mesh
        this.drawFaceMesh(cx, cy);

        // 3. Scanner Reticle & HUD Overlay
        this.drawScannerOverlay(width, height);
    }

    drawPerfusionHeatmap(cx, cy) {
        const { ctx } = this;
        const pulse = this.pulseIntensity; // 0 to 1

        // Forehead rPPG Region of Interest (ROI)
        const fhGrad = ctx.createRadialGradient(cx, cy - 25, 2, cx, cy - 25, 28);
        fhGrad.addColorStop(0, `rgba(247, 37, 133, ${0.25 + pulse * 0.45})`);
        fhGrad.addColorStop(0.7, `rgba(0, 245, 212, ${0.15 + pulse * 0.2})`);
        fhGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = fhGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 25, 28, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Left & Right Cheek ROIs
        [-22, 22].forEach(offset => {
            const chkGrad = ctx.createRadialGradient(cx + offset, cy + 5, 2, cx + offset, cy + 5, 18);
            chkGrad.addColorStop(0, `rgba(247, 37, 133, ${0.2 + pulse * 0.4})`);
            chkGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = chkGrad;
            ctx.beginPath();
            ctx.arc(cx + offset, cy + 5, 16, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawFaceMesh(cx, cy) {
        const { ctx } = this;
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.65)';
        ctx.fillStyle = 'rgba(0, 245, 212, 0.85)';
        ctx.lineWidth = 1.2;

        // Face Oval Outline
        ctx.beginPath();
        ctx.ellipse(cx, cy, 38, 52, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Eyes
        this.blinkTimer = (this.blinkTimer + 1) % 180;
        const isBlinking = this.blinkTimer > 172;

        [-15, 15].forEach(xOff => {
            ctx.beginPath();
            if (isBlinking) {
                ctx.moveTo(cx + xOff - 7, cy - 8);
                ctx.lineTo(cx + xOff + 7, cy - 8);
                ctx.stroke();
            } else {
                ctx.ellipse(cx + xOff, cy - 8, 7, 4, 0, 0, Math.PI * 2);
                ctx.stroke();
                // Pupil
                ctx.beginPath();
                ctx.arc(cx + xOff, cy - 8, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Eyebrows
        [-15, 15].forEach((xOff, idx) => {
            ctx.beginPath();
            const browY = this.isSmiling ? cy - 18 : cy - 16;
            ctx.moveTo(cx + xOff - 8, browY);
            ctx.quadraticCurveTo(cx + xOff, browY - 3, cx + xOff + 8, browY);
            ctx.stroke();
        });

        // Nose Bridge & Tip
        ctx.beginPath();
        ctx.moveTo(cx, cy - 6);
        ctx.lineTo(cx - 2, cy + 10);
        ctx.lineTo(cx + 3, cy + 10);
        ctx.stroke();

        // Mouth (Smile animation)
        ctx.beginPath();
        if (this.isSmiling) {
            ctx.strokeStyle = '#f72585';
            ctx.lineWidth = 1.8;
            ctx.moveTo(cx - 16, cy + 24);
            ctx.quadraticCurveTo(cx, cy + 36, cx + 16, cy + 24);
            ctx.stroke();
        } else {
            ctx.moveTo(cx - 12, cy + 26);
            ctx.quadraticCurveTo(cx, cy + 28, cx + 12, cy + 26);
            ctx.stroke();
        }

        // Facial Landmark Nodes (dots)
        const landmarks = [
            [cx - 38, cy], [cx + 38, cy], [cx, cy - 52], [cx, cy + 52],
            [cx - 15, cy - 25], [cx + 15, cy - 25], [cx - 22, cy + 5], [cx + 22, cy + 5]
        ];
        landmarks.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#00f5d4';
            ctx.fill();
        });

        ctx.restore();
    }

    drawScannerOverlay(w, h) {
        const { ctx } = this;
        ctx.save();
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(0, 245, 212, 0.7)';

        ctx.fillText('DEMO FEED: rPPG OPTICAL ROI', 8, 14);
        ctx.fillText('SIGNAL CONFIDENCE: 98.6%', 8, h - 8);

        // Corner bracket targets
        const bSize = 8;
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.4)';
        ctx.lineWidth = 1.2;

        // Top-left
        ctx.beginPath(); ctx.moveTo(6, 6 + bSize); ctx.lineTo(6, 6); ctx.lineTo(6 + bSize, 6); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(w - 6 - bSize, 6); ctx.lineTo(w - 6, 6); ctx.lineTo(w - 6, 6 + bSize); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(6, h - 6 - bSize); ctx.lineTo(6, h - 6); ctx.lineTo(6 + bSize, h - 6); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(w - 6 - bSize, h - 6); ctx.lineTo(w - 6, h - 6); ctx.lineTo(w - 6, h - 6 - bSize); ctx.stroke();

        ctx.restore();
    }

    destroy() {
        this.stop();
    }
}

module.exports = { DemoFaceCanvas };
