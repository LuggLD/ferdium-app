import { createBeforeQuitHandler } from '../../src/electron/beforeQuitHandler';

const noop = () => {};

// The handler is driven by Electron's 'before-quit' event, which may fire
// several times: the user's Cmd+Q, extra Cmd+Q presses while we prepare, and
// the app.quit() we re-issue ourselves once preparation is done.
function setup(
  overrides: {
    confirmQuit?: () => boolean;
    shouldPrepare?: () => boolean;
    prepare?: () => Promise<void>;
  } = {},
) {
  const calls: string[] = [];
  let finishPreparing: () => void = noop;
  const handler = createBeforeQuitHandler({
    confirmQuit:
      overrides.confirmQuit ??
      (() => {
        calls.push('confirm');
        return true;
      }),
    shouldPrepare: overrides.shouldPrepare ?? (() => true),
    prepare:
      overrides.prepare ??
      (() => {
        calls.push('prepare');
        return new Promise<void>(resolve => {
          finishPreparing = resolve;
        });
      }),
    onQuitConfirmed: () => calls.push('confirmed'),
    quit: () => calls.push('quit'),
  });
  const fire = () => {
    const event = { preventDefault: jest.fn() };
    handler(event);
    return event.preventDefault.mock.calls.length > 0 ? 'blocked' : 'allowed';
  };
  return { calls, fire, finish: () => finishPreparing() };
}

const flush = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

describe('createBeforeQuitHandler', () => {
  it('holds the first quit, prepares, then quits again and lets that quit through', async () => {
    const { calls, fire, finish } = setup();

    expect(fire()).toBe('blocked');
    expect(calls).toEqual(['confirm', 'confirmed', 'prepare']);

    finish();
    await flush();
    expect(calls).toEqual(['confirm', 'confirmed', 'prepare', 'quit']);

    // The re-issued app.quit() must pass without asking or preparing again.
    expect(fire()).toBe('allowed');
    expect(calls).toEqual(['confirm', 'confirmed', 'prepare', 'quit']);
  });

  it('blocks repeated quit requests while preparing, without asking or preparing again', () => {
    const { calls, fire } = setup();
    fire();

    expect(fire()).toBe('blocked');
    expect(calls).toEqual(['confirm', 'confirmed', 'prepare']);
  });

  it('cancels the quit when the user declines, and asks again next time', () => {
    let answer = false;
    const asked: boolean[] = [];
    const { calls, fire } = setup({
      confirmQuit: () => {
        asked.push(answer);
        return answer;
      },
    });

    expect(fire()).toBe('blocked');
    expect(calls).toEqual([]);

    answer = true;
    expect(fire()).toBe('blocked');
    expect(asked).toEqual([false, true]);
    expect(calls).toEqual(['confirmed', 'prepare']);
  });

  it('quits immediately without preparing when preparation is not wanted', () => {
    const { calls, fire } = setup({ shouldPrepare: () => false });

    expect(fire()).toBe('allowed');
    expect(calls).toEqual(['confirm', 'confirmed']);
  });

  it('still quits when preparation fails', async () => {
    const { calls, fire } = setup({
      prepare: () => Promise.reject(new Error('boom')),
    });

    fire();
    await flush();

    expect(calls).toEqual(['confirm', 'confirmed', 'quit']);
  });
});
