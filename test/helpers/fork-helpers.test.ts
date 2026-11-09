import { releaseNotesRepo } from '../../src/helpers/fork-helpers';

describe('releaseNotesRepo', () => {
  it.each(['v7.2.3-luggld.1', 'v7.2.4-luggld.12'])(
    "reads fork release %s from the fork's releases",
    tag => {
      expect(releaseNotesRepo(tag)).toEqual({
        owner: 'LuggLD',
        repo: 'ferdium-app',
      });
    },
  );

  it.each(['v7.2.3', 'v7.2.4-nightly.3', 'v6.0.0-beta.3'])(
    "reads upstream release %s from upstream's releases",
    tag => {
      expect(releaseNotesRepo(tag)).toEqual({
        owner: 'ferdium',
        repo: 'ferdium-app',
      });
    },
  );
});
