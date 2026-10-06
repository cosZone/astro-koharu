import assert from 'node:assert/strict';
import test from 'node:test';
import { groupFriendLinks, normalizeFriendGroups } from './friends';
import type { FriendLink } from './types';

const groups = normalizeFriendGroups([
  { id: 'familiar', title: '熟人', description: '常有交流的朋友' },
  { id: 'community', title: '友链小伙伴' },
  { id: 'following', title: '单向关注' },
]);

function friend(owner: string, group?: string): FriendLink {
  return { owner, site: owner, url: `https://${owner}.example`, desc: '', image: '', ...(group ? { group } : {}) };
}

test('legacy configurations retain every link in its original order', () => {
  const data = [friend('one'), friend('two', 'following')];
  assert.deepEqual(normalizeFriendGroups(undefined), []);
  assert.deepEqual(normalizeFriendGroups(null), []);
  assert.deepEqual(groupFriendLinks(data, []), [{ group: null, friends: data }]);
});

test('groups follow configuration order and links retain their order within each group', () => {
  const data = [friend('first', 'following'), friend('second', 'familiar'), friend('third', 'following')];
  const original = structuredClone(data);
  const sections = groupFriendLinks(data, groups);
  assert.deepEqual(
    sections.map((section) => section.group?.id),
    ['familiar', 'community', 'following'],
  );
  assert.deepEqual(
    sections.map((section) => section.friends.map((item) => item.owner)),
    [['second'], [], ['first', 'third']],
  );
  assert.deepEqual(data, original);
});

test('missing and unknown assignments remain visible in an ungrouped section', () => {
  const data = [friend('known', 'community'), friend('missing'), friend('typo', 'commmunity')];
  const sections = groupFriendLinks(data, groups);
  assert.deepEqual(sections.at(-1), { group: null, friends: data.slice(1) });
  assert.equal(sections.flatMap((section) => section.friends).length, data.length);
});

test('empty configured groups remain available and an unnecessary ungrouped section is omitted', () => {
  assert.equal(groupFriendLinks([], groups).length, 3);
  assert.deepEqual(groupFriendLinks([], []), [{ group: null, friends: [] }]);
});

test('group IDs cannot collide with system filters and sections', () => {
  for (const id of ['all', 'ungrouped', ' all ', ' ungrouped ']) {
    assert.throws(() => normalizeFriendGroups([{ id, title: '自定义分组' }]), /is reserved/);
  }
});

test('normalizes IDs and titles, and rejects ambiguous or invalid group definitions', () => {
  assert.deepEqual(normalizeFriendGroups([{ id: ' familiar ', title: ' 熟人 ' }]), [{ id: 'familiar', title: '熟人' }]);
  assert.throws(() => normalizeFriendGroups({ id: 'familiar' }), /must be an array/);
  assert.throws(() => normalizeFriendGroups([null]), /must be an object/);
  for (const value of [{}, { id: 'familiar' }, { title: '熟人' }, { id: 1, title: '熟人' }, { id: 'familiar', title: 1 }]) {
    assert.throws(() => normalizeFriendGroups([value]), /non-empty id and title/);
  }
  assert.throws(() => normalizeFriendGroups([{ id: ' ', title: '熟人' }]), /non-empty id and title/);
  assert.throws(() => normalizeFriendGroups([{ id: 'familiar', title: '熟人', description: 1 }]), /must be a string/);
  assert.throws(
    () =>
      normalizeFriendGroups([
        { id: 'familiar', title: '熟人' },
        { id: ' familiar ', title: '另一组' },
      ]),
    /duplicate group id/,
  );
});
