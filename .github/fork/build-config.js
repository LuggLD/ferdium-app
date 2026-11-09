// LuggLD fork: changes the fork makes to upstream's electron-builder.yml.
// Applied in code (see electron-builder.fork.js) because electron-builder's
// `extends` appends arrays, so it cannot remove upstream's snap target.

const isSnap = target => (target.target ?? target) === 'snap';

/**
 * Returns upstream's electron-builder config with the fork's overrides.
 * Does not modify `upstream`.
 */
function forkBuildConfig(upstream) {
  return {
    ...upstream,
    // Publish to, and auto-update from, the fork's GitHub releases.
    publish: {
      provider: 'github',
      owner: 'LuggLD',
      repo: 'ferdium-app',
      releaseType: 'draft',
    },
    // Fork versions look like 7.2.4-luggld.1; without this the update feeds
    // would be named luggld*.yml, but the in-app updater reads latest*.yml.
    detectUpdateChannel: false,
    // Signed with an Apple Development certificate (no Developer ID, so no
    // notarization): a stable signature keeps auto-updates and macOS
    // camera/microphone/screen-recording permissions working across versions.
    mac: { ...upstream.mac, type: 'development' },
    // Snap publishes to upstream's Snap Store account.
    linux: {
      ...upstream.linux,
      target: upstream.linux.target.filter(target => !isSnap(target)),
    },
  };
}

module.exports = { forkBuildConfig };
