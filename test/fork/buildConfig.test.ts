import { forkBuildConfig } from '../../.github/fork/build-config';

// Trimmed-down but structurally faithful copy of upstream's
// electron-builder.yml (the parts the fork touches, plus neighbours that
// must survive untouched).
const upstream = {
  appId: 'org.ferdium.ferdium-app',
  publish: { provider: 'github' },
  afterSign: './build-helpers/notarize.js',
  mac: {
    hardenedRuntime: true,
    entitlements: './build-helpers/entitlements.mas.plist',
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
      { target: 'zip', arch: ['x64', 'arm64'] },
    ],
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64', 'ia32', 'arm64'] }],
    verifyUpdateCodeSignature: false,
  },
  linux: {
    category: 'Network;InstantMessaging;',
    target: [
      { target: 'AppImage' },
      { target: 'deb', arch: ['x64', 'arm64', 'armv7l'] },
      'snap',
      { target: 'rpm', arch: ['x64', 'arm64'] },
      { target: 'snap' },
    ],
  },
};

describe('forkBuildConfig', () => {
  it("publishes to and updates from the fork's GitHub releases", () => {
    expect(forkBuildConfig(upstream).publish).toEqual({
      provider: 'github',
      owner: 'LuggLD',
      repo: 'ferdium-app',
      releaseType: 'draft',
    });
  });

  it('keeps writing latest*.yml update feeds for luggld pre-release versions', () => {
    expect(forkBuildConfig(upstream).detectUpdateChannel).toBe(false);
  });

  it("signs macOS builds for development and keeps upstream's mac settings", () => {
    expect(forkBuildConfig(upstream).mac).toEqual({
      hardenedRuntime: true,
      entitlements: './build-helpers/entitlements.mas.plist',
      target: [
        { target: 'dmg', arch: ['x64', 'arm64'] },
        { target: 'zip', arch: ['x64', 'arm64'] },
      ],
      type: 'development',
    });
  });

  it('drops only the snap targets from Linux, in either notation', () => {
    expect(forkBuildConfig(upstream).linux).toEqual({
      category: 'Network;InstantMessaging;',
      target: [
        { target: 'AppImage' },
        { target: 'deb', arch: ['x64', 'arm64', 'armv7l'] },
        { target: 'rpm', arch: ['x64', 'arm64'] },
      ],
    });
  });

  it('leaves everything else exactly as upstream has it', () => {
    const config = forkBuildConfig(upstream);
    expect(config.win).toEqual(upstream.win);
    expect(config.appId).toBe('org.ferdium.ferdium-app');
    expect(config.afterSign).toBe('./build-helpers/notarize.js');
  });

  it('does not modify the upstream config object', () => {
    const before = JSON.stringify(upstream);
    forkBuildConfig(upstream);
    expect(JSON.stringify(upstream)).toBe(before);
  });
});
