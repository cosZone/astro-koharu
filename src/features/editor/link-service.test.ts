import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeOGEndpoint, readOGEndpoint, saveOGEndpoint } from './link-service';

const page = 'https://blog.example/editor';

test('instance origins use the default OG route and custom routes are preserved', () => {
  assert.equal(normalizeOGEndpoint(' https://og.example/ ', page), 'https://og.example/api/editor/og');
  assert.equal(normalizeOGEndpoint('https://og.example/custom', page), 'https://og.example/custom');
  assert.equal(
    normalizeOGEndpoint('http://localhost:4323', 'http://localhost:4325/editor'),
    'http://localhost:4323/api/editor/og',
  );
});

test('instances reject unsafe protocols, credentials, URL parameters and mixed content', () => {
  for (const value of [
    '',
    'javascript:alert(1)',
    '//og.example',
    'http://og.example',
    'https://user:password@og.example',
    'https://og.example?token=value',
    'https://og.example/#fragment',
    'https://',
  ]) {
    assert.throws(() => normalizeOGEndpoint(value, page), value);
  }
});

test('settings persist independently from source drafts and can reset to the deployment default', () => {
  const values = new Map<string, string>();
  values.set('koharu-editor:draft:existing', 'original');
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const endpoint = normalizeOGEndpoint('https://og.example', page);
  saveOGEndpoint(storage, endpoint);
  assert.equal(readOGEndpoint(storage, page), endpoint);
  saveOGEndpoint(storage, null);
  assert.equal(readOGEndpoint(storage, page), null);
  assert.equal(values.get('koharu-editor:draft:existing'), 'original');
  storage.setItem('koharu-editor:og-endpoint:v1', 'javascript:alert(1)');
  assert.equal(readOGEndpoint(storage, page), null);
  assert.equal(
    readOGEndpoint(
      {
        getItem: () => {
          throw new Error('blocked');
        },
      },
      page,
    ),
    null,
  );
});
