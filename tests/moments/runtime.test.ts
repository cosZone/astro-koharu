import assert from 'node:assert/strict';
import test from 'node:test';
import { readKoharuSuiteUrl, toMomentsHttpError } from '../../src/features/moments/lib/runtime';

const mutableEnv = process.env as Record<string, string | undefined>;

test('normalizes a valid suite origin', () => {
  const previous = mutableEnv.KOHARU_SUITE_URL;
  mutableEnv.KOHARU_SUITE_URL = 'https://suite.example.com/';
  try {
    assert.equal(readKoharuSuiteUrl(), 'https://suite.example.com');
  } finally {
    if (previous === undefined) delete mutableEnv.KOHARU_SUITE_URL;
    else mutableEnv.KOHARU_SUITE_URL = previous;
  }
});

test('rejects suite URLs with credentials, query, or fragments', () => {
  const previous = mutableEnv.KOHARU_SUITE_URL;
  try {
    for (const value of [
      'https://user@suite.example.com',
      'https://suite.example.com?token=secret',
      'https://suite.example.com#fragment',
      'https://suite.example.com/api',
      'file:///tmp/suite',
    ]) {
      mutableEnv.KOHARU_SUITE_URL = value;
      assert.throws(() => readKoharuSuiteUrl(), /HTTP\(S\) origin/);
    }
  } finally {
    if (previous === undefined) delete mutableEnv.KOHARU_SUITE_URL;
    else mutableEnv.KOHARU_SUITE_URL = previous;
  }
});

test('maps unknown runtime failures to a non-cacheable 503 response', () => {
  assert.deepEqual(toMomentsHttpError(new Error('synthetic failure')), { status: 503, type: 'unavailable' });
});
