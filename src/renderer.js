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

// DOM Element Handles
const els = {
    canvas:            document.getElementById('bio-canvas'),
    preview:           document.getElementById('preview'),
    cameraPlaceholder: document.getElementById('camera-placeholder'),
    statusBadge:       document.getElementById('status-badge'),
    statusText:        document.getElementById('status-text'),
    btnToggleCamera:   document.getElementById('btn-toggle-camera'),
    btnToggleSim:      document.getElementById('btn-toggle-sim'),
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
    selectPreset:      document.getElementById('select-preset'),
    sliderVolume:      document.getElementById('slider-volume'),
    modalConsent:      document.getElementById('modal-consent'),
    btnConsentAgree:   document.getElementById('btn-consent-agree'),
    modalSettings:     document.getElementById('modal-settings'),
    inputApiKey:       document.getElementById('input-api-key'),
    btnSaveSettings:   document.getElementById('btn-save-settings'),
    btnCloseSettings:  document.getElementById('btn-close-settings'),
    linkRegister:      document.getElementById('link-register'),
};

// Core Engines
let sdk = null;
let synth = null;
let visualizer = null;
let simulator = null;
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
    // 1. Initialize Visualizer & Audio Synth
    visualizer = new BioVisualizer(els.canvas);
    visualizer.start();

    synth = new BioSynth();
    synth.onHeartbeat = (bpm) => {
        visualizer.triggerHeartbeat(bpm);
    };

    // 2. Initialize Synthetic Simulator
    simulator = new BioSimulator((simData) => {
        handleSimulatorMetrics(simData);
    });

    // 3. Load API Key from Environment Bridge or LocalStorage
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

    // 4. Check Consent Gate
    const hasConsented = localStorage.getItem('pulsetones_consented') === 'true';
    if (!hasConsented) {
        els.modalConsent.classList.add('active');
    }

    setupEventListeners();
}

