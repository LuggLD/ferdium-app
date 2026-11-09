import type { IntlShape } from 'react-intl';
import type * as UpdateHelpersModule from '../../src/helpers/update-helpers';

// Octokit is the network boundary: record the GitHub request the release
// notes page makes, and answer it like GitHub does for an existing release.
const request = jest.fn();
jest.mock('@octokit/core', () => ({
  Octokit: jest.fn().mockImplementation(() => ({ request })),
}));

// Loaded after jest.mock (esbuild does not hoist jest.mock above imports).
const { getUpdateInfoFromGH } = jest.requireActual(
  '../../src/helpers/update-helpers',
) as typeof UpdateHelpersModule;

const intl = {
  formatMessage: ({ defaultMessage }: { defaultMessage: string }) =>
    defaultMessage,
} as unknown as IntlShape;

describe('getUpdateInfoFromGH', () => {
  beforeEach(() => {
    request.mockResolvedValue({
      status: 200,
      data: { body: '## Release notes body' },
    });
  });

  it("asks the fork's releases for a fork build's notes", async () => {
    const notes = await getUpdateInfoFromGH('', '7.2.3-luggld.1', intl);

    expect(request).toHaveBeenCalledWith(
      'GET /repos/{owner}/{repo}/releases/tags/{tag}',
      { owner: 'LuggLD', repo: 'ferdium-app', tag: 'v7.2.3-luggld.1' },
    );
    expect(notes).toBe('## Release notes body');
  });

  it("asks the fork's releases for the version an update banner links to", async () => {
    await getUpdateInfoFromGH(
      'file:///index.html#/releasenotes?version=7.2.3-luggld.2',
      '7.2.3-luggld.1',
      intl,
    );

    expect(request).toHaveBeenCalledWith(
      'GET /repos/{owner}/{repo}/releases/tags/{tag}',
      { owner: 'LuggLD', repo: 'ferdium-app', tag: 'v7.2.3-luggld.2' },
    );
  });

  it("still asks upstream's releases for upstream versions", async () => {
    await getUpdateInfoFromGH('', '7.2.3', intl);

    expect(request).toHaveBeenCalledWith(
      'GET /repos/{owner}/{repo}/releases/tags/{tag}',
      { owner: 'ferdium', repo: 'ferdium-app', tag: 'v7.2.3' },
    );
  });
});
