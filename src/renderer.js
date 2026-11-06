// src/renderer.js - Main Renderer Controller for PulseTones
'use strict';

const {
    SmartSpectraSDK,
    ProcessingStatus,
    ValidationCode,
    breathingMetrics,
    cardioMetrics,
    faceMetrics,
} = require('@smartspectra/node-sdk/renderer');

const { decodeMetrics } = require('@smartspectra/node-sdk/messages');
const { BioSynth } = require('./audio/bioSynth');
const { BioVisualizer } = require('./visuals/bioVisualizer');
const { BioSimulator } = require('./simulator/bioSimulator');
const { DemoFaceCanvas } = require('./visuals/demoFaceCanvas');

// DOM Element Handles
let els = {};

// Core Engines
let sdk = null;
let synth = null;
let visualizer = null;
let simulator = null;
let demoFace = null;
let currentApiKey = '';
let isLiveCameraRunning = false;
let isSimulationRunning = false;

// Validation Code Human Descriptions
const VALIDATION_MESSAGES = {
    [ValidationCode.kOk]:                 'Signal locked — Breathe naturally',
    [ValidationCode.kNoFaceFound]:        'No face detected. Please face the camera',
    [ValidationCode.kMultipleFacesFound]: 'Multiple faces visible. Only one person allowed',
    [ValidationCode.kFaceNotCentered]:    'Please center your face inside the target oval',
    [ValidationCode.kTooDark]:            'Lighting is too dim. Please increase light',
    [ValidationCode.kTooBright]:          'Lighting is overexposed. Avoid harsh glare',
    [ValidationCode.kChestNotVisible]:    'Keep upper chest visible for respiration',
    [ValidationCode.kCameraTuning]:       'Calibrating camera exposure & focus...',
    [ValidationCode.kFrameRateTooLow]:    'Camera frame rate dropped below threshold',
    [ValidationCode.kExcessiveMotion]:    'Excessive movement. Please remain still',
    [ValidationCode.kFaceTooClose]:       'Face too close. Please move slightly back',
    [ValidationCode.kFaceTooFar]:         'Face too far. Please move closer',
    [ValidationCode.kFaceNotForward]:     'Please face directly forward',
};

