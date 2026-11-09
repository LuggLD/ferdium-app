import {
  type ServiceWebContents,
  unloadServiceWebviews,
} from '../../src/electron/unloadServiceWebviews';

const noop = () => {};

function fakeSession(name: string, log: string[]) {
  return { flushStorageData: () => log.push(`flush:${name}`) };
}

// Minimal stand-in for Electron's WebContents, covering exactly the surface
// unloadServiceWebviews uses. Every interaction is appended to `log`, so tests
// can assert on ordering (navigation before flush).
function fakeWebContents(opts: {
  name: string;
  log: string[];
  type?: string;
  destroyed?: boolean;
  session?: { flushStorageData(): void };
  loadURL?: (url: string) => Promise<void>;
}) {
  const listeners: Record<string, (event: { preventDefault(): void }) => void> =
    {};
  const wc: ServiceWebContents & {
    emit(name: string, event: { preventDefault(): void }): void;
  } = {
    getType: () => opts.type ?? 'webview',
    isDestroyed: () => opts.destroyed ?? false,
    loadURL:
      opts.loadURL ??
      (async url => {
        opts.log.push(`load:${opts.name}:${url}`);
      }),
    on(event, listener) {
      listeners[event] = listener;
      return wc;
    },
    session: opts.session ?? fakeSession(`session-of-${opts.name}`, opts.log),
    emit(name, event) {
      listeners[name]?.(event);
    },
  };
  return wc;
}

describe('unloadServiceWebviews', () => {
  it('navigates live service webviews to about:blank and leaves other web contents alone', async () => {
    const log: string[] = [];
    await unloadServiceWebviews(
      [
        fakeWebContents({ name: 'discord', log }),
        fakeWebContents({ name: 'main-window', type: 'window', log }),
        fakeWebContents({ name: 'gone', destroyed: true, log }),
      ],
      { timeoutMs: 1000 },
    );

    expect(log.filter(entry => entry.startsWith('load:'))).toEqual([
      'load:discord:about:blank',
    ]);
  });

  it('lets a page unload even when its beforeunload handler asks to stay', async () => {
    const log: string[] = [];
    const discord = fakeWebContents({ name: 'discord', log });
    await unloadServiceWebviews([discord], { timeoutMs: 1000 });

    const preventDefault = jest.fn();
    discord.emit('will-prevent-unload', { preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('flushes each service session once, only after the pages have unloaded', async () => {
    const log: string[] = [];
    let finishSlowNavigation: () => void = noop;
    const shared = fakeSession('shared', log);
    const pending = unloadServiceWebviews(
      [
        fakeWebContents({ name: 'a', log, session: shared }),
        fakeWebContents({ name: 'b', log, session: shared }),
        fakeWebContents({
          name: 'slow',
          log,
          loadURL: () =>
            new Promise<void>(resolve => {
              finishSlowNavigation = () => {
                log.push('load:slow:done');
                resolve();
              };
            }),
        }),
      ],
      { timeoutMs: 1000 },
    );

    await new Promise(resolve => {
      setImmediate(resolve);
    });
    expect(log.some(entry => entry.startsWith('flush:'))).toBe(false);

    finishSlowNavigation();
    await pending;

    expect(log).toEqual([
      'load:a:about:blank',
      'load:b:about:blank',
      'load:slow:done',
      'flush:shared',
      'flush:session-of-slow',
    ]);
  });

  it('stops waiting for a hung page after the timeout and still flushes', async () => {
    const log: string[] = [];
    const started = Date.now();
    await unloadServiceWebviews(
      [
        fakeWebContents({
          name: 'hung',
          log,
          loadURL: () => new Promise<void>(() => {}),
        }),
      ],
      { timeoutMs: 50 },
    );

    expect(Date.now() - started).toBeLessThan(1000);
    expect(log).toEqual(['flush:session-of-hung']);
  });

  it('still flushes when a navigation fails instead of rejecting', async () => {
    const log: string[] = [];
    await expect(
      unloadServiceWebviews(
        [
          fakeWebContents({
            name: 'aborted',
            log,
            loadURL: () => Promise.reject(new Error('ERR_ABORTED (-3)')),
          }),
        ],
        { timeoutMs: 1000 },
      ),
    ).resolves.toBeUndefined();

    expect(log).toEqual(['flush:session-of-aborted']);
  });
});
