/**
 * The part of Electron's WebContents that unloadServiceWebviews needs.
 * Electron's WebContents satisfies it structurally.
 */
export interface ServiceWebContents {
  getType(): string;
  isDestroyed(): boolean;
  loadURL(url: string): Promise<void>;
  on(
    event: 'will-prevent-unload',
    listener: (event: { preventDefault(): void }) => void,
  ): unknown;
  session: { flushStorageData(): void };
}

/**
 * Unload every service page and write its storage to disk.
 *
 * When the app quits, Electron destroys service webviews without running
 * their pages' beforeunload/pagehide/unload handlers, and DOM storage that is
 * still waiting to be committed is lost. Some services rely on those
 * handlers to persist state: Discord, for example, only writes its auth token
 * back to localStorage while the page unloads, so every quit logged it out.
 *
 * Navigating each webview to about:blank runs those handlers; flushing the
 * sessions afterwards commits what they wrote. The returned promise never
 * rejects and settles after at most `timeoutMs`, so a hung page cannot block
 * quitting.
 */
export async function unloadServiceWebviews(
  webContents: ServiceWebContents[],
  { timeoutMs }: { timeoutMs: number },
): Promise<void> {
  const serviceWebviews = webContents.filter(
    contents => !contents.isDestroyed() && contents.getType() === 'webview',
  );

  const navigations = serviceWebviews.map(contents => {
    // Ignore "Leave site?" prompts; the app is quitting either way.
    contents.on('will-prevent-unload', event => event.preventDefault());
    return contents.loadURL('about:blank').catch(() => {});
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.all(navigations),
    new Promise<void>(resolve => {
      timer = setTimeout(resolve, timeoutMs);
    }),
  ]);
  clearTimeout(timer);

  const sessions = new Set(serviceWebviews.map(contents => contents.session));
  for (const session of sessions) {
    session.flushStorageData();
  }
}
