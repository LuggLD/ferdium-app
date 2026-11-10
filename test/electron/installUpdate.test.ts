import { installUpdate } from '../../src/electron/installUpdate';

const noop = () => {};

const flush = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

describe('installUpdate', () => {
  it('lets service pages unload before closing windows and installing', async () => {
    const steps: string[] = [];
    let finishUnloading: () => void = noop;
    const done = installUpdate({
      prepare: () => {
        steps.push('unload');
        return new Promise<void>(resolve => {
          finishUnloading = resolve;
        });
      },
      onInstall: () => steps.push('install-update'),
      closeWindows: () => steps.push('close windows'),
      quitAndInstall: () => steps.push('quit and install'),
    });

    await flush();
    // Closing windows destroys the webviews, so nothing may happen until the
    // pages have unloaded.
    expect(steps).toEqual(['unload']);

    finishUnloading();
    await done;
    expect(steps).toEqual([
      'unload',
      'install-update',
      'close windows',
      'quit and install',
    ]);
  });

  it('still installs the update when unloading fails', async () => {
    const steps: string[] = [];
    await installUpdate({
      prepare: () => Promise.reject(new Error('boom')),
      onInstall: () => steps.push('install-update'),
      closeWindows: () => steps.push('close windows'),
      quitAndInstall: () => steps.push('quit and install'),
    });

    expect(steps).toEqual([
      'install-update',
      'close windows',
      'quit and install',
    ]);
  });
});
