// preload.js - PulseTones Preload Bridge
'use strict';

// 1. Mount the official SmartSpectra preload bridge onto window.__smartspectraBridge
require('@smartspectra/node-sdk/preload');

const { contextBridge, ipcRenderer } = require('electron');

// 2. Expose application-level secure helpers to the renderer
contextBridge.exposeInMainWorld('pulseTonesApp', {
    getEnvApiKey: () => ipcRenderer.invoke('get-api-key'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    platform: process.platform,
});
