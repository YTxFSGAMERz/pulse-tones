// main.js - PulseTones Electron Main Process
'use strict';

const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, session, ipcMain, shell } = require('electron');

const LOG_FILE = path.join(__dirname, 'startup.log');
function log(msg, err) {
    const text = `[${new Date().toISOString()}] ${msg} ${err ? err.stack || err : ''}\n`;
    fs.appendFileSync(LOG_FILE, text, 'utf8');
    console.log(text);
}

fs.writeFileSync(LOG_FILE, '=== PulseTones Startup Log ===\n');
log('Process started. Node version: ' + process.version + ', Electron: ' + process.versions.electron);

process.on('uncaughtException', (err) => {
    log('FATAL uncaughtException:', err);
});

process.on('unhandledRejection', (reason) => {
    log('FATAL unhandledRejection:', reason);
});

// Load environment variables from .env if present
try {
    require('dotenv').config();
    log('dotenv loaded');
} catch (e) {
    log('dotenv load failed:', e);
}

// In a packaged build, relocate native C-API library
if (app.isPackaged && !process.env.SMARTSPECTRA_CAPI_PATH) {
    const LIB = {
        darwin: 'libsmartspectra_capi.dylib',
        win32:  'smartspectra_capi.dll',
        linux:  'libsmartspectra_capi.so',
    }[process.platform];
    if (LIB) {
        process.env.SMARTSPECTRA_CAPI_PATH =
            path.join(process.resourcesPath, 'smartspectra', LIB);
    }
}

let bindSmartSpectraIpc = null;
try {
    const mainSdk = require('@smartspectra/node-sdk/main');
    bindSmartSpectraIpc = mainSdk.bindSmartSpectraIpc;
    log('@smartspectra/node-sdk/main loaded successfully');
} catch (e) {
    log('Failed to require @smartspectra/node-sdk/main:', e);
}

let mainWindow = null;

function createWindow() {
    log('createWindow called');
    try {
        mainWindow = new BrowserWindow({
            width: 1240,
            height: 840,
            minWidth: 1024,
            minHeight: 720,
            backgroundColor: '#0a0d14',
            title: 'PulseTones — Bio-Acoustic Generative Soundscape',
            show: true,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                sandbox: false,
                nodeIntegration: false,
            },
        });
        log('BrowserWindow instance created');

        if (bindSmartSpectraIpc) {
            bindSmartSpectraIpc(mainWindow);
            log('bindSmartSpectraIpc wired');
        }

        mainWindow.setMenuBarVisibility(false);

        mainWindow.webContents.on('did-finish-load', () => {
            log('Renderer did-finish-load');
        });

        mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
            log(`Renderer did-fail-load: code=${code}, desc=${desc}`);
        });

        mainWindow.webContents.on('preload-error', (e, p, err) => {
            log(`Renderer preload-error in ${p}:`, err);
        });

        mainWindow.webContents.on('console-message', (e, level, message) => {
            log(`[Renderer Console] ${message}`);
        });

        mainWindow.loadFile(path.join(__dirname, 'index.html'));
        log('mainWindow.loadFile(index.html) initiated');

        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (url.startsWith('https://') || url.startsWith('http://')) {
                shell.openExternal(url);
            }
            return { action: 'deny' };
        });

        mainWindow.on('closed', () => {
            log('mainWindow closed');
            mainWindow = null;
        });
    } catch (err) {
        log('createWindow exception:', err);
    }
}

// IPC Handlers
ipcMain.handle('get-api-key', () => {
    return process.env.SMARTSPECTRA_API_KEY || '';
});

ipcMain.handle('open-external', async (event, url) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        await shell.openExternal(url);
    }
});

app.whenReady().then(() => {
    log('app.whenReady fired');
    try {
        session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
            const url = (details && details.requestingUrl) || (wc && wc.getURL()) || '';
            const mediaTypes = (details && details.mediaTypes) || [];
            const cameraOnly = mediaTypes.length === 1 && mediaTypes[0] === 'video';
            callback(permission === 'media' && cameraOnly && url.startsWith('file://'));
        });

        createWindow();
    } catch (e) {
        log('app.whenReady error:', e);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    log('app window-all-closed');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
