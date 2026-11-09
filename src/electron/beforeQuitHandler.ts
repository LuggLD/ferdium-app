type QuitEvent = { preventDefault(): void };

/**
 * Builds the app's 'before-quit' listener.
 *
 * The first quit request asks for confirmation (when enabled), then holds the
 * quit while `prepare` runs and re-issues it via `quit` afterwards. Electron
 * fires 'before-quit' again for that re-issued quit, and for any extra quit
 * request made while preparing; neither asks again nor prepares twice.
 */
export function createBeforeQuitHandler({
  confirmQuit,
  shouldPrepare,
  prepare,
  onQuitConfirmed,
  quit,
}: {
  /** Returns false when the user cancels the quit. */
  confirmQuit: () => boolean;
  /** Returns false to quit right away, e.g. while installing an update. */
  shouldPrepare: () => boolean;
  prepare: () => Promise<void>;
  onQuitConfirmed: () => void;
  quit: () => void;
}): (event: QuitEvent) => void {
  let state: 'idle' | 'preparing' | 'prepared' = 'idle';

  return event => {
    if (state === 'prepared') return;
    if (state === 'preparing') {
      event.preventDefault();
      return;
    }

    if (!confirmQuit()) {
      event.preventDefault();
      return;
    }
    onQuitConfirmed();
    if (!shouldPrepare()) return;

    event.preventDefault();
    state = 'preparing';
    prepare()
      .catch(() => {})
      .finally(() => {
        state = 'prepared';
        quit();
      });
  };
}
