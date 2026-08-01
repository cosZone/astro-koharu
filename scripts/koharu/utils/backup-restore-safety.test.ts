import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { BACKUP_ITEMS, BACKUP_SCHEMA_VERSION, createWorkspace, type KoharuWorkspace, MANIFEST_NAME } from '../constants';
import { getBackupList, getRestorableBackupList } from './backup';
import { validateBackupSource } from './backup-operations';
import { getRestorePreview, restoreBackup } from './restore-operations';
import { tarCreate, tarExtract } from './tar';
import { validateBackupArchive, withValidatedBackupArchiveSnapshot } from './validation';

/** Every test runs against a throwaway workspace so the project's real backups are never touched. */
function createTestWorkspace(prefix: string): KoharuWorkspace {
  const workspace = createWorkspace(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  fs.mkdirSync(workspace.backupDir, { recursive: true });
  return workspace;
}

function removeWorkspace(workspace: KoharuWorkspace): void {
  fs.rmSync(workspace.root, { recursive: true, force: true });
}

function createArchive(workspace: KoharuWorkspace, stage: string): string {
  const archive = path.join(workspace.backupDir, `backup-safety-${process.pid}-${Date.now()}-${Math.random()}.tar.gz`);
  tarCreate(archive, stage);
  return archive;
}

function writeBasicManifest(
  stage: string,
  presentDestinations: string[],
  schemaVersion: number | null = BACKUP_SCHEMA_VERSION,
): void {
  const present = new Set(presentDestinations);
  const manifest = {
    name: MANIFEST_NAME,
    ...(schemaVersion === null ? {} : { schemaVersion }),
    version: 'test',
    type: 'basic',
    timestamp: 'test',
    created_at: new Date(0).toISOString(),
    files: Object.fromEntries(BACKUP_ITEMS.filter((item) => item.required).map((item) => [item.dest, present.has(item.dest)])),
  };
  fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(manifest));
}

function writeLegacyManifest(
  stage: string,
  destinations: string[],
  presentDestinations: string[] = [],
  type: 'basic' | 'full' = 'basic',
): void {
  const present = new Set(presentDestinations);
  fs.writeFileSync(
    path.join(stage, 'manifest.json'),
    JSON.stringify({
      name: MANIFEST_NAME,
      version: 'legacy-test',
      type,
      timestamp: 'test',
      created_at: new Date(0).toISOString(),
      files: Object.fromEntries(destinations.map((destination) => [destination, present.has(destination)])),
    }),
  );
}

function writePost(root: string, relativePath: string, link: string): void {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `---\nlink: '${link}'\ntitle: test\ndate: 2026-01-01\n---\nbody\n`);
}

test('backup archives are private and historical v1 manifests remain valid', () => {
  const workspace = createTestWorkspace('koharu-backup-v1-');
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-backup-v1-stage-'));
  try {
    writeBasicManifest(stage, [], null);
    const archive = createArchive(workspace, stage);

    assert.equal(fs.statSync(archive).mode & 0o777, 0o600);
    assert.equal(validateBackupArchive(archive, workspace.backupDir).manifest.schemaVersion, 1);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
    removeWorkspace(workspace);
  }
});

test('validation and extraction use one private immutable archive snapshot', () => {
  const workspace = createTestWorkspace('koharu-backup-snapshot-');
  const originalStage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-backup-snapshot-original-'));
  const replacementStage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-backup-snapshot-replacement-'));
  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-backup-snapshot-extract-'));
  let snapshotPath = '';

  try {
    fs.writeFileSync(path.join(originalStage, 'env'), 'original');
    writeBasicManifest(originalStage, ['env']);
    const originalArchive = createArchive(workspace, originalStage);

    fs.writeFileSync(path.join(replacementStage, 'env'), 'replacement');
    writeBasicManifest(replacementStage, ['env']);
    const replacementArchive = createArchive(workspace, replacementStage);

    withValidatedBackupArchiveSnapshot(
      originalArchive,
      (validated) => {
        snapshotPath = validated.path;
        assert.notEqual(snapshotPath, originalArchive);
        assert.equal(fs.statSync(snapshotPath).mode & 0o777, 0o400);

        fs.copyFileSync(replacementArchive, originalArchive);
        tarExtract(validated.path, extractDir);
        assert.equal(fs.readFileSync(path.join(extractDir, 'env'), 'utf8'), 'original');
      },
      workspace.backupDir,
    );

    assert.equal(fs.existsSync(snapshotPath), false);
    assert.equal(fs.existsSync(path.dirname(snapshotPath)), false);
  } finally {
    fs.rmSync(originalStage, { recursive: true, force: true });
    fs.rmSync(replacementStage, { recursive: true, force: true });
    fs.rmSync(extractDir, { recursive: true, force: true });
    removeWorkspace(workspace);
  }
});

