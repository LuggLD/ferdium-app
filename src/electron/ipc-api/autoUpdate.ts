import { BrowserWindow, ipcMain, webContents } from 'electron';
import { autoUpdater } from 'electron-updater';
import ms from 'ms';
// eslint-disable-next-line import/no-cycle
import { appEvents } from '../..';
import { isSnap } from '../../environment';
import { installUpdate } from '../installUpdate';
import { unloadServiceWebviews } from '../unloadServiceWebviews';

const debug = require('../../preload-safe-debug')('Ferdium:ipcApi:autoUpdate');

export default (params: { mainWindow: BrowserWindow; settings: any }) => {
  const enableUpdate = Boolean(params.settings.app.get('automaticUpdates'));

  // The following line is a workaround to force the development update. Should only be used for development purposes.
  // autoUpdater.forceDevUpdateConfig = true;

  if (enableUpdate) {
    // Disable auto download for snap packages
    // since the snap store will handle the update.
    if (isSnap) {
      autoUpdater.autoDownload = false;
    }

    ipcMain.on('autoUpdate', (event, args) => {
      if (enableUpdate) {
        try {
          autoUpdater.autoInstallOnAppQuit = false;
          autoUpdater.allowPrerelease = Boolean(
            params.settings.app.get('beta'),
          );

          if (args.action === 'check') {
            debug('checking for update');
            autoUpdater.checkForUpdates();
          } else if (args.action === 'install') {
            // If the app is a snap, auto-updates are not supported.
            // The snap store will handle updates, therefore the user should be prompted to update through snap store.
            if (isSnap) {
              return;
            }

            debug('installing update');

            installUpdate({
              // Let service pages save their state (e.g. Discord's login)
              // before closing the windows destroys their webviews.
              prepare: () =>
                unloadServiceWebviews(webContents.getAllWebContents(), {
                  timeoutMs: ms('3s'),
                }),
              onInstall: () => appEvents.emit('install-update'),
              closeWindows: () => {
                const openedWindows = BrowserWindow.getAllWindows();
                for (const window of openedWindows) window.close();
              },
              quitAndInstall: () => autoUpdater.quitAndInstall(),
            }).catch(error => event.sender.send('autoUpdate', { error }));
          }
        } catch (error) {
          event.sender.send('autoUpdate', { error });
        }
      }
    });

    autoUpdater.on('update-not-available', () => {
      debug('update-not-available');
      params.mainWindow.webContents.send('autoUpdate', { available: false });
    });

    autoUpdater.on('update-available', event => {
      debug('update-available');

      if (enableUpdate) {
        params.mainWindow.webContents.send('autoUpdate', {
          version: event.version,
          available: true,
        });
      }
    });

    autoUpdater.on('download-progress', progressObj => {
      let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
      logMessage = `${logMessage} - Downloaded ${progressObj.percent}%`;
      logMessage = `${logMessage} (${progressObj.transferred}/${progressObj.total})`;

      debug(logMessage);
    });

    autoUpdater.on('update-downloaded', () => {
      debug('update-downloaded');
      params.mainWindow.webContents.send('autoUpdate', { downloaded: true });
    });

    autoUpdater.on('error', error => {
      debug('update-error');
      params.mainWindow.webContents.send('autoUpdate', { error });
    });
  } else {
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.autoDownload = false;
  }
};
