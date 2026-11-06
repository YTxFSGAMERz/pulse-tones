// main.js - PulseTones Electron Main Process
'use strict';

const path = require('path');
const { app, BrowserWindow, session, ipcMain, shell } = require('electron');

// Load environment variables from .env if present
require('dotenv').config();

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

const { bindSmartSpectraIpc } = require('@smartspectra/node-sdk/main');

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1240,
        height: 840,
        minWidth: 1024,
        minHeight: 720,
        backgroundColor: '#0a0d14',
        title: 'PulseTones — Bio-Acoustic Generative Soundscape',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            sandbox: false,
            nodeIntegration: false,
        },
    });

    // Bind SmartSpectra IPC messaging to this window
    bindSmartSpectraIpc(mainWindow);

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://') || url.startsWith('http://')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
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
    // Explicit camera permission gate
    session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
        const url = (details && details.requestingUrl) || (wc && wc.getURL()) || '';
        const mediaTypes = (details && details.mediaTypes) || [];
        const cameraOnly = mediaTypes.length === 1 && mediaTypes[0] === 'video';
        // Only grant camera permission to local application files
        callback(permission === 'media' && cameraOnly && url.startsWith('file://'));
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