test('every historical basic manifest layout resolves to current restore targets', () => {
  const workspace = createTestWorkspace('koharu-backup-layout-');
  const layouts = [
    ['content/blog', 'config/site.yaml', 'pages/about.md', 'img/avatar.webp', 'env'],
    ['content/blog', 'config/site.yaml', 'pages/about.md', 'img', 'env'],
    ['content/blog', 'config/site.yaml', 'config/cms.yaml', 'pages/about.md', 'img', 'env'],
    ['content/blog', 'config/site.yaml', 'pages', 'img', 'env'],
    ['content/blog', 'config', 'pages', 'img', 'env'],
  ];
  const stages: string[] = [];

  try {
    for (const destinations of layouts) {
      const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-backup-layout-stage-'));
      stages.push(stage);
      writeLegacyManifest(stage, destinations);
      const archive = createArchive(workspace, stage);

      const validated = validateBackupArchive(archive, workspace.backupDir);
      assert.equal(validated.manifest.schemaVersion, 1);
      assert.deepEqual(
        validated.items.map((item) => item.dest),
        destinations,
      );
    }
  } finally {
    for (const stage of stages) fs.rmSync(stage, { recursive: true, force: true });
    removeWorkspace(workspace);
  }
});

test('historical file-level backup items restore to their original project paths', () => {
  const workspace = createTestWorkspace('koharu-legacy-restore-target-');
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-legacy-restore-stage-'));

  try {
    fs.mkdirSync(path.join(stage, 'config'), { recursive: true });
    fs.mkdirSync(path.join(stage, 'pages'), { recursive: true });
    fs.mkdirSync(path.join(stage, 'img'), { recursive: true });
    fs.writeFileSync(path.join(stage, 'config/site.yaml'), 'site:\n  title: restored\n');
    fs.writeFileSync(path.join(stage, 'pages/about.md'), 'restored about');
    fs.writeFileSync(path.join(stage, 'img/avatar.webp'), 'restored avatar');
    writeLegacyManifest(
      stage,
      ['content/blog', 'config/site.yaml', 'pages/about.md', 'img/avatar.webp', 'env'],
      ['config/site.yaml', 'pages/about.md', 'img/avatar.webp'],
    );
    const archive = createArchive(workspace, stage);

    const preview = getRestorePreview(archive, { workspace });
    assert.deepEqual(
      preview.items.map((item) => item.path),
      ['config/site.yaml', 'src/pages/about.md', 'public/img/avatar.webp'],
    );

    const output = restoreBackup(archive, { workspace });
    assert.deepEqual(output.restoredFiles, ['config/site.yaml', 'src/pages/about.md', 'public/img/avatar.webp']);
    assert.equal(fs.readFileSync(path.join(workspace.root, 'config/site.yaml'), 'utf8'), 'site:\n  title: restored\n');
    assert.equal(fs.readFileSync(path.join(workspace.root, 'src/pages/about.md'), 'utf8'), 'restored about');
    assert.equal(fs.readFileSync(path.join(workspace.root, 'public/img/avatar.webp'), 'utf8'), 'restored avatar');
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
    removeWorkspace(workspace);
  }
});

test('historical full image snapshots supersede the overlapping avatar item', () => {
  const workspace = createTestWorkspace('koharu-legacy-full-target-');
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-legacy-full-stage-'));

  try {
    const destinations = [
      'content/blog',
      'config/site.yaml',
      'pages/about.md',
      'img/avatar.webp',
      'env',
      'img',
      'favicon.ico',
      'assets/lqips.json',
      'assets/similarities.json',
      'assets/summaries.json',
    ];
    fs.mkdirSync(path.join(stage, 'img'), { recursive: true });
    fs.writeFileSync(path.join(stage, 'img/avatar.webp'), 'restored avatar');
    fs.writeFileSync(path.join(stage, 'img/cover.webp'), 'restored cover');
    writeLegacyManifest(stage, destinations, ['img/avatar.webp', 'img'], 'full');
    const archive = createArchive(workspace, stage);

    const preview = getRestorePreview(archive, { workspace });
    assert.deepEqual(
      preview.items.map((item) => item.path),
      ['public/img'],
    );

    const output = restoreBackup(archive, { workspace });
    assert.deepEqual(output.restoredFiles, ['public/img']);
    assert.equal(fs.readFileSync(path.join(workspace.root, 'public/img/avatar.webp'), 'utf8'), 'restored avatar');
    assert.equal(fs.readFileSync(path.join(workspace.root, 'public/img/cover.webp'), 'utf8'), 'restored cover');
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
    removeWorkspace(workspace);
  }
});

