// src/audio/bioSynth.js - PulseTones Procedural Web Audio Engine
'use strict';

class BioSynth {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isMuted = false;
        this.isRunning = false;
        this.preset = 'celestial';

        // Synthesis Nodes
        this.droneOscs = [];
        this.droneGain = null;
        this.breathFilter = null;
        this.ambientDelay = null;
        this.delayFeedback = null;
        this.hrvGain = null;
        this.hrvOscs = [];

        // Physiological State Cache
        this.currentBpm = 72;
        this.currentRespirationRate = 14;
        this.currentHrv = 45;
        this.lastBeatTime = 0;
        this.beatIntervalMs = (60 / 72) * 1000;
        this.heartbeatTimer = null;
        this.lastSmileTrigger = 0;

        // Callback for UI beat pulse
        this.onHeartbeat = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // Master Output with Soft Limiting / Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // Breath-controlled Low-Pass Filter (Ladder style)
        this.breathFilter = this.ctx.createBiquadFilter();
        this.breathFilter.type = 'lowpass';
        this.breathFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
        this.breathFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

        // Ambient Stereo Delay / Space Unit
        this.ambientDelay = this.ctx.createDelay();
        this.ambientDelay.delayTime.setValueAtTime(0.42, this.ctx.currentTime);

        this.delayFeedback = this.ctx.createGain();
        this.delayFeedback.gain.setValueAtTime(0.38, this.ctx.currentTime);

        // Wire delay feedback loop
        this.breathFilter.connect(this.ambientDelay);
        this.ambientDelay.connect(this.delayFeedback);
        this.delayFeedback.connect(this.ambientDelay);
        this.ambientDelay.connect(this.masterGain);
        this.breathFilter.connect(this.masterGain);

        // Ambient Drone Chord Bus
        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.droneGain.connect(this.breathFilter);

        // HRV Harmonic Layer Bus
        this.hrvGain = this.ctx.createGain();
        this.hrvGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        this.hrvGain.connect(this.breathFilter);

