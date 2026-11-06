// src/visuals/bioVisualizer.js - Luminous Bio-Acoustic 60fps Canvas Visualizer
'use strict';

class BioVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        if (!canvas) {
            console.error('[BioVisualizer] Canvas element not provided');
            return;
        }
        this.ctx = canvas.getContext('2d');
        this.animId = null;

        // Visualizer Dimensions
        this.width = 1200;
        this.height = 800;
        this.dpr = window.devicePixelRatio || 1;

        // Waveform circular buffers (240 samples for smooth high-res trace)
        this.maxSamples = 240;
        this.pulseBuffer = new Array(this.maxSamples).fill(0);
        this.breathBuffer = new Array(this.maxSamples).fill(0);

        // Particle System (Bioluminescent spores)
        this.numParticles = 64;
        this.particles = [];
        this.initParticles();

        // Animation Dynamics
        this.time = 0;
        this.shockwaves = [];
        this.currentRespiration = 0; // -1 (exhale) to +1 (inhale)
        this.currentBpm = 72;
        this.currentHrv = 52;
        this.beatScale = 1.0;
        this.lastHeartbeatTime = 0;

        // Resize Handling
        this.resize = this.resize.bind(this);
        window.addEventListener('resize', this.resize);

        if (window.ResizeObserver && canvas.parentElement) {
            this.resizeObserver = new ResizeObserver(() => this.resize());
            this.resizeObserver.observe(canvas.parentElement);
        }

        this.resize();
    }

    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 100 + Math.random() * 320;
            this.particles.push({
                x: 0,
                y: 0,
                baseDist: dist,
                dist: dist,
                angle: angle,
                angularSpeed: (Math.random() - 0.5) * 0.012 + 0.004,
                radius: Math.random() * 2.8 + 1.2,
                baseAlpha: Math.random() * 0.45 + 0.35,
                colorType: i % 3 === 0 ? 'pink' : (i % 3 === 1 ? 'cyan' : 'purple'),
            });
        }
    }

    resize() {
        if (!this.canvas) return;
        this.dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : this.canvas.getBoundingClientRect();
        this.width = Math.max(rect.width || window.innerWidth || 1024, 600);
        this.height = Math.max(rect.height || window.innerHeight || 768, 500);

        this.canvas.width = Math.floor(this.width * this.dpr);
        this.canvas.height = Math.floor(this.height * this.dpr);

        if (this.ctx) {
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }
    }

    start() {
        if (this.animId || !this.ctx) return;
        const loop = () => {
            try {
                this.update();
                this.draw();
            } catch (err) {
                console.error('[BioVisualizer] Render loop error:', err);
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

    triggerHeartbeat(bpm) {
        this.currentBpm = bpm || this.currentBpm;
        this.beatScale = 1.22; // punch heartbeat impulse
        this.lastHeartbeatTime = Date.now();

        // Spawn glowing shockwave ring
        this.shockwaves.push({
            radius: 50,
            maxRadius: Math.min(this.width, this.height) * 0.52,
            alpha: 0.9,
            speed: 4.2 + (this.currentBpm / 80) * 1.5,
            hue: this.shockwaves.length % 2 === 0 ? '#f72585' : '#00f5d4'
        });
    }

    pushMetrics({ pulseSample, breathSample, respirationNormalized, bpm, hrv }) {
        if (typeof pulseSample === 'number' && !isNaN(pulseSample)) {
            this.pulseBuffer.push(pulseSample);
            this.pulseBuffer.shift();
        }
        if (typeof breathSample === 'number' && !isNaN(breathSample)) {
            this.breathBuffer.push(breathSample);
            this.breathBuffer.shift();
        }
        if (typeof respirationNormalized === 'number' && !isNaN(respirationNormalized)) {
            this.currentRespiration = respirationNormalized;
        }
        if (bpm && !isNaN(bpm)) this.currentBpm = bpm;
        if (hrv && !isNaN(hrv)) this.currentHrv = hrv;
    }

    update() {
        this.time += 0.02;

        // Smoothly decay heartbeat pulse punch
        this.beatScale += (1.0 - this.beatScale) * 0.08;

        // Respiration swell: 0 (exhaled) to 1 (inhaled)
        const breathMod = (this.currentRespiration + 1) * 0.5;

        // Update shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed;
            sw.alpha *= 0.955;
            if (sw.alpha < 0.015 || sw.radius > sw.maxRadius) {
                this.shockwaves.splice(i, 1);
            }
        }

        // Update particle orbits around center
        const cx = this.width / 2;
        const cy = (this.height / 2) - 30; // slightly above vertical midpoint

        this.particles.forEach(p => {
            p.angle += p.angularSpeed * (1 + breathMod * 0.4);
            const tidalDist = p.baseDist * (0.85 + breathMod * 0.35);
            p.dist += (tidalDist - p.dist) * 0.05;

            p.x = cx + Math.cos(p.angle) * p.dist * 1.35; // elliptical width
            p.y = cy + Math.sin(p.angle) * p.dist * 0.95;
        });
    }

    draw() {
        const { ctx, width, height } = this;
        if (!ctx || !width || !height) return;

        // Ensure canvas transform matches DPR
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        // 1. Background Ambient Gradient with Deep Bio-Navy Hue
        const bgGrad = ctx.createRadialGradient(width / 2, height / 2 - 40, 50, width / 2, height / 2, width * 0.65);
        bgGrad.addColorStop(0, '#0c1220');
        bgGrad.addColorStop(0.5, '#080d16');
        bgGrad.addColorStop(1, '#05070b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        const cy = (height / 2) - 40;

        // 2. Draw Bioluminescent Particles Swarm
        this.drawParticles();

        // 3. Draw Expanding Cardiac Shockwaves
        this.drawShockwaves(cx, cy);

        // 4. Draw Central Bio-Acoustic Mandala / Living Core
        this.drawBioMandala(cx, cy);

        // 5. Draw Prominent Elevated Oscilloscopes (Pulse & Respiration)
        this.drawElevatedOscilloscopes();
    }

    drawParticles() {
        const { ctx } = this;
        const breathMod = (this.currentRespiration + 1) * 0.5;

        ctx.save();
        this.particles.forEach(p => {
            const alpha = p.baseAlpha * (0.6 + breathMod * 0.4);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * (0.9 + breathMod * 0.3), 0, Math.PI * 2);

            let strokeColor = 'rgba(0, 245, 212, ';
            let glow = '#00f5d4';
            if (p.colorType === 'pink') {
                strokeColor = 'rgba(247, 37, 133, ';
                glow = '#f72585';
            } else if (p.colorType === 'purple') {
                strokeColor = 'rgba(123, 44, 191, ';
                glow = '#7b2cbf';
            }

            ctx.fillStyle = strokeColor + alpha + ')';
            ctx.shadowColor = glow;
            ctx.shadowBlur = 10;
            ctx.fill();
        });
        ctx.restore();
    }

    drawShockwaves(cx, cy) {
        const { ctx } = this;
        ctx.save();
        this.shockwaves.forEach(sw => {
            ctx.beginPath();
            ctx.arc(cx, cy, sw.radius, 0, Math.PI * 2);
            ctx.strokeStyle = sw.hue === '#f72585'
                ? `rgba(247, 37, 133, ${sw.alpha * 0.8})`
                : `rgba(0, 245, 212, ${sw.alpha * 0.8})`;
            ctx.lineWidth = 2.2;
            ctx.shadowColor = sw.hue;
            ctx.shadowBlur = 16;
            ctx.stroke();
        });
        ctx.restore();
    }

    drawBioMandala(cx, cy) {
        const { ctx, time } = this;
        const breathMod = (this.currentRespiration + 1) * 0.5; // 0 to 1
        const coreExpansion = 95 + breathMod * 36;
        const scale = this.beatScale;
        const r = coreExpansion * scale;

        ctx.save();

        // A. Large Bioluminescent Ambient Aura
        const auraGrad = ctx.createRadialGradient(cx, cy, Math.max(15, r * 0.2), cx, cy, r * 2.2);
        auraGrad.addColorStop(0, 'rgba(0, 245, 212, 0.38)');
        auraGrad.addColorStop(0.35, 'rgba(123, 44, 191, 0.22)');
        auraGrad.addColorStop(0.7, 'rgba(247, 37, 133, 0.12)');
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // B. Outer Sacred-Geometry Petal Ring (Audio Harmonic Ring)
        const petals = 12;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time * 0.18);
        for (let i = 0; i < petals; i++) {
            const theta = (i / petals) * Math.PI * 2;
            const pRadius = r * 1.35 + Math.sin(time * 2 + i) * 6;
            const px = Math.cos(theta) * pRadius;
            const py = Math.sin(theta) * pRadius;

            ctx.beginPath();
            ctx.arc(px, py, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 245, 212, 0.85)' : 'rgba(247, 37, 133, 0.85)';
            ctx.shadowColor = i % 2 === 0 ? '#00f5d4' : '#f72585';
            ctx.shadowBlur = 12;
            ctx.fill();
        }
        ctx.restore();

        // C. Concentric Orbital Rings (Luminous Cyan & Coral)
        // Primary Cyan Ring
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.9)';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 22;
        ctx.stroke();

        // Secondary Coral Ring (HRV Resonance Ring)
        const hrvOffset = (this.currentHrv / 60) * 16;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(20, r - 22 + hrvOffset), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(247, 37, 133, 0.85)';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = '#f72585';
        ctx.shadowBlur = 18;
        ctx.stroke();

        // Inner Pulsing Core Orb
        const innerGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, Math.max(10, r * 0.45));
        innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        innerGrad.addColorStop(0.4, 'rgba(0, 245, 212, 0.7)');
        innerGrad.addColorStop(1, 'rgba(123, 44, 191, 0.1)');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // D. Rotating Reticle Notches on Core
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-time * 0.35);
        for (let i = 0; i < 8; i++) {
            const rot = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(rot) * (r * 0.75), Math.sin(rot) * (r * 0.75));
            ctx.lineTo(Math.cos(rot) * (r * 0.88), Math.sin(rot) * (r * 0.88));
            ctx.strokeStyle = 'rgba(0, 245, 212, 0.75)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();

        ctx.restore();
    }

    drawElevatedOscilloscopes() {
        const { ctx, width, height } = this;

        // Position oscilloscopes in the lower-middle zone,
        // leaving the left HUD area clear and the bottom 70px clear for the audio bar!
        const leftMargin = width > 1050 ? 285 : 24;
        const rightMargin = 28;
        const boxWidth = width - leftMargin - rightMargin;
        const startX = leftMargin;

        const yPulse = height * 0.58;
        const yBreath = height * 0.73;

        // Oscilloscope 1: Arterial Pulse (rPPG)
        this.renderWaveformPanel({
            buffer: this.pulseBuffer,
            x: startX,
            y: yPulse,
            w: boxWidth,
            h: 60,
            strokeColor: '#f72585',
            glowColor: 'rgba(247, 37, 133, 0.8)',
            label: `♥ ARTERIAL PULSE (rPPG) — ${this.currentBpm} BPM`,
            sublabel: 'Systolic Rise · Dicrotic Notch · Microvascular Flow',
            unitText: 'rPPG ΔI'
        });

        // Oscilloscope 2: Respiration Cadence
        const breathRate = 14;
        const breathState = this.currentRespiration > 0.1 ? 'Inhaling (Swell)' : 'Exhaling (Warm Lowpass)';
        this.renderWaveformPanel({
            buffer: this.breathBuffer,
            x: startX,
            y: yBreath,
            w: boxWidth,
            h: 52,
            strokeColor: '#00f5d4',
            glowColor: 'rgba(0, 245, 212, 0.8)',
            label: `≋ RESPIRATION TIDAL WAVE — ${breathRate} RPM · ${breathState}`,
            sublabel: 'Thoracic Cadence · Resonant Filter Modulation',
            unitText: 'CHEST DISPLACEMENT'
        });
    }

    renderWaveformPanel({ buffer, x, y, w, h, strokeColor, glowColor, label, sublabel, unitText }) {
        const { ctx } = this;
        const len = buffer.length;
        if (len < 2) return;

        ctx.save();

        // 1. Glassmorphic Track Panel Background
        ctx.fillStyle = 'rgba(12, 17, 28, 0.62)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;

        // Rounded rect for the oscilloscope container
        this.roundRect(ctx, x, y - 24, w, h + 30, 10);
        ctx.fill();
        ctx.stroke();

        // 2. Horizontal Center Grid Line
        const baselineY = y + (h / 2);
        ctx.beginPath();
        ctx.moveTo(x + 12, baselineY);
        ctx.lineTo(x + w - 12, baselineY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 3. Render Waveform Trace
        ctx.beginPath();
        const step = (w - 24) / (len - 1);
        for (let i = 0; i < len; i++) {
            const val = buffer[i] || 0;
            const ptX = x + 12 + (i * step);
            const ptY = baselineY - (val * (h * 0.42));

            if (i === 0) {
                ctx.moveTo(ptX, ptY);
            } else {
                ctx.lineTo(ptX, ptY);
            }
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.4;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;
        ctx.stroke();

        // 4. Glowing Sweep Head (Current Live Sample)
        const lastVal = buffer[len - 1] || 0;
        const headX = x + w - 12;
        const headY = baselineY - (lastVal * (h * 0.42));

        ctx.beginPath();
        ctx.arc(headX, headY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 14;
        ctx.fill();

        // 5. Panel Labels & Metadata
        ctx.shadowBlur = 0;
        ctx.font = '600 11px "Inter", sans-serif';
        ctx.fillStyle = strokeColor;
        ctx.fillText(label, x + 14, y - 8);

        const labelWidth = ctx.measureText(label).width;
        ctx.font = '400 9.5px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(180, 195, 215, 0.75)';
        if (x + 14 + labelWidth + 18 + 180 < x + w - 120) {
            ctx.fillText(sublabel, x + 14 + labelWidth + 18, y - 8);
        }

        ctx.font = '600 9px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillText(unitText, x + w - 120, y - 8);

        ctx.restore();
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    destroy() {
        this.stop();
        window.removeEventListener('resize', this.resize);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}

module.exports = { BioVisualizer };