async function initApp() {
    els = {
        canvas:            document.getElementById('bio-canvas'),
        demoFaceCanvas:    document.getElementById('demo-face-canvas'),
        preview:           document.getElementById('preview'),
        cameraPlaceholder: document.getElementById('camera-placeholder'),
        statusBadge:       document.getElementById('status-badge'),
        statusText:        document.getElementById('status-text'),
        btnToggleCamera:   document.getElementById('btn-toggle-camera'),
        btnCameraText:     document.getElementById('btn-camera-text'),
        btnQuickSwitch:    document.getElementById('btn-quick-switch'),
        btnTriggerSmile:   document.getElementById('btn-trigger-smile'),
        btnTriggerBreath:  document.getElementById('btn-trigger-breath'),
        btnOpenSettings:   document.getElementById('btn-open-settings'),
        btnOpenPrivacy:    document.getElementById('btn-open-privacy'),
        validationPill:    document.getElementById('validation-pill'),
        validationText:    document.getElementById('validation-text'),
        readoutPulse:      document.getElementById('readout-pulse'),
        subtextPulse:      document.getElementById('subtext-pulse'),
        readoutBreathing:  document.getElementById('readout-breathing'),
        subtextBreathing:  document.getElementById('subtext-breathing'),
        readoutHrv:        document.getElementById('readout-hrv'),
        subtextHrv:        document.getElementById('subtext-hrv'),
        readoutExpression: document.getElementById('readout-expression'),
        subtextExpression: document.getElementById('subtext-expression'),
        btnToggleSound:    document.getElementById('btn-toggle-sound'),
        soundIcon:         document.getElementById('sound-icon'),
        soundText:         document.getElementById('sound-text'),
        presetPills:       document.querySelectorAll('.preset-pill'),
        sliderVolume:      document.getElementById('slider-volume'),
        cameraModeLabel:   document.getElementById('camera-mode-label'),
        modalConsent:      document.getElementById('modal-consent'),
        btnConsentAgree:   document.getElementById('btn-consent-agree'),
        modalSettings:     document.getElementById('modal-settings'),
        inputApiKey:       document.getElementById('input-api-key'),
        btnSaveSettings:   document.getElementById('btn-save-settings'),
        btnCloseSettings:  document.getElementById('btn-close-settings'),
        linkRegister:      document.getElementById('link-register'),
    };

    // 1. Initialize Main Bio-Visualizer Canvas
    visualizer = new BioVisualizer(els.canvas);
    visualizer.start();

    // 2. Initialize Holographic Face Scanner Canvas for Demo Mode
    demoFace = new DemoFaceCanvas(els.demoFaceCanvas);
    demoFace.start();

    // 3. Initialize Audio Synthesizer
    synth = new BioSynth();
    synth.onHeartbeat = (bpm) => {
        if (visualizer) visualizer.triggerHeartbeat(bpm);
    };

    // 4. Initialize Synthetic Simulator
    simulator = new BioSimulator((simData) => {
        handleSimulatorMetrics(simData);
    });

    // 5. Load API Key
    try {
        if (window.pulseTonesApp?.getEnvApiKey) {
            currentApiKey = await window.pulseTonesApp.getEnvApiKey();
        }
    } catch (e) {
        console.warn('Could not read API key from main process:', e);
    }

    if (!currentApiKey) {
        currentApiKey = localStorage.getItem('smartspectra_api_key') || '';
    }
    if (els.inputApiKey) {
        els.inputApiKey.value = currentApiKey;
    }

    // 6. Check Consent Gate
    const hasConsented = localStorage.getItem('pulsetones_consented') === 'true';
    if (!hasConsented && els.modalConsent) {
        els.modalConsent.classList.add('active');
    } else {
        // Boot directly to Live Camera Mode by default!
        startLiveCamera();
    }

    setupEventListeners();
}

function setupEventListeners() {
    // Consent Modal
    els.btnConsentAgree?.addEventListener('click', () => {
        localStorage.setItem('pulsetones_consented', 'true');
        els.modalConsent.classList.remove('active');
        startLiveCamera();
    });

    els.btnOpenPrivacy?.addEventListener('click', () => {
        els.modalConsent.classList.add('active');
    });

    // Settings Modal
    els.btnOpenSettings?.addEventListener('click', () => {
        els.inputApiKey.value = currentApiKey;
        els.modalSettings.classList.add('active');
    });

    els.btnCloseSettings?.addEventListener('click', () => {
        els.modalSettings.classList.remove('active');
    });

    els.btnSaveSettings?.addEventListener('click', () => {
        currentApiKey = els.inputApiKey.value.trim();
        localStorage.setItem('smartspectra_api_key', currentApiKey);
        els.modalSettings.classList.remove('active');
        showValidationHint('API Key saved', 'ok');
    });

    if (els.linkRegister) {
        els.linkRegister.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.pulseTonesApp?.openExternal) {
                window.pulseTonesApp.openExternal('https://physiology.presagetech.com/auth/register');
            }
        });
    }

    // Quick Switch to Live Camera CTA beneath demo preview
    els.btnQuickSwitch?.addEventListener('click', () => {
        startLiveCamera();
    });

    // Camera / Demo Mode Toggle
    els.btnToggleCamera?.addEventListener('click', () => {
        if (isLiveCameraRunning) {
            // Switch back to Demo Simulation
            stopLiveCamera();
            startSimulation();
        } else {
            // Switch to Live Webcam
            startLiveCamera();
        }
    });

    // Demo Action: Smile Trigger (for recording video demo)
    els.btnTriggerSmile?.addEventListener('click', () => {
        if (!synth.isRunning) synth.init();
        synth.triggerSmileFlourish();
        if (demoFace) demoFace.isSmiling = true;
        els.readoutExpression.textContent = 'Smiling 😊';
        els.subtextExpression.textContent = 'Harmonic chime cascade triggered!';
        setTimeout(() => {
            if (demoFace) demoFace.isSmiling = false;
            els.readoutExpression.textContent = 'Serene';
            els.subtextExpression.textContent = 'Smile to trigger chimes';
        }, 2500);
    });

    // Demo Action: Deep Breath Trigger
    els.btnTriggerBreath?.addEventListener('click', () => {
        if (!synth.isRunning) synth.init();
        // Simulate deep inhale then exhale
        synth.updateMetrics({
            pulseRate: 68,
            respirationWave: 1.0,
            respirationRate: 10,
            hrvRmssd: 72,
        });
        showValidationHint('Deep Meditative Inhale — Resonant Filter Sweeping Bright', 'ok');
        setTimeout(() => {
            synth.updateMetrics({
                pulseRate: 70,
                respirationWave: -0.8,
                respirationRate: 10,
                hrvRmssd: 75,
            });
            showValidationHint('Slow Calming Exhale — Settling into Warm Grounding Drone', 'ok');
        }, 2200);
    });

    // Audio Controls
    els.btnToggleSound?.addEventListener('click', () => {
        if (!synth.isRunning) {
            synth.init();
        }
        const muted = synth.toggleMute();
        els.soundIcon.textContent = muted ? '🔇' : '🔊';
        els.soundText.textContent = muted ? 'Unmute' : 'Mute';
    });

    els.sliderVolume?.addEventListener('input', (e) => {
        if (synth) {
            synth.setVolume(parseFloat(e.target.value));
        }
    });

    // Preset Segmented Pill Tabs
    els.presetPills.forEach(pill => {
        pill.addEventListener('click', () => {
            els.presetPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const presetName = pill.getAttribute('data-preset');
            if (synth) {
                synth.setPreset(presetName);
            }
            showValidationHint(`Soundscape Preset: ${pill.textContent.trim()}`, 'ok');
        });
    });
}

