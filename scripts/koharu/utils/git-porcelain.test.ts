import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeRemoteUrl } from './git-porcelain';

test('upstream recognizes HTTPS, SCP-style SSH and SSH URLs as the same repository', () => {
  const expected = normalizeRemoteUrl('https://github.com/cosZone/astro-koharu.git');
  for (const remote of [
    'git@github.com:cosZone/astro-koharu.git',
    'git@github.com:cosZone/astro-koharu',
    'ssh://git@github.com/cosZone/astro-koharu.git',
    'https://github.com/cosZone/astro-koharu',
    '  git@github.com:cosZone/astro-koharu.git\n',
  ]) {
    assert.equal(normalizeRemoteUrl(remote), expected, remote);
  }
});

test('upstream still rejects a different host, owner or repository', () => {
  const expected = normalizeRemoteUrl('https://github.com/cosZone/astro-koharu.git');
  for (const remote of [
    'git@gitlab.com:cosZone/astro-koharu.git',
    'git@github.com:someone/astro-koharu.git',
    'git@github.com:cosZone/another-repo.git',
  ]) {
    assert.notEqual(normalizeRemoteUrl(remote), expected, remote);
  }
});
