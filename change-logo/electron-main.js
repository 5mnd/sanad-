const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// Start Next.js server
function startServer() {
  const isProduction = app.isPackaged;
  
  if (isProduction) {
    // In production, start the built Next.js server
    serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
      cwd: __dirname,
      env: { ...process.env, PORT: '3000' }
    });
    
    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, 'public', 'icon-512.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    backgroundColor: '#0f172a',
    show: false,
    title: 'Sanad POS - نظام سند'
  });

  // Wait for window to be ready before showing
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const isProduction = app.isPackaged;
  const startURL = isProduction
    ? 'http://localhost:3000'
    : 'http://localhost:3000';

  // Wait a bit for server to start
  setTimeout(() => {
    mainWindow.loadURL(startURL);
  }, isProduction ? 3000 : 1000);

  // Open DevTools in development
  if (!isProduction) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
