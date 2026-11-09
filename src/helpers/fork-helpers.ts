// LuggLD fork: helpers for behaviour that differs in fork builds.

/** Fork releases are tagged like v7.2.4-luggld.1 (see .github/fork/release.js). */
const FORK_TAG = /-luggld\.\d+$/;

/**
 * GitHub repository holding the release notes for `tag`. Fork releases live
 * on the fork (their notes include upstream's); everything else upstream.
 */
export const releaseNotesRepo = (
  tag: string,
): { owner: string; repo: string } =>
  FORK_TAG.test(tag)
    ? { owner: 'LuggLD', repo: 'ferdium-app' }
    : { owner: 'ferdium', repo: 'ferdium-app' };