function updateStatusBadge(status, label) {
    if (!els.statusBadge || !els.statusText) return;
    els.statusBadge.className = 'status-badge ' + status.toLowerCase();
    els.statusText.textContent = label;
}

function showValidationHint(text, type = 'ok') {
    if (!els.validationPill || !els.validationText) return;
    els.validationPill.style.display = 'flex';
    els.validationPill.className = `validation-pill ${type}`;
    els.validationText.textContent = text;
}

// ==========================================
// DEMO SIMULATION MODE (100% CAMERA-FREE)
// ==========================================

function startSimulation() {
    if (isLiveCameraRunning) {
        stopLiveCamera();
    }

    if (!synth.isRunning) {
        synth.init();
    }

    isSimulationRunning = true;
    simulator.start();

    // Show Demo Holographic Face Scanner
    els.preview.style.display = 'none';
    els.demoFaceCanvas.style.display = 'block';
    els.cameraPlaceholder.style.display = 'none';
    els.cameraModeLabel.textContent = 'rPPG Optical Scan (Demo Mode)';
    if (els.btnQuickSwitch) els.btnQuickSwitch.style.display = 'flex';

    els.btnCameraText.textContent = 'Switch to Live Webcam';
    els.btnToggleCamera.className = 'btn btn-secondary';

    updateStatusBadge('simulation', 'Demo Bio-Simulation Active');
    showValidationHint('Running High-Fidelity Bio-Waveform Simulation (No Camera Required)', 'ok');
}

