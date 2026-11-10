# LuggLD fork of Ferdium

This checkout is **LuggLD/ferdium-app**, the user's fork of `ferdium/ferdium-app`.
These rules come on top of the root `CLAUDE.md` (which is upstream's file).

## NEVER open pull requests on upstream (HARD RULE)

**Never open a pull request against `ferdium/ferdium-app` (upstream)** unless
the user explicitly asks for that specific PR. The same goes for anything
else that writes to upstream: issues, comments, reviews, releases. The user
does not want to vouch for Claude-written code in the upstream project; fork
changes stay on the fork.

`gh` in a fork **defaults to the parent repository**, so be explicit every time:

- Always pass `--repo LuggLD/ferdium-app` (and `--base luggld` for PRs).
- `gh repo set-default --view` must print `LuggLD/ferdium-app`; if it doesn't,
  run `gh repo set-default LuggLD/ferdium-app` before any `gh` write command.
- Before creating a PR, double-check the target repo in the command. When in
  doubt, ask.

## Branches and pull requests

- **`luggld`** is the main branch: upstream's newest stable release plus the
  fork's commits. It is the default branch on GitHub.
- **Every push to `luggld` publishes a release** that installed apps
  auto-update to (`.github/workflows/luggld-release.yml`). So never push to
  it directly: branch off `luggld` (`fix/…`, `feat/…`, `chore/…`), push the
  branch, and open a PR **into `luggld` on LuggLD/ferdium-app**:
  `gh pr create --repo LuggLD/ferdium-app --base luggld …`
- PRs run `.github/workflows/luggld-checks.yml` (typecheck, lint, tests,
  real-Electron quit test; no builds). Merging is the release; batch related
  fixes into one PR where it makes sense. The user decides when to merge.
- Only exception: the daily `luggld-sync.yml` rebases `luggld` onto new
  upstream stable releases and pushes itself, after running the same checks.
- Other branches on the fork (`develop`, `nightly`, `release`, …) are stale
  copies of upstream's; don't use them.

## Conventions for fork code

- Keep fork-only code in **separate files** where possible
  (`.github/fork/`, `electron-builder.fork.js`, `src/helpers/fork-helpers.ts`),
  so rebasing onto upstream rarely conflicts. Keep edits to upstream files small.
- Commit prefix `chore(fork):` for fork maintenance (CI, build config); those
  commits are left out of the release notes' list of carried changes.
  User-facing fixes use normal prefixes (`fix:`, `fix(fork):`) and are listed.
- **Test builds**: run "LuggLD release" manually with `test_build` ticked. It
  publishes a pre-release only offered to installs with Settings → Updates →
  "Include pre-releases" on; don't make throwaway *regular* releases.
