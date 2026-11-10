#!/usr/bin/env node
// LuggLD fork: release helpers for .github/workflows/luggld-release.yml.
//
//   node .github/fork/release.js next-version            -> e.g. 7.2.4-luggld.1
//   node .github/fork/release.js notes <version>         -> release notes (markdown)
//   node .github/fork/release.js upstream-base           -> e.g. v7.2.4
//
// The pure functions are exported for tests (test/fork/release.test.ts).

const { execFileSync } = require('node:child_process');

const UPSTREAM_REPO = 'ferdium/ferdium-app';
// Commits that only maintain the fork itself (CI, build config) are not
// listed as user-facing changes in the release notes.
const FORK_MAINTENANCE = /^chore\(fork\)/;

/** Next fork version for an upstream base tag, given all existing git tags. */
function nextForkVersion(baseTag, tags) {
  const base = baseTag.replace(/^v/, '');
  const prefix = `v${base}-luggld.`;
  const numbers = tags
    .filter(tag => tag.startsWith(prefix))
    .map(tag => Number(tag.slice(prefix.length)))
    .filter(n => Number.isInteger(n));
  return `${base}-luggld.${Math.max(0, ...numbers) + 1}`;
}

/**
 * Adapts upstream's release notes for publishing on the fork: bare `#123`
 * references would link to the fork's own issues, and `@user` mentions would
 * notify upstream contributors about every fork release.
 */
function rewriteUpstreamNotes(text) {
  return text
    .replaceAll(/(^|[\s(])#(\d+)\b/gm, `$1${UPSTREAM_REPO}#$2`)
    .replaceAll(/(^|[\s(])@([\dA-Za-z][\w-]*(?:\[bot])?)(?!\/)/gm, '$1$2');
}

/** Markdown header put above upstream's notes in each fork release. */
function forkReleaseHeader({ upstreamTag, changes }) {
  const listed =
    changes.length > 0 ? changes : ['_none: identical to upstream_'];
  return [
    // Plain blockquote, not a GitHub "[!NOTE]" alert: Ferdium's in-app
    // release notes page renders these notes too and would show "[!NOTE]".
    `> **LuggLD fork of Ferdium.** This is upstream's [${upstreamTag}](https://github.com/${UPSTREAM_REPO}/releases/tag/${upstreamTag}) plus the changes below. Installed builds update from this fork's releases.`,
    '>',
    '> **Changes carried by this fork**',
    ...listed.map(change => `> - ${rewriteUpstreamNotes(change)}`),
    '>',
    '> **Installing:** macOS builds are signed with a development certificate and not notarized, so after downloading run `xattr -dr com.apple.quarantine /Applications/Ferdium.app` once. Windows builds are unsigned, so SmartScreen asks once (**More info** → **Run anyway**).',
    '',
    '---',
    '',
  ].join('\n');
}

/**
 * Subjects of the fork's own commits since the upstream base, oldest first:
 * no merge commits (pull requests) and no fork-maintenance commits.
 * `--topo-order` keeps the order stable when commits share a timestamp, as
 * they do after the sync's rebase.
 */
function carriedChanges(base, cwd) {
  return execFileSync(
    'git',
    [
      'log',
      '--reverse',
      '--topo-order',
      '--no-merges',
      '--format=%s',
      `${base}..HEAD`,
    ],
    { cwd, encoding: 'utf8' },
  )
    .split('\n')
    .filter(subject => subject && !FORK_MAINTENANCE.test(subject));
}

// --- CLI (used by CI) -------------------------------------------------------

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

/** Newest upstream stable release tag contained in HEAD, e.g. v7.2.4. */
const upstreamBase = () =>
  git(
    'describe',
    '--tags',
    '--abbrev=0',
    '--match',
    'v[0-9]*',
    '--exclude',
    '*-*',
  );

async function upstreamNotes(tag) {
  const response = await fetch(
    `https://api.github.com/repos/${UPSTREAM_REPO}/releases/tags/${tag}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(process.env.GH_TOKEN && {
          Authorization: `Bearer ${process.env.GH_TOKEN}`,
        }),
      },
    },
  );
  if (!response.ok) {
    throw new Error(
      `fetching upstream release ${tag}: HTTP ${response.status}`,
    );
  }
  const release = await response.json();
  return release.body ?? '';
}

async function main([command]) {
  const base = upstreamBase();
  switch (command) {
    case 'upstream-base': {
      return base;
    }
    case 'next-version': {
      return nextForkVersion(base, git('tag', '--list').split('\n'));
    }
    case 'notes': {
      return (
        forkReleaseHeader({
          upstreamTag: base,
          changes: carriedChanges(base),
        }) + rewriteUpstreamNotes(await upstreamNotes(base))
      );
    }
    default: {
      throw new Error(`unknown command: ${command}`);
    }
  }
}

// CommonJS entry point (top-level await is not available here).
// eslint-disable-next-line sonar/different-types-comparison
if (require.main === module) {
  // eslint-disable-next-line unicorn/prefer-top-level-await
  main(process.argv.slice(2)).then(
    output => process.stdout.write(`${output}\n`),
    error => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    },
  );
}

module.exports = {
  nextForkVersion,
  rewriteUpstreamNotes,
  forkReleaseHeader,
  carriedChanges,
};