test('backup source validation rejects contract mismatches and nested symlinks', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-backup-source-contract-'));
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-backup-source-external-'));
  const directoryItem = BACKUP_ITEMS.find((item) => item.dest === 'content/blog');
  const fileItem = BACKUP_ITEMS.find((item) => item.dest === 'env');

  try {
    assert.ok(directoryItem);
    assert.ok(fileItem);

    const wrongDirectory = path.join(root, 'wrong-directory');
    fs.writeFileSync(wrongDirectory, 'not a directory');
    assert.throws(() => validateBackupSource(directoryItem, wrongDirectory), /类型无效，应为目录/);

    const wrongFile = path.join(root, 'wrong-file');
    fs.mkdirSync(wrongFile);
    assert.throws(() => validateBackupSource(fileItem, wrongFile), /类型无效，应为普通文件/);

    const sourceDirectory = path.join(root, 'content');
    fs.mkdirSync(sourceDirectory);
    fs.symlinkSync(external, path.join(sourceDirectory, 'linked'), 'dir');
    assert.throws(() => validateBackupSource(directoryItem, sourceDirectory), /包含符号链接/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(external, { recursive: true, force: true });
  }
});

test('restore rejects missing or inconsistent manifests before preview', () => {
  const workspace = createTestWorkspace('koharu-backup-manifest-');
  const missingStage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-backup-missing-manifest-'));
  const inconsistentStage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-backup-inconsistent-manifest-'));
  try {
    fs.writeFileSync(path.join(missingStage, 'unexpected.txt'), 'unexpected');
    const missingArchive = createArchive(workspace, missingStage);
    assert.throws(() => getRestorePreview(missingArchive, { workspace }), /缺少 manifest\.json/);
    assert.equal(
      getBackupList(workspace).some((backup) => backup.path === missingArchive),
      true,
    );
    assert.equal(
      getRestorableBackupList(workspace).some((backup) => backup.path === missingArchive),
      false,
    );

    fs.mkdirSync(path.join(inconsistentStage, 'img'), { recursive: true });
    fs.writeFileSync(path.join(inconsistentStage, 'img/restored.txt'), 'restored');
    writeBasicManifest(inconsistentStage, []);
    const inconsistentArchive = createArchive(workspace, inconsistentStage);
    assert.throws(() => getRestorePreview(inconsistentArchive, { workspace }), /files\.img 与归档内容不一致/);
  } finally {
    fs.rmSync(missingStage, { recursive: true, force: true });
    fs.rmSync(inconsistentStage, { recursive: true, force: true });
    removeWorkspace(workspace);
  }
});

test('restore rejects archive items whose type disagrees with the backup contract', () => {
  const workspace = createTestWorkspace('koharu-restore-type-target-');
  const directoryAsFileStage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-restore-dir-as-file-'));
  const fileAsDirectoryStage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-restore-file-as-dir-'));

  try {
    writePost(path.join(workspace.root, 'src/content/blog'), 'old.md', 'old');

    fs.mkdirSync(path.join(directoryAsFileStage, 'content'), { recursive: true });
    fs.writeFileSync(path.join(directoryAsFileStage, 'content/blog'), 'not a directory');
    writeBasicManifest(directoryAsFileStage, ['content/blog']);
    const directoryAsFileArchive = createArchive(workspace, directoryAsFileStage);

    fs.mkdirSync(path.join(fileAsDirectoryStage, 'env'), { recursive: true });
    fs.writeFileSync(path.join(fileAsDirectoryStage, 'env/value'), 'not a file');
    writeBasicManifest(fileAsDirectoryStage, ['env']);
    const fileAsDirectoryArchive = createArchive(workspace, fileAsDirectoryStage);

    assert.throws(() => getRestorePreview(directoryAsFileArchive, { workspace }), /content\/blog 类型无效，应为目录/);
    assert.throws(() => restoreBackup(directoryAsFileArchive, { workspace }), /content\/blog 类型无效，应为目录/);
    assert.throws(() => getRestorePreview(fileAsDirectoryArchive, { workspace }), /env 类型无效，应为普通文件/);
    assert.throws(() => restoreBackup(fileAsDirectoryArchive, { workspace }), /env 类型无效，应为普通文件/);
    assert.equal(fs.existsSync(path.join(workspace.root, 'src/content/blog/old.md')), true);
  } finally {
    fs.rmSync(directoryAsFileStage, { recursive: true, force: true });
    fs.rmSync(fileAsDirectoryStage, { recursive: true, force: true });
    removeWorkspace(workspace);
  }
});

