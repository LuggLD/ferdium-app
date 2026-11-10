/**
 * Runs "Restart & install update".
 *
 * Closing the windows destroys the service webviews without unloading their
 * pages, and the update install bypasses the before-quit unload (see
 * src/index.ts), so `prepare` (unloading the service pages, letting e.g.
 * Discord save its login) has to finish first. The update is installed even
 * if preparing fails.
 */
export async function installUpdate({
  prepare,
  onInstall,
  closeWindows,
  quitAndInstall,
}: {
  prepare: () => Promise<void>;
  onInstall: () => void;
  closeWindows: () => void;
  quitAndInstall: () => void;
}): Promise<void> {
  try {
    await prepare();
  } catch {
    // Install anyway: losing page state beats being stuck on an old version.
  }
  onInstall();
  closeWindows();
  quitAndInstall();
}