function setupEventListeners() {
    // Consent Modal
    els.btnConsentAgree.addEventListener('click', () => {
        localStorage.setItem('pulsetones_consented', 'true');
        els.modalConsent.classList.remove('active');
    });

    els.btnOpenPrivacy.addEventListener('click', () => {
        els.modalConsent.classList.add('active');
    });

    // Settings Modal
    els.btnOpenSettings.addEventListener('click', () => {
        els.inputApiKey.value = currentApiKey;
        els.modalSettings.classList.add('active');
    });

    els.btnCloseSettings.addEventListener('click', () => {
        els.modalSettings.classList.remove('active');
    });

    els.btnSaveSettings.addEventListener('click', () => {
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

    // Camera Toggle
    els.btnToggleCamera.addEventListener('click', () => {
        if (isLiveCameraRunning) {
            stopLiveCamera();
        } else {
            startLiveCamera();
        }
    });

    // Simulation Toggle
    els.btnToggleSim.addEventListener('click', () => {
        if (isSimulationRunning) {
            stopSimulation();
        } else {
            startSimulation();
        }
    });

    // Audio Controls
    els.btnToggleSound.addEventListener('click', () => {
        if (!synth.isRunning) {
            synth.init();
        }
        const muted = synth.toggleMute();
        els.soundIcon.textContent = muted ? '🔇' : '🔊';
        els.soundText.textContent = muted ? 'Unmute' : 'Mute';
    });

    els.sliderVolume.addEventListener('input', (e) => {
        if (synth) {
            synth.setVolume(parseFloat(e.target.value));
        }
    });

    els.selectPreset.addEventListener('change', (e) => {
        if (synth) {
            synth.setPreset(e.target.value);
        }
    });
}

function updateStatusBadge(status, label) {
    els.statusBadge.className = 'status-badge ' + status.toLowerCase();
    els.statusText.textContent = label;
}

function showValidationHint(text, type = 'ok') {
    els.validationPill.style.display = 'flex';
    els.validationPill.className = `validation-pill ${type}`;
    els.validationText.textContent = text;
}

// ==========================================
// LIVE CAMERA & SMARTSPECTRA INTEGRATION
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

    // Initialize Web Audio Engine on explicit user click
    if (!synth.isRunning) {
        synth.init();
    }

    updateStatusBadge('starting', 'Connecting Camera...');
    els.btnToggleCamera.disabled = true;

    try {
        buildSdk();
        await sdk.start();

        isLiveCameraRunning = true;
        els.btnToggleCamera.disabled = false;
        els.btnToggleCamera.className = 'btn btn-danger';
        els.btnToggleCamera.querySelector('span').textContent = 'Stop Camera';
        els.cameraPlaceholder.style.display = 'none';
        updateStatusBadge('running', 'Live Camera Measuring');
    } catch (err) {
        console.error('Failed to start SmartSpectra SDK:', err);
        updateStatusBadge('error', 'SDK Error');
        showValidationHint(`Error: ${err.message || 'Check API Key / Camera'}`, 'err');
        els.btnToggleCamera.disabled = false;
        stopLiveCamera();
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
        els.cameraPlaceholder.style.display = 'none';
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

    // 1. Cardio / Pulse
    const latestPulse = metrics.cardio?.pulseRate?.at(-1)?.value;
    const latestPressureWave = metrics.cardio?.arterialPressureTrace?.at(-1)?.value;
    const latestHrv = metrics.cardio?.hrv?.at(-1)?.rmssd;

    // 2. Respiration / Breathing
    const latestBreathingRate = metrics.breathing?.rate?.at(-1)?.value;
    const latestChestTrace = metrics.breathing?.upperTrace?.at(-1)?.value ??
                             metrics.breathing?.lowerTrace?.at(-1)?.value;

    // 3. Face & Expression
    const expression = metrics.face?.expression?.at(-1);

    // Update HUD Numbers
    if (typeof latestPulse === 'number' && latestPulse > 0) {
        els.readoutPulse.textContent = Math.round(latestPulse);
        els.subtextPulse.textContent = 'Stable rPPG cardiac rhythm';
    }

    if (typeof latestBreathingRate === 'number' && latestBreathingRate > 0) {
        els.readoutBreathing.textContent = Math.round(latestBreathingRate);
        const breathPhase = (latestChestTrace || 0) > 0 ? 'Inhaling (Brightening Filter)' : 'Exhaling (Subduing Tone)';
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

    // Push to BioSynth and BioVisualizer
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
    els.cameraPlaceholder.style.display = 'flex';
    els.btnToggleCamera.className = 'btn btn-primary';
    els.btnToggleCamera.querySelector('span').textContent = 'Start Live Camera';
    els.btnToggleCamera.disabled = false;
    updateStatusBadge('idle', 'Standby');
    els.validationPill.style.display = 'none';
}

// ==========================================
// DEMO SIMULATION MODE
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

    els.btnToggleSim.className = 'btn btn-danger';
    els.btnToggleSim.querySelector('span').textContent = 'Stop Simulation';
    updateStatusBadge('simulation', 'Simulation Demo Active');
    showValidationHint('Running High-Fidelity Bio-Waveform Simulation', 'ok');
}

function handleSimulatorMetrics(data) {
    els.readoutPulse.textContent = data.pulseRate;
    els.subtextPulse.textContent = 'Simulated rPPG Pulse (72 BPM)';

    els.readoutBreathing.textContent = data.respirationRate;
    els.subtextBreathing.textContent = data.respirationWave > 0 ? 'Inhaling (Opening Filter)' : 'Exhaling (Warm Lowpass)';

    els.readoutHrv.textContent = data.hrvRmssd;
    els.subtextHrv.textContent = 'High Coherence (Rich Shimmer)';

    els.readoutExpression.textContent = data.expression.smile ? 'Smiling 😊' : 'Calm 🧘';
    els.subtextExpression.textContent = data.expression.smile ? 'Crystalline chime cascade!' : 'Smile to trigger chimes';

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

    els.btnToggleSim.className = 'btn btn-secondary';
    els.btnToggleSim.querySelector('span').textContent = 'Demo Simulation';
    updateStatusBadge('idle', 'Standby');
    els.validationPill.style.display = 'none';

    els.readoutPulse.textContent = '--';
    els.readoutBreathing.textContent = '--';
    els.readoutHrv.textContent = '--';
    els.readoutExpression.textContent = 'Serene';
}

// Clean Teardown on Window Close
window.addEventListener('beforeunload', () => {
    if (sdk) {
        try { sdk.destroy(); } catch (e) {}
    }
    if (simulator) {
        simulator.stop();
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
