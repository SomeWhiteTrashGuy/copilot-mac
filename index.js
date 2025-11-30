// index.js – Generic browser-shell template
// Currently configured for: Copilot for Mac

const APP_NAME = 'Copilot for Mac';
const START_URL = 'https://copilot.microsoft.com/';

const {
  app,
  BrowserWindow,
  Menu,
  globalShortcut,
  dialog,
  shell,
  clipboard
} = require('electron');
const path = require('path');
const fs = require('fs');

const iconPath = path.join(__dirname, 'icon.png');

let mainWindow;
let notesWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    title: APP_NAME,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load target site
  mainWindow.loadURL(START_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  buildMenu();
}

function createNotesWindow() {
  if (notesWindow) {
    notesWindow.focus();
    return;
  }

  notesWindow = new BrowserWindow({
    width: 500,
    height: 600,
    title: 'Notes',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  notesWindow.loadFile(path.join(__dirname, 'notes.html'));

  notesWindow.on('closed', () => {
    notesWindow = null;
  });
}

function buildMenu() {
  const template = [
    // App menu with Services / Hide / Hide Others / Show All
    {
      label: APP_NAME,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        { role: 'close' },
        { type: 'separator' },
        {
          label: 'Save Page as PDF…',
          click: savePageAsPDF
        },
        {
          label: 'Save Page as Text…',
          click: savePageAsText
        },
        {
          label: 'Screenshot Window…',
          click: takeScreenshot
        },
        { type: 'separator' },
        {
          label: 'Open in Default Browser',
          click: openInDefaultBrowser
        },
        {
          label: 'Copy Page URL',
          click: copyCurrentURL
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        {
          label: 'Toggle DevTools',
          accelerator: 'Alt+CmdOrCtrl+I',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => zoomDelta(0.5)
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => zoomDelta(-0.5)
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (mainWindow) mainWindow.webContents.setZoomLevel(0);
          }
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          label: 'Always on Top',
          type: 'checkbox',
          click: (menuItem) => {
            if (mainWindow) {
              mainWindow.setAlwaysOnTop(menuItem.checked);
            }
          }
        }
      ]
    },
    {
      label: 'Notes',
      submenu: [
        {
          label: 'Open Notes Window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            createNotesWindow();
          }
        }
      ]
    },
    {
      label: 'Window',
      role: 'window',
      submenu: [
        { role: 'close' },
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Open Copilot Website',
          click: () => shell.openExternal(START_URL)
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function zoomDelta(delta) {
  if (!mainWindow) return;
  const wc = mainWindow.webContents;
  wc.getZoomLevel((level) => {
    wc.setZoomLevel(level + delta);
  });
}

function savePageAsPDF() {
  if (!mainWindow) return;

  const wc = mainWindow.webContents;
  dialog.showSaveDialog(mainWindow, {
    title: 'Save Page as PDF',
    defaultPath: 'page.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  }).then(result => {
    if (result.canceled || !result.filePath) return;
    wc.printToPDF({}).then(data => {
      fs.writeFileSync(result.filePath, data);
    }).catch(err => {
      console.error('Failed to save PDF:', err);
    });
  });
}

function savePageAsText() {
  if (!mainWindow) return;

  const wc = mainWindow.webContents;
  dialog.showSaveDialog(mainWindow, {
    title: 'Save Page as Text',
    defaultPath: 'page.txt',
    filters: [{ name: 'Text', extensions: ['txt'] }]
  }).then(result => {
    if (result.canceled || !result.filePath) return;
    wc.executeJavaScript('document.body.innerText').then(text => {
      fs.writeFileSync(result.filePath, text, 'utf8');
    }).catch(err => {
      console.error('Failed to get page text:', err);
    });
  });
}

function takeScreenshot() {
  if (!mainWindow) return;

  mainWindow.capturePage().then(image => {
    dialog.showSaveDialog(mainWindow, {
      title: 'Save Screenshot',
      defaultPath: 'screenshot.png',
      filters: [{ name: 'PNG Image', extensions: ['png'] }]
    }).then(result => {
      if (result.canceled || !result.filePath) return;
      try {
        fs.writeFileSync(result.filePath, image.toPNG());
      } catch (err) {
        console.error('Failed to save screenshot:', err);
      }
    }).catch(err => {
      console.error('Save dialog error for screenshot:', err);
    });
  }).catch(err => {
    console.error('Failed to capture screenshot:', err);
  });
}

function copyCurrentURL() {
  if (!mainWindow) return;
  const url = mainWindow.webContents.getURL();
  clipboard.writeText(url);
}

function openInDefaultBrowser() {
  if (!mainWindow) return;
  const url = mainWindow.webContents.getURL();
  shell.openExternal(url);
}

app.whenReady().then(() => {
  // Set Dock icon in dev
  if (process.platform === 'darwin') {
    try {
      app.dock.setIcon(iconPath);
    } catch (e) {
      console.error('Failed to set dock icon', e);
    }
  }

  createWindow();

  // Global shortcut: Ctrl+Alt+G to show/hide the window
  globalShortcut.register('Control+Alt+G', () => {
    if (!mainWindow) {
      createWindow();
      return;
    }
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
