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

test('appending preserves all original block YAML bytes, including following section comments', async () => {
  const content =
    '# header\nsite:\n  keywords: # inline comment\n    - "Astro"\n# friends heading\nfriends:\n  data: # keep here\n    - site: \'Existing\' # entry comment\n      url: https://existing.example\n\n# next heading\nother: { enabled: true }\n';
  const sequence = YAML.parseDocument(content).getIn(['friends', 'data'], true);
  assert.ok(YAML.isSeq(sequence));
  const offset = sequence.range?.[1];
  assert.ok(offset);
  await withConfig(content, async (file) => {
    await appendFriend({ ...entry, desc: 'First line\nSecond line: # literal' }, file);
    const output = await fs.readFile(file, 'utf8');
    assert.equal(output.slice(0, offset), content.slice(0, offset));
    assert.ok(output.endsWith(content.slice(offset)));
    assert.equal(YAML.parse(output).friends.data[1].desc, 'First line\nSecond line: # literal');
  });
});

test('flow arrays, trailing commas, CRLF and indentationless sequences retain their original source', async () => {
  for (const content of [
    'friends:\n  data: [] # keep inline\n',
    'friends: { data: [ {site: Existing}, ] } # keep flow\n',
    'friends:\n  data:\n  - site: Existing\n# footer\n',
    'friends:\r\n  data:\r\n    - site: Existing\r\n# footer\r\n',
  ]) {
    await withConfig(content, async (file) => {
      const existing = YAML.parse(content).friends.data;
      await appendFriend(entry, file);
      const output = await fs.readFile(file, 'utf8');
      assert.deepEqual(YAML.parse(output).friends.data, [...existing, entry]);
      if (content.includes('\r\n')) assert.equal(output.replaceAll('\r\n', '').includes('\n'), false);
      assert.ok(output.includes(content.includes('flow') ? '{site: Existing},' : '#'));
    });
  }
});

test('invalid YAML and non-array friend data are rejected without changing the source', async () => {
  for (const content of ['friends:\n  data: [\n', 'friends:\n  data: wrong\n', 'friends: []\n']) {
    await withConfig(content, async (file) => {
      await assert.rejects(appendFriend(entry, file));
      assert.equal(await fs.readFile(file, 'utf8'), content);
    });
  }
});
