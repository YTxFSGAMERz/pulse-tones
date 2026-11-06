// src/visuals/bioVisualizer.js - Bioluminescent 60fps Canvas Visualizer
'use strict';

class BioVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.animId = null;

        // Waveform buffers (circular arrays)
        this.maxSamples = 240;
        this.pulseBuffer = new Array(this.maxSamples).fill(0);
        this.breathBuffer = new Array(this.maxSamples).fill(0);

        // Particle System
        this.numParticles = 48;
        this.particles = [];
        this.initParticles();

        // Shockwaves & Heartbeat
        this.shockwaves = [];
        this.currentRespiration = 0; // -1 to 1
        this.currentBpm = 72;
        this.currentHrv = 45;
        this.pulsePhase = 0;

        this.resize = this.resize.bind(this.resize);
        window.addEventListener('resize', this.resize);
        this.resize();
    }

    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.numParticles; i++) {
            this.particles.push({
                x: Math.random() * 800,
                y: Math.random() * 500,
                radius: Math.random() * 2.5 + 1.2,
                baseAlpha: Math.random() * 0.5 + 0.3,
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.4 + 0.2,
                color: i % 2 === 0 ? 'rgba(0, 245, 212, ' : 'rgba(247, 37, 133, '
            });
        }
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.resetTransform?.();
        this.ctx.scale(dpr, dpr);
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

    triggerHeartbeat(bpm) {
        this.currentBpm = bpm || this.currentBpm;
        this.shockwaves.push({
            radius: 20,
            maxRadius: Math.min(this.width, this.height) * 0.45,
            alpha: 0.85,
            speed: 3.8
        });
    }

    pushMetrics({ pulseSample, breathSample, respirationNormalized, bpm, hrv }) {
        if (typeof pulseSample === 'number') {
            this.pulseBuffer.push(pulseSample);
            this.pulseBuffer.shift();
        }
        if (typeof breathSample === 'number') {
            this.breathBuffer.push(breathSample);
            this.breathBuffer.shift();
        }
        if (typeof respirationNormalized === 'number') {
            this.currentRespiration = respirationNormalized;
        }
        if (bpm) this.currentBpm = bpm;
        if (hrv) this.currentHrv = hrv;
    }

    draw() {
        const { ctx, width, height } = this;
        if (!width || !height) return;

        // Dark ambient background fade
        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;

        // 1. Draw Floating Bioluminescent Spores / Particles
        this.drawParticles(centerX, centerY);

        // 2. Draw Respiration & Heartbeat Shockwave Auras
        this.drawShockwaves(centerX, centerY);

        // 3. Central Bioluminescent Living Heart/Lungs Orb
        this.drawCentralBioOrb(centerX, centerY);

        // 4. Waveforms (Pulse & Breathing) at the lower zone
        this.drawWaveforms();
    }

    drawParticles(cx, cy) {
        const { ctx, width, height } = this;
        const breathMod = (this.currentRespiration + 1) * 0.5; // 0 to 1

        this.particles.forEach(p => {
            p.angle += 0.008 * (1 + breathMod);
            p.x += Math.cos(p.angle) * p.speed * (0.8 + breathMod * 1.2);
            p.y += Math.sin(p.angle) * p.speed * (0.8 + breathMod * 1.2);

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            const alpha = p.baseAlpha * (0.5 + breathMod * 0.5);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * (0.9 + breathMod * 0.4), 0, Math.PI * 2);
            ctx.fillStyle = p.color + alpha + ')';
            ctx.shadowColor = p.color.includes('245') ? '#00f5d4' : '#f72585';
            ctx.shadowBlur = 8;
            ctx.fill();
        });
        ctx.shadowBlur = 0;
    }

    drawShockwaves(cx, cy) {
        const { ctx } = this;
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed;
            sw.alpha *= 0.96;

            if (sw.alpha < 0.02 || sw.radius > sw.maxRadius) {
                this.shockwaves.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, sw.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(247, 37, 133, ${sw.alpha * 0.6})`;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#f72585';
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.restore();
        }
    }

    drawCentralBioOrb(cx, cy) {
        const { ctx } = this;
        // Breathing modulates radius expansion
        const breathExpansion = (this.currentRespiration + 1) * 22; // 0 to 44px
        const baseRadius = 60 + breathExpansion;

        // Outer Glow Aura
        const auraGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, baseRadius * 1.8);
        auraGrad.addColorStop(0, 'rgba(0, 245, 212, 0.45)');
        auraGrad.addColorStop(0.5, 'rgba(123, 44, 191, 0.25)');
        auraGrad.addColorStop(1, 'rgba(10, 13, 20, 0)');

        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Inner Core Bioluminescent Ring
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.85)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 20;
        ctx.stroke();

        // Secondary harmonic ring (HRV tuned)
        const hrvMod = Math.min(30, this.currentHrv * 0.4);
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius - 14 + hrvMod * 0.2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(247, 37, 133, 0.7)';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#f72585';
        ctx.shadowBlur = 14;
        ctx.stroke();

        ctx.restore();
    }

    drawWaveforms() {
        const { ctx, width, height } = this;
        const waveHeight = 70;
        const startY1 = height - 90; // Pulse Waveform bottom
        const startY2 = height - 25; // Breath Waveform bottom

        // 1. Arterial Pressure / Pulse Waveform (Coral/Pink)
        this.renderTraceLine(
            this.pulseBuffer,
            startY1,
            waveHeight,
            'rgba(247, 37, 133, 0.95)',
            '#f72585',
            'PULSE WAVEFORM (rPPG)'
        );

        // 2. Respiration Movement Waveform (Cyan)
        this.renderTraceLine(
            this.breathBuffer,
            startY2,
            waveHeight * 0.8,
            'rgba(0, 245, 212, 0.95)',
            '#00f5d4',
            'RESPIRATION CADENCE'
        );
    }

    renderTraceLine(buffer, baselineY, amplitude, strokeColor, shadowColor, label) {
        const { ctx, width } = this;
        const len = buffer.length;
        if (len < 2) return;

        ctx.save();
        ctx.beginPath();

        const step = width / (len - 1);
        for (let i = 0; i < len; i++) {
            const val = buffer[i]; // range -1 to 1 or normalized
            const y = baselineY - (val * amplitude * 0.5);
            const x = i * step;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Label
        ctx.font = '10px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = strokeColor;
        ctx.fillText(label, 16, baselineY - amplitude * 0.5 - 6);

        ctx.restore();
    }

    destroy() {
        this.stop();
        window.removeEventListener('resize', this.resize);
    }
}

module.exports = { BioVisualizer };
