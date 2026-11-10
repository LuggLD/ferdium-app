import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { carriedChanges } from '../../.github/fork/release';

// A real git repository shaped like `luggld`: an upstream release tag, fork
// commits on top, and a merged pull request.
let repo: string;
const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
const commit = (message: string) => {
  writeFileSync(path.join(repo, 'file.txt'), `${message}\n`);
  git('add', 'file.txt');
  git('commit', '-q', '-m', message);
};

beforeAll(() => {
  repo = mkdtempSync(path.join(tmpdir(), 'ferdium-carried-changes-'));
  git('init', '-q', '-b', 'luggld');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');
  commit('upstream: release 7.2.3');
  git('tag', 'v7.2.3');
  commit('fix: unload service webviews before quitting');
  git('switch', '-q', '-c', 'chore/pr-workflow');
  commit('chore(fork): pull-request workflow for luggld');
  commit('fix(fork): show release notes for fork builds');
  git('switch', '-q', 'luggld');
  git(
    'merge',
    '-q',
    '--no-ff',
    '-m',
    'Merge pull request #1 from LuggLD/chore/pr-workflow',
    'chore/pr-workflow',
  );
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('carriedChanges', () => {
  it('lists fork commits since the upstream base, oldest first, without merges or fork maintenance', () => {
    expect(carriedChanges('v7.2.3', repo)).toEqual([
      'fix: unload service webviews before quitting',
      'fix(fork): show release notes for fork builds',
    ]);
  });
});