function handleSimulatorMetrics(data) {
    els.readoutPulse.textContent = data.pulseRate;
    els.subtextPulse.textContent = 'Acoustic sub-bass pulse rhythm';

    els.readoutBreathing.textContent = data.respirationRate;
    els.subtextBreathing.textContent = data.respirationWave > 0 ? 'Inhaling (Filter Opening)' : 'Exhaling (Warm Lowpass)';

    els.readoutHrv.textContent = data.hrvRmssd;
    els.subtextHrv.textContent = data.hrvRmssd > 50 ? 'High Coherence (Rich Shimmer)' : 'Grounding Bass Drone';

    if (data.expression.smile) {
        els.readoutExpression.textContent = 'Smiling 😊';
        els.subtextExpression.textContent = 'Crystalline chime cascade!';
    } else {
        els.readoutExpression.textContent = 'Serene';
        els.subtextExpression.textContent = 'Smile to trigger chimes';
    }

    // Update Holographic Face
    if (demoFace) {
        demoFace.updateState({
            pulsePhase: Math.max(0, data.pulseWave),
            breathWave: data.respirationWave,
            smile: data.expression.smile,
        });
    }

    // Route into Audio & Canvas
    synth.updateMetrics({
        pulseRate: data.pulseRate,
        respirationRate: data.respirationRate,
        respirationWave: data.respirationWave,
        hrvRmssd: data.hrvRmssd,
        expression: data.expression,
    });

    visualizer.pushMetrics({
        pulseSample: data.pulseWave,
        breathSample: data.respirationWave,
        respirationNormalized: data.respirationWave,
        bpm: data.pulseRate,
        hrv: data.hrvRmssd,
    });
}

function stopSimulation() {
    isSimulationRunning = false;
    simulator.stop();
}

// ==========================================
// LIVE WEBCAM MODE (SMARTSPECTRA SDK)
// ==========================================

async function startLiveCamera() {
    if (!currentApiKey) {
        els.modalSettings.classList.add('active');
        showValidationHint('Please enter your Presage API Key', 'warn');
        return;
    }

    if (isSimulationRunning) {
        stopSimulation();
    }

    if (!synth.isRunning) {
        synth.init();
    }

    updateStatusBadge('starting', 'Connecting Webcam...');
    els.btnToggleCamera.disabled = true;

    try {
        buildSdk();
        await sdk.start();

        isLiveCameraRunning = true;
        els.btnToggleCamera.disabled = false;
        els.btnCameraText.textContent = 'Switch to Demo Simulation';
        els.btnToggleCamera.className = 'btn btn-secondary';

        els.demoFaceCanvas.style.display = 'none';
        els.preview.style.display = 'block';
        els.cameraModeLabel.textContent = 'Live Webcam Stream (rPPG)';
        if (els.btnQuickSwitch) els.btnQuickSwitch.style.display = 'none';

        updateStatusBadge('running', 'Live Camera Measuring');
    } catch (err) {
        console.error('Failed to start SmartSpectra SDK:', err);
        updateStatusBadge('error', 'SDK Error');
        showValidationHint(`Error: ${err.message || 'Check Camera'}`, 'err');
        els.btnToggleCamera.disabled = false;
        stopLiveCamera();
        startSimulation();
    }
}

function buildSdk() {
    if (sdk) return;

    sdk = new SmartSpectraSDK({
        apiKey: currentApiKey,
        requestedMetrics: [
            ...breathingMetrics,
            ...cardioMetrics,
            ...faceMetrics,
        ],
    });

    sdk.on('streamAvailable', (stream) => {
        els.preview.srcObject = stream;
        els.preview.play().catch(() => {});
        els.demoFaceCanvas.style.display = 'none';
        els.preview.style.display = 'block';
    });

    sdk.on('processingStatus', (status) => {
        if (status === ProcessingStatus.kRunning) {
            updateStatusBadge('running', 'Live Signal Running');
        } else if (status === ProcessingStatus.kStarting) {
            updateStatusBadge('starting', 'Calibrating...');
        } else if (status === ProcessingStatus.kIdle) {
            updateStatusBadge('idle', 'Standby');
        }
    });

    sdk.on('validationStatus', (code, timestampUs, hint) => {
        const msg = VALIDATION_MESSAGES[code] || hint || `Code ${code}`;
        const type = code === ValidationCode.kOk ? 'ok' :
                     (code === ValidationCode.kCameraTuning || code === ValidationCode.kFaceNotCentered) ? 'warn' : 'err';
        showValidationHint(msg, type);
    });

    sdk.on('metrics', (buf, timestampUs) => {
        try {
            const decoded = decodeMetrics(buf);
            handleLiveMetrics(decoded);
        } catch (e) {
            console.error('Failed to decode incoming metrics buffer:', e);
        }
    });

    sdk.on('error', (code, message, retryable) => {
        console.error(`SmartSpectra SDK Error [${code}]:`, message);
        showValidationHint(`Error: ${message}`, 'err');
    });
}

