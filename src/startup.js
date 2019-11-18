'use strict';

const { app, BrowserWindow, globalShortcut, Menu, MenuItem } = require('electron');
const { format } = require('url');
const { join } = require('path');
const fs = require('fs');
const path = require('path');
const watcher = require('./watcher');
const authenticator = require('./identities/authenticator');

const environment = (process.env.NODE_ENV || 'production').trim();
// Gardez une reference globale de l'objet window, si vous ne le faites pas, la fenetre sera
// fermee automatiquement quand l'objet JavaScript sera garbage collected.
let mainWindow;
let dataPath = buildPath('./', 'data'), cachePath = buildPath(dataPath, 'caches')
function createWindow() {
    authenticator.checkAuth();

    const menu = new Menu();
    // menu.append(
    //     new MenuItem({
    //         label: 'Log In',
    //         click:() => authenticator.login()
    //     })
    // );
    // menu.append(
    //     new MenuItem({
    //         label: 'Log Out',
    //         click:() => authenticator.logout()
    //     })
    // );
    Menu.setApplicationMenu(menu);
    
    // Cree la fenetre du navigateur.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    })
    
    //mainWindow.toggleDevTools();

    // and load the index.html of the app.
    if (environment == 'development') {
        mainWindow.loadURL('http://localhost:8000');
    } else {
        mainWindow.loadFile(format({
            pathname: join(__dirname, 'dist/index.html'),
            protocol: 'file:',
            slashes: true
        }));
    }
    mainWindow.webContents.on('did-finish-load', () => {
        initWatcher();
    })

    // Émit lorsque la fenêtre est fermée.
    mainWindow.on('closed', () => {
        // Dé-référence l'objet window , normalement, vous stockeriez les fenêtres
        // dans un tableau si votre application supporte le multi-fenêtre. C'est le moment
        // où vous devez supprimer l'élément correspondant.
        mainWindow = null
    })

    mainWindow.onbeforeunload = (e) => {
        e.returnValue = false
    }

    authenticator.initIPCWatchers(mainWindow);
}

function initWatcher() {
    watcher.watch(cachePath, function (fileName) {
        mainWindow.webContents.send('file-update', fileName)
    });
}

function buildPath(args) {
    let result = path.join.apply(path, arguments);
    if (!fs.existsSync(result)) {
        fs.mkdirSync(result, { recursive: true });
    }
    return result;
}

// Cette méthode sera appelée quant Electron aura fini
// de s'initialiser et sera prêt à créer des fenêtres de navigation.
// Certaines APIs peuvent être utilisées uniquement quand cet événement est émit.
app.on('ready', createWindow)

// Quitte l'application quand toutes les fenêtres sont fermées.
app.on('window-all-closed', () => {
    // Sur macOS, il est commun pour une application et leur barre de menu
    // de rester active tant que l'utilisateur ne quitte pas explicitement avec Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // Sur macOS, il est commun de re-créer une fenêtre de l'application quand
    // l'icône du dock est cliquée et qu'il n'y a pas d'autres fenêtres d'ouvertes.
    if (mainWindow === null) {
        createWindow()
    }
})

app.on('will-quit', () => {
    // Supprime tous les raccourcis.
    globalShortcut.unregisterAll()
})