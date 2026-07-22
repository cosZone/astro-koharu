import assert from 'node:assert/strict';
import test from 'node:test';

import { parseArgs } from './args';

test('parses migrate check mode without changing update check parsing', () => {
  const migrate = parseArgs(['migrate', '--check']);
  assert.equal(migrate.command, 'migrate');
  assert.equal(migrate.check, true);
  assert.equal(migrate.dryRun, false);

  const update = parseArgs(['update', '--check']);
  assert.equal(update.command, 'update');
  assert.equal(update.check, true);
});
