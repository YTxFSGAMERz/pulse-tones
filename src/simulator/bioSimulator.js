// src/simulator/bioSimulator.js - High-Fidelity Synthetic Physiological Waveform Generator
'use strict';

class BioSimulator {
    constructor(onMetricsCallback) {
        this.onMetrics = onMetricsCallback;
        this.timer = null;
        this.startTime = Date.now();
        this.isRunning = false;

        // Base physiological simulation state
        this.baseBpm = 72;
        this.baseRespirationRpm = 14;
        this.baseHrv = 52;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.startTime = Date.now();

        // Generate metrics at 30Hz (~33ms) matching camera frame-rate
        this.timer = setInterval(() => {
            this.tick();
        }, 33);
    }

    stop() {
        this.isRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    tick() {
        const elapsedSec = (Date.now() - this.startTime) / 1000;

        // 1. Respiratory Waveform: Sinusoidal breathing rhythm at 14 breaths/min (freq = 14/60 Hz ~ 0.233 Hz)
        const breathFreq = this.baseRespirationRpm / 60;
        const breathWave = Math.sin(2 * Math.PI * breathFreq * elapsedSec);

        // 2. Cardiac / Pulse Waveform: Periodic photoplethysmogram (PPG) with systolic & dicrotic notch
        // Respiratory Sinus Arrhythmia (RSA): Heart rate gently accelerates during inhalation, slows on exhalation
        const rsaModulation = breathWave * 3.5;
        const instantBpm = Math.round(this.baseBpm + rsaModulation);
        const cardiacFreq = instantBpm / 60;
        const phase = (elapsedSec * cardiacFreq) % 1;

        // Realistic rPPG waveform synthesis
        let pulseWave = 0;
        if (phase < 0.25) {
            // Systolic rise
            pulseWave = Math.sin((phase / 0.25) * (Math.PI / 2));
        } else if (phase < 0.5) {
            // Dicrotic notch descent & bounce
            pulseWave = Math.cos(((phase - 0.25) / 0.25) * Math.PI) * 0.35 + 0.25;
        } else {
            // Diastolic decay
            pulseWave = Math.exp(-(phase - 0.5) * 4) * 0.4;
        }

        // 3. HRV variation
        const instantHrv = Math.round(this.baseHrv + Math.sin(elapsedSec * 0.1) * 15);

        // 4. Occasional expression detection (e.g. smile every ~25 seconds)
        const isSmiling = Math.sin(elapsedSec * 0.25) > 0.88;

        if (this.onMetrics) {
            this.onMetrics({
                pulseRate: instantBpm,
                pulseWave: pulseWave * 2 - 1, // normalized -1 to 1
                respirationRate: this.baseRespirationRpm,
                respirationWave: breathWave,
                hrvRmssd: instantHrv,
                expression: {
                    smile: isSmiling,
                    valence: isSmiling ? 0.8 : 0.1
                },
                validation: {
                    code: 0,
                    text: 'Simulation Active (Synthesizing rPPG signals)'
                }
            });
        }
    }
}

module.exports = { BioSimulator };
