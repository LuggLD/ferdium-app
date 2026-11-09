// LuggLD fork: electron-builder config used by the fork's release workflow
// (`--config electron-builder.fork.js`). Upstream's electron-builder.yml plus
// the overrides in .github/fork/build-config.js. Kept in separate files so
// rebasing onto new upstream releases never conflicts with them.
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { forkBuildConfig } = require('./.github/fork/build-config');

// js-yaml is not a direct dependency; borrow electron-builder's own copy.
// eslint-disable-next-line import/no-dynamic-require
const yaml = require(
  require.resolve('js-yaml', {
    paths: [
      require.resolve('app-builder-lib/package.json', {
        paths: [require.resolve('electron-builder')],
      }),
    ],
  }),
);

module.exports = forkBuildConfig(
  yaml.load(readFileSync(path.join(__dirname, 'electron-builder.yml'), 'utf8')),
);
