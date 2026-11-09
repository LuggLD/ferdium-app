import {
  forkReleaseHeader,
  nextForkVersion,
  rewriteUpstreamNotes,
} from '../../.github/fork/release';

describe('nextForkVersion', () => {
  it('starts at luggld.1 for a new upstream base', () => {
    expect(
      nextForkVersion('v7.2.4', ['v7.2.3', 'v7.2.3-luggld.1', 'v7.2.4']),
    ).toBe('7.2.4-luggld.1');
  });

  it('counts up from the highest existing fork release of the same base, numerically', () => {
    expect(
      nextForkVersion('v7.2.3', [
        'v7.2.3-luggld.2',
        'v7.2.3-luggld.10',
        'v7.2.3-luggld.9',
        'v7.2.2-luggld.40',
        'v7.2.3-nightly.3',
      ]),
    ).toBe('7.2.3-luggld.11');
  });

  it('does not mistake a longer version for the same base', () => {
    expect(nextForkVersion('v7.2.3', ['v7.2.30-luggld.5'])).toBe(
      '7.2.3-luggld.1',
    );
  });
});

describe('rewriteUpstreamNotes', () => {
  it('points bare issue references at the upstream repository', () => {
    expect(
      rewriteUpstreamNotes(
        '* perf: faster switching by OskarEichler in #2530 (see #2531)',
      ),
    ).toBe(
      '* perf: faster switching by OskarEichler in ferdium/ferdium-app#2530 (see ferdium/ferdium-app#2531)',
    );
  });

  it('unlinks @mentions so fork releases do not notify upstream contributors', () => {
    expect(
      rewriteUpstreamNotes(
        '* fix typo by @LeventCelik in #2534\n* add @allcontributors[bot] notes\n@SpecialAro at line start',
      ),
    ).toBe(
      '* fix typo by LeventCelik in ferdium/ferdium-app#2534\n* add allcontributors[bot] notes\nSpecialAro at line start',
    );
  });

  it('leaves headings, URLs with anchors and email addresses alone', () => {
    const text = [
      "# What's Changed",
      '### Other Changes',
      'https://github.com/ferdium/ferdium-app/compare/v7.2.2...v7.2.3#diff',
      'contact: team@ferdium.org',
      'https://github.com/ferdium/ferdium-app/pull/2530',
    ].join('\n');
    expect(rewriteUpstreamNotes(text)).toBe(text);
  });
});

describe('forkReleaseHeader', () => {
  it('names the upstream release and lists the changes the fork carries', () => {
    expect(
      forkReleaseHeader({
        upstreamTag: 'v7.2.4',
        changes: [
          'fix: unload service webviews before quitting so pages can persist state',
        ],
      }),
    ).toBe(
      [
        "> **LuggLD fork of Ferdium.** This is upstream's [v7.2.4](https://github.com/ferdium/ferdium-app/releases/tag/v7.2.4) plus the changes below. Installed builds update from this fork's releases.",
        '>',
        '> **Changes carried by this fork**',
        '> - fix: unload service webviews before quitting so pages can persist state',
        '>',
        '> **Installing:** macOS builds are signed with a development certificate and not notarized, so after downloading run `xattr -dr com.apple.quarantine /Applications/Ferdium.app` once. Windows builds are unsigned, so SmartScreen asks once (**More info** → **Run anyway**).',
        '',
        '---',
        '',
      ].join('\n'),
    );
  });

  it('points references in carried upstream commits at the upstream repository', () => {
    expect(
      forkReleaseHeader({
        upstreamTag: 'v7.2.3',
        changes: [
          'fix: stringify URL objects passed to window.open in services (#2540)',
        ],
      }),
    ).toContain(
      '> - fix: stringify URL objects passed to window.open in services (ferdium/ferdium-app#2540)',
    );
  });

  it('says so when the fork carries no changes', () => {
    expect(forkReleaseHeader({ upstreamTag: 'v7.2.5', changes: [] })).toContain(
      '> - _none: identical to upstream_',
    );
  });
});
