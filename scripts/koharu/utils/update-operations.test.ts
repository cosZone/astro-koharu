import assert from 'node:assert/strict';
import test from 'node:test';

import { getPackageManagerInstallCommand } from './update-operations';

test('dependency installation uses the exact pnpm version declared by packageManager', () => {
  const command = getPackageManagerInstallCommand('pnpm@10.28.2');

  assert.equal(command.command, process.platform === 'win32' ? 'npx.cmd' : 'npx');
  assert.deepEqual(command.args, ['--yes', 'pnpm@10.28.2', 'install']);
});

test('dependency installation falls back to the pin captured before checking out a legacy tag', () => {
  const command = getPackageManagerInstallCommand(undefined, 'pnpm@10.28.2');

  assert.deepEqual(command.args, ['--yes', 'pnpm@10.28.2', 'install']);
});

test('dependency installation prefers a target version pin over the captured fallback', () => {
  const command = getPackageManagerInstallCommand('pnpm@11.1.0', 'pnpm@10.28.2');

  assert.deepEqual(command.args, ['--yes', 'pnpm@11.1.0', 'install']);
});

test('dependency installation rejects missing or floating pnpm versions', () => {
  assert.throws(() => getPackageManagerInstallCommand(undefined), /packageManager/);
  assert.throws(() => getPackageManagerInstallCommand('pnpm@10'), /packageManager/);
  assert.throws(() => getPackageManagerInstallCommand('npm@11.0.0'), /packageManager/);
  assert.throws(() => getPackageManagerInstallCommand('pnpm@10', 'pnpm@10.28.2'), /packageManager/);
});
