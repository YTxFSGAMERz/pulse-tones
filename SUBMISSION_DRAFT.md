---
title: PulseTones: Real-Time Bio-Acoustic Generative Soundscape with SmartSpectra
published: true
tags: devchallenge, presagechallenge, ai, audio
cover_image: 
---

*This is a submission for the [Presage SmartSpectra SDK Challenge](https://dev.to/challenges/presage-2026-11-04)*

## What I Built

**PulseTones** is an interactive, contactless bio-acoustic experience that translates the hidden rhythms of the human body into a generative ambient music soundscape and bioluminescent visual installation.

Using an ordinary webcam and the **Presage SmartSpectra SDK**, PulseTones reads your heart rate, respiratory waveforms, HRV autonomic balance, and facial expressions in real-time through remote photoplethysmography (rPPG). Instead of displaying passive medical charts, PulseTones turns your physiological state into an auditory breathing meditation:
- Inhaling opens an analog-style lowpass filter, flooding the room with bright, shimmering harmonics.
- Exhaling calms the soundscape into deep, grounding meditative roots.
- Your pulse drives a warm sub-bass acoustic rhythm and synchronized bioluminescent shockwaves.
- Smiling triggers a crystalline cascading pentatonic chime arpeggio.

The application includes both **Live Camera Capture** (powered by SmartSpectra) and an offline **High-Fidelity Bio-Simulation Mode** so judges and users can explore the acoustics with or without a webcam.

---

## Demo

<!-- Embed your demo video URL below showing the live Presage signals in action -->
{% embed https://youtu.be/YOUR_DEMO_VIDEO_ID %}

*(Demo video walkthrough: shows camera initialization, face alignment, live pulse & respiration waveforms locking in, and the Web Audio synthesizer responding dynamically to deep breaths and smiles!)*

---

## Code

The complete source code is open source on GitHub:
👉 **[github.com/YTxFSGAMERz/pulse-tones](https://github.com/YTxFSGAMERz/pulse-tones)**

### Quick Setup Instructions
```bash
git clone https://github.com/YTxFSGAMERz/pulse-tones.git
cd pulse-tones
npm install
npm start
```
*(Enter your free Presage API key via `.env` or in the in-app Settings dialog).*

---

## How It Responds to Human Signals

PulseTones maps multiple synchronous telemetry streams from the SmartSpectra SDK into a procedural Web Audio API synthesis engine:

1. **Pulse Rate (rPPG):**  
   Extracted from subtle facial micro-color oscillations. Converted from BPM into a musical tempo clock that schedules a resonant sub-bass sine thump (~56Hz to 36Hz downward sweep) and pulses the central bioluminescent orb.
2. **Respiratory Movement (Breathing Trace):**  
   Continuous upper/lower chest waveforms modulate a 24dB/octave resonant lowpass biquad filter. Inhaling increases filter cutoff up to 2400 Hz (brightening the acoustic field); exhaling rolls off high frequencies down to 220 Hz.
3. **Heart Rate Variability (HRV RMSSD):**  
   High HRV (autonomic relaxation) introduces rich 9th and 11th intervals and spatial delay diffusion; lower HRV subdues harmonic complexity to root fifths to encourage parasympathetic grounding.
4. **Expression Classification:**  
   When the SDK detects a smile or positive valence, an arpeggiator fires a high-register pentatonic chime cascade across the stereo field.

All SmartSpectra events (`metrics`, `validationStatus`, `processingStatus`, `streamAvailable`) are marshaled across Electron's isolated context bridge via high-performance MessagePorts.

---

## Prize Categories

### Most Creative or Delightful Use
PulseTones transforms what is traditionally viewed as clinical telemetry into an intimate artistic instrument. Rather than measuring humans for surveillance or anxiety-inducing vital metrics, PulseTones celebrates bio-rhythms as music. The tactile feeling of hearing your breath alter the resonance of an ambient synth in real time—with no wearables, sensors, or wires—creates an unexpected and deeply calming experience of pure delight.

---

## Consent and Data Handling

- **Explicit Consent Gate:** The application presents an unskippable Consent Modal on first launch. Camera streams remain inactive until the user grants explicit permission.
- **Strictly Local In-Memory Processing:** Video frames are analyzed purely on-device in volatile RAM by the native SmartSpectra SDK runtime.
- **Zero Video or Biometric Storage:** No camera frames, photos, recordings, or facial scans are ever written to disk, retained, or transmitted over the network.
- **No Identification or Surveillance:** The system performs aggregate rPPG optical analysis; no facial recognition or user identity profiling exists.
- **Non-Medical Disclaimer:** PulseTones is an artistic generative soundscape. It makes no medical claims, provides no diagnostic or therapeutic output, and is not for clinical decision-making.

---

## Agent Session

<!-- Optional: upload your agent session transcript at dev.to/agent_sessions/new and embed it below -->
{% embed https://dev.to/agent_sessions/YOUR_SESSION_ID %}

---

*Built with passion for the DEV.to community & Presage Technologies!*