function handleLiveMetrics(metrics) {
    if (!metrics) return;

    const latestPulse = metrics.cardio?.pulseRate?.at(-1)?.value;
    const latestPressureWave = metrics.cardio?.arterialPressureTrace?.at(-1)?.value;
    const latestHrv = metrics.cardio?.hrv?.at(-1)?.rmssd;

    const latestBreathingRate = metrics.breathing?.rate?.at(-1)?.value;
    const latestChestTrace = metrics.breathing?.upperTrace?.at(-1)?.value ??
                             metrics.breathing?.lowerTrace?.at(-1)?.value;

    const expression = metrics.face?.expression?.at(-1);

    if (typeof latestPulse === 'number' && latestPulse > 0) {
        els.readoutPulse.textContent = Math.round(latestPulse);
        els.subtextPulse.textContent = 'Stable rPPG cardiac rhythm';
    }

    if (typeof latestBreathingRate === 'number' && latestBreathingRate > 0) {
        els.readoutBreathing.textContent = Math.round(latestBreathingRate);
        const breathPhase = (latestChestTrace || 0) > 0 ? 'Inhaling (Filter Opening)' : 'Exhaling (Warm Lowpass)';
        els.subtextBreathing.textContent = breathPhase;
    }

    if (typeof latestHrv === 'number' && latestHrv > 0) {
        els.readoutHrv.textContent = Math.round(latestHrv);
        els.subtextHrv.textContent = latestHrv > 50 ? 'High Coherence (Rich Shimmer)' : 'Grounding Bass Balance';
    }

    if (expression) {
        const isSmiling = expression.smile || (expression.valence && expression.valence > 0.4);
        els.readoutExpression.textContent = isSmiling ? 'Smiling 😊' : 'Focused 🧘';
        els.subtextExpression.textContent = isSmiling ? 'Harmonic chime cascade triggered!' : 'Smile to trigger chimes';
    }

    synth.updateMetrics({
        pulseRate: latestPulse,
        respirationRate: latestBreathingRate,
        respirationWave: latestChestTrace,
        hrvRmssd: latestHrv,
        expression: expression ? { smile: expression.smile } : null,
    });

    visualizer.pushMetrics({
        pulseSample: latestPressureWave ?? (Math.sin(Date.now() / 200) * 0.5),
        breathSample: latestChestTrace ?? 0,
        respirationNormalized: latestChestTrace ?? 0,
        bpm: latestPulse,
        hrv: latestHrv,
    });
}

async function stopLiveCamera() {
    isLiveCameraRunning = false;
    els.btnToggleCamera.disabled = true;

    try {
        if (sdk) {
            await sdk.stop();
            sdk.destroy();
            sdk = null;
        }
    } catch (e) {
        console.warn('Error during sdk stop:', e);
    }

    els.preview.srcObject = null;
    els.preview.style.display = 'none';
    els.demoFaceCanvas.style.display = 'block';
    els.btnToggleCamera.disabled = false;
    els.btnCameraText.textContent = 'Switch to Live Webcam';
    els.btnToggleCamera.className = 'btn btn-secondary';
}

// Clean Teardown on Window Close
window.addEventListener('beforeunload', () => {
    if (sdk) {
        try { sdk.destroy(); } catch (e) {}
    }
    if (simulator) {
        simulator.stop();
    }
    if (demoFace) {
        demoFace.destroy();
    }
    if (synth) {
        synth.destroy();
    }
    if (visualizer) {
        visualizer.destroy();
    }
});

// Bootstrap when DOM is ready
window.addEventListener('DOMContentLoaded', initApp);