        this.startDronePad();
        this.startHeartbeatLoop();
        this.isRunning = true;
    }

    startDronePad() {
        if (!this.ctx) return;
        this.stopDronePad();

        // Preset note collections (frequencies in Hz)
        const PRESETS = {
            celestial: [130.81, 196.00, 261.63, 311.13, 392.00], // C3, G3, C4, Eb4, G4 (C Minor 9)
            forest:    [146.83, 220.00, 293.66, 329.63, 440.00], // D3, A3, D4, E4, A4 (D Pentatonic)
            ocean:     [110.00, 164.81, 220.00, 329.63, 493.88], // A2, E3, A3, E4, B4 (A Ethereal Sus2)
        };

        const freqs = PRESETS[this.preset] || PRESETS.celestial;

        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Warm detuned triangle/sine blend
            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            // Subtle micro-detune for organic lushness (+/- 2 to 4 cents)
            const detune = (idx - 2) * 3.2;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.detune.setValueAtTime(detune, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.18 / freqs.length, this.ctx.currentTime);

            osc.connect(gain);
            gain.connect(this.droneGain);
            osc.start();

            this.droneOscs.push(osc);
        });

        // HRV Chime Drone (high sparkling octave)
        const hrvNotes = [523.25, 659.25, 783.99]; // C5, E5, G5
        hrvNotes.forEach((freq) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.04, this.ctx.currentTime);
            osc.connect(g);
            g.connect(this.hrvGain);
            osc.start();
            this.hrvOscs.push(osc);
        });
    }

    stopDronePad() {
        this.droneOscs.forEach(osc => {
            try { osc.stop(); osc.disconnect(); } catch (e) {}
        });
        this.droneOscs = [];
        this.hrvOscs.forEach(osc => {
            try { osc.stop(); osc.disconnect(); } catch (e) {}
        });
        this.hrvOscs = [];
    }

    startHeartbeatLoop() {
        const scheduleNextPulse = () => {
            if (!this.isRunning) return;
            this.playHeartbeatThud();
            const jitter = (Math.random() - 0.5) * 15; // natural physiological micro-variation
            const nextInterval = Math.max(400, Math.min(1800, this.beatIntervalMs + jitter));
            this.heartbeatTimer = setTimeout(scheduleNextPulse, nextInterval);
        };
        scheduleNextPulse();
    }

    playHeartbeatThud() {
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;

        // Sub-bass thump (sine drop 56 Hz -> 36 Hz)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(56, now);
        osc.frequency.exponentialRampToValueAtTime(36, now + 0.16);

        // Volume envelope: punchy initial attack, warm organic decay
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.45, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.24);

        if (this.onHeartbeat) {
            this.onHeartbeat(this.currentBpm);
        }
    }

    /**
     * Triggered when a smile / positive facial expression is detected
     */
    triggerSmileFlourish() {
        if (!this.ctx || this.isMuted) return;
        const now = Date.now();
        if (now - this.lastSmileTrigger < 1500) return; // rate limit flourishes
        this.lastSmileTrigger = now;

        const audioNow = this.ctx.currentTime;
        const chimeNotes = [783.99, 880.00, 1046.50, 1318.51]; // G5, A5, C6, E6
        
        chimeNotes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioNow + idx * 0.08);

            gain.gain.setValueAtTime(0.001, audioNow + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.12, audioNow + idx * 0.08 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, audioNow + idx * 0.08 + 0.7);

            osc.connect(gain);
            gain.connect(this.ambientDelay);

            osc.start(audioNow + idx * 0.08);
            osc.stop(audioNow + idx * 0.08 + 0.75);
        });
    }

    /**
     * Update synthesis parameters based on incoming live physiological metrics
     */
    updateMetrics({ pulseRate, respirationWave, respirationRate, hrvRmssd, expression }) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Update Pulse Rate -> modulates heartbeat timing
        if (pulseRate && pulseRate > 40 && pulseRate < 180) {
            this.currentBpm = pulseRate;
            this.beatIntervalMs = (60 / pulseRate) * 1000;
        }

        // 2. Respiration Wave -> modulates continuous lowpass filter cutoff
        // respirationWave is typically a continuous normalized trace (-1.0 to 1.0 or 0 to 1.0)
        if (typeof respirationWave === 'number') {
            const normalized = Math.max(0, Math.min(1, (respirationWave + 1) / 2));
            // Filter cutoff sweeps between 220 Hz (exhale calm) and 2400 Hz (deep inhale brightness)
            const targetFreq = 220 + Math.pow(normalized, 1.8) * 2180;
            this.breathFilter.frequency.setTargetAtTime(targetFreq, now, 0.08);
        }

        // 3. Respiration Rate -> modulates ambient delay feedback length
        if (respirationRate && respirationRate > 4 && respirationRate < 40) {
            this.currentRespirationRate = respirationRate;
            // Slower breathing increases space and decay depth
            const delayTime = Math.max(0.25, Math.min(0.65, (60 / respirationRate) * 0.1));
            this.ambientDelay.delayTime.setTargetAtTime(delayTime, now, 0.5);
        }

        // 4. HRV (RMSSD in ms) -> modulates harmonic shimmer depth
        if (typeof hrvRmssd === 'number' && hrvRmssd > 0) {
            this.currentHrv = hrvRmssd;
            // High HRV (e.g. 50-100ms) = higher harmony volume, deep peacefulness
            // Low HRV (e.g. 10-25ms) = subdued upper harmonics, grounding root focus
            const targetHrvGain = Math.max(0.02, Math.min(0.35, (hrvRmssd / 80) * 0.3));
            this.hrvGain.gain.setTargetAtTime(targetHrvGain, now, 0.3);
        }

        // 5. Expression classification
        if (expression && (expression.smile || expression.valence > 0.4)) {
            this.triggerSmileFlourish();
        }
    }

    setPreset(name) {
        if (this.preset === name) return;
        this.preset = name;
        if (this.isRunning) {
            this.startDronePad();
        }
    }

    setVolume(value) { // 0.0 to 1.0
        if (!this.masterGain || !this.ctx) return;
        const gain = Math.max(0, Math.min(1, value));
        this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : gain, this.ctx.currentTime, 0.05);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (!this.masterGain || !this.ctx) return this.isMuted;
        const target = this.isMuted ? 0 : 0.7;
        this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
        return this.isMuted;
    }

    destroy() {
        this.isRunning = false;
        if (this.heartbeatTimer) {
            clearTimeout(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        this.stopDronePad();
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
        }
    }
}

module.exports = { BioSynth };