test('restore rejects symlink archive entries before extraction', () => {
  const workspace = createTestWorkspace('koharu-restore-archive-symlink-target-');
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-restore-archive-symlink-external-'));
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-restore-archive-symlink-stage-'));

  try {
    fs.mkdirSync(path.join(stage, 'content'), { recursive: true });
    fs.symlinkSync(external, path.join(stage, 'content/blog'), 'dir');
    writeBasicManifest(stage, ['content/blog']);
    const archive = createArchive(workspace, stage);

    assert.throws(() => getRestorePreview(archive, { workspace }), /unsupported type/);
    assert.throws(() => restoreBackup(archive, { workspace }), /unsupported type/);
    assert.deepEqual(fs.readdirSync(external), []);
  } finally {
    fs.rmSync(external, { recursive: true, force: true });
    fs.rmSync(stage, { recursive: true, force: true });
    removeWorkspace(workspace);
  }
});

test('content migration errors leave every existing restore target unchanged', () => {
  const workspace = createTestWorkspace('koharu-restore-migration-error-');
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-restore-migration-stage-'));
  try {
    writePost(path.join(workspace.root, 'src/content/blog'), 'old.md', 'old');
    writePost(path.join(stage, 'content/blog'), 'first.md', 'duplicate');
    writePost(path.join(stage, 'content/blog'), 'second.md', 'duplicate');
    writeBasicManifest(stage, ['content/blog']);
    const archive = createArchive(workspace, stage);

    assert.throws(() => restoreBackup(archive, { workspace }), /内容迁移存在 2 个错误/);
    assert.equal(fs.existsSync(path.join(workspace.root, 'src/content/blog/old.md')), true);
    assert.equal(fs.existsSync(path.join(workspace.root, 'src/content/blog/first.md')), false);
    assert.equal(
      fs.readdirSync(workspace.root).some((entry) => entry.startsWith('.koharu-restore-')),
      false,
    );
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
    removeWorkspace(workspace);
  }
});

test('a commit failure rolls back targets already switched to restored candidates', () => {
  const workspace = createTestWorkspace('koharu-restore-rollback-');
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-restore-rollback-stage-'));
  const originalRenameSync = fs.renameSync;
  let injected = false;

  try {
    writePost(path.join(workspace.root, 'src/content/blog'), 'old.md', 'old');
    fs.mkdirSync(path.join(workspace.root, 'public/img'), { recursive: true });
    fs.writeFileSync(path.join(workspace.root, 'public/img/old.txt'), 'old');
    writePost(path.join(stage, 'content/blog'), 'new.md', 'new');
    fs.mkdirSync(path.join(stage, 'img'), { recursive: true });
    fs.writeFileSync(path.join(stage, 'img/new.txt'), 'new');
    writeBasicManifest(stage, ['content/blog', 'img']);
    const archive = createArchive(workspace, stage);

    Object.defineProperty(fs, 'renameSync', {
      configurable: true,
      writable: true,
      value: ((oldPath: fs.PathLike, newPath: fs.PathLike) => {
        if (!injected && String(oldPath).includes(`${path.sep}next${path.sep}img`)) {
          injected = true;
          throw new Error('injected commit failure');
        }
        return originalRenameSync(oldPath, newPath);
      }) satisfies typeof fs.renameSync,
    });

    assert.throws(() => restoreBackup(archive, { workspace }), /injected commit failure/);
    assert.equal(injected, true);
    assert.equal(fs.existsSync(path.join(workspace.root, 'src/content/blog/old.md')), true);
    assert.equal(fs.existsSync(path.join(workspace.root, 'src/content/blog/new.md')), false);
    assert.equal(fs.readFileSync(path.join(workspace.root, 'public/img/old.txt'), 'utf8'), 'old');
    assert.equal(fs.existsSync(path.join(workspace.root, 'public/img/new.txt')), false);
    assert.equal(
      fs.readdirSync(workspace.root).some((entry) => entry.startsWith('.koharu-restore-')),
      false,
    );
  } finally {
    Object.defineProperty(fs, 'renameSync', {
      configurable: true,
      writable: true,
      value: originalRenameSync,
    });
    fs.rmSync(stage, { recursive: true, force: true });
    removeWorkspace(workspace);
  }
});
