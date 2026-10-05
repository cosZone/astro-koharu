import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import YAML from 'yaml';
import { appendFriend } from './new-operations';

const entry = {
  site: 'Example',
  url: 'https://example.com',
  owner: 'Example',
  desc: 'Test',
  image: 'https://example.com/avatar.png',
};

async function withConfig(content: string, run: (file: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'koharu-friend-groups-'));
  const file = path.join(dir, 'site.yaml');
  try {
    await fs.writeFile(file, content);
    await run(file);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('adding a grouped link preserves existing entries and YAML comments', async () => {
  const content =
    '# keep this comment\nfriends:\n  groups:\n    - id: following\n      title: 单向关注\n  data:\n    - site: Existing # keep entry comment\n      url: https://existing.example\n';
  await withConfig(content, async (file) => {
    const existing = YAML.parse(content).friends.data[0];
    await appendFriend({ ...entry, group: 'following', color: '#76B900' }, file);
    const output = await fs.readFile(file, 'utf8');
    const data = YAML.parse(output).friends.data;
    assert.deepEqual(data[0], existing);
    assert.deepEqual(data[1], { ...entry, group: 'following', color: '#76B900' });
    assert.match(output, /keep this comment/);
    assert.match(output, /keep entry comment/);
  });
});

test('an unknown group is rejected before writing the configuration', async () => {
  const content = 'friends:\n  groups:\n    - id: following\n      title: 单向关注\n  data: []\n';
  await withConfig(content, async (file) => {
    await assert.rejects(appendFriend({ ...entry, group: 'removed-group' }, file), /no longer exists/);
    assert.equal(await fs.readFile(file, 'utf8'), content);
  });
});

test('legacy configurations can still add ungrouped links without introducing new fields', async () => {
  await withConfig('friends:\n  data: []\n', async (file) => {
    await appendFriend(entry, file);
    assert.deepEqual(YAML.parse(await fs.readFile(file, 'utf8')), { friends: { data: [entry] } });
  });
});
