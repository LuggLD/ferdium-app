/* Electron main process for the unload-on-quit integration test.
 *
 * PHASE=write: show a <webview> (like Ferdium's services) on page.html in a
 *              persistent partition, wait until it has armed its lifecycle
 *              listeners, then quit the app the way Ferdium does.
 *              UNLOAD=1 wires the real before-quit handler + unloadServiceWebviews;
 *              UNLOAD=0 quits without them (Ferdium's previous behaviour).
 *              QUIT_VIA=update quits like "Restart & install update" does
 *              (installUpdate, with app.quit standing in for quitAndInstall).
 * PHASE=read:  same profile, load page.html?read and print what localStorage
 *              holds, then exit.
 */
require('esbuild-runner/register');
const path = require('node:path');
const { app, BrowserWindow, webContents } = require('electron');
const {
  unloadServiceWebviews,
} = require('../../../src/electron/unloadServiceWebviews');
const {
  createBeforeQuitHandler,
} = require('../../../src/electron/beforeQuitHandler');
const { installUpdate } = require('../../../src/electron/installUpdate');

const { PHASE, UNLOAD, USER_DATA, QUIT_VIA } = process.env;
app.setPath('userData', USER_DATA);

const pageUrl = `file://${path.join(__dirname, 'page.html')}${
  PHASE === 'read' ? '?read' : ''
}`;

const unloadServices = () =>
  unloadServiceWebviews(webContents.getAllWebContents(), { timeoutMs: 3000 });

// Mirrors src/index.ts: while an update installs, before-quit doesn't prepare.
let installingUpdate = false;
if (UNLOAD === '1') {
  app.on(
    'before-quit',
    createBeforeQuitHandler({
      confirmQuit: () => true,
      shouldPrepare: () => !installingUpdate,
      prepare: unloadServices,
      onQuitConfirmed: () => {},
      quit: () => app.quit(),
    }),
  );
}

// Mirrors the 'install' action in src/electron/ipc-api/autoUpdate.ts.
const quitViaUpdate = () =>
  installUpdate({
    prepare: UNLOAD === '1' ? unloadServices : async () => {},
    onInstall: () => {
      installingUpdate = true;
    },
    closeWindows: () => {
      for (const window of BrowserWindow.getAllWindows()) window.close();
    },
    quitAndInstall: () => app.quit(),
  });

app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() !== 'webview') return;
  contents.on('console-message', (event, ...legacyArgs) => {
    // Electron >= 35 passes the message on the event; older versions positionally.
    const message = event.message ?? legacyArgs[1];
    if (message === 'ARMED') {
      setTimeout(
        () => (QUIT_VIA === 'update' ? quitViaUpdate() : app.quit()),
        500,
      );
    } else if (message.startsWith('RESULT ')) {
      process.stdout.write(`${message}\n`);
      app.exit(0);
    }
  });
});

app.on('ready', () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { webviewTag: true },
  });
  win.loadURL(
    `data:text/html,${encodeURIComponent(
      `<webview src="${pageUrl}" partition="persist:service-probe"></webview>`,
    )}`,
  );
});

setTimeout(() => {
  process.stderr.write('timed out\n');
  app.exit(2);
}, 20_000);
