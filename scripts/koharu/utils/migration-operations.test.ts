import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { globSync } from 'glob';
import matter from 'gray-matter';

import { BLOG_CONTENT_GLOB_PATTERN, isBlogContentFile } from '../../../src/lib/content/glob';
import { BACKUP_DIR, BACKUP_ITEMS, BACKUP_SCHEMA_VERSION, MANIFEST_NAME, PROJECT_ROOT } from '../constants';
import { applyContentMigration, planContentMigration, runContentMigration } from './migration-operations';
import { getRestorePreview, restoreBackup } from './restore-operations';
import { tarCreate } from './tar';

function writeSiteConfig(root: string, enableSlugTransliteration = false): string {
  const configPath = path.join(root, 'config/site.yaml');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(
    configPath,
    `site:\n  enableSlugTransliteration: ${enableSlugTransliteration}\ni18n:\n  defaultLocale: zh\n  locales:\n    - code: zh\n    - code: en\n    - code: pt-BR\n`,
  );
  return configPath;
}

function writePost(contentDir: string, relativePath: string, frontmatter: string): string {
  const filePath = path.join(contentDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `---\n${frontmatter}title: test\ndate: 2026-01-01\n---\nbody\n`);
  return filePath;
}

function writeBackupManifest(stage: string, presentDestinations: string[]): void {
  const present = new Set(presentDestinations);
  const manifest = {
    name: MANIFEST_NAME,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    version: 'test',
    type: 'basic',
    timestamp: 'test',
    created_at: new Date(0).toISOString(),
    files: Object.fromEntries(BACKUP_ITEMS.filter((item) => item.required).map((item) => [item.dest, present.has(item.dest)])),
  };
  fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(manifest));
}

test('blog content glob excludes underscore-prefixed files and directories', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-content-glob-'));
  try {
    for (const file of ['normal.md', 'note/visible.mdx', '_draft.md', '_draft/secret.md', 'note/_private/secret.mdx']) {
      const filePath = path.join(root, file);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, '');
    }

    const [include, ...excludes] = BLOG_CONTENT_GLOB_PATTERN;
    const matches = globSync(include, {
      cwd: root,
      ignore: excludes.map((pattern) => pattern.replace(/^!/, '')),
      nodir: true,
    }).toSorted();

    assert.deepEqual(matches, ['normal.md', 'note/visible.mdx']);
    assert.equal(isBlogContentFile('normal.md'), true);
    assert.equal(isBlogContentFile('note/visible.mdx'), true);
    assert.equal(isBlogContentFile('_draft.md'), false);
    assert.equal(isBlogContentFile('note/_private/secret.mdx'), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('content migration preserves URLs and is idempotent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    writePost(contentDir, 'note/legacy.md', 'slug: old/public-url\n');
    writePost(contentDir, 'en/note/legacy.md', 'slug: old/public-url\n');
    writePost(contentDir, 'note/both.md', 'link: preferred\nslug: ignored\n');
    writePost(contentDir, 'note/paired.md', 'link: custom-paired\n');
    writePost(contentDir, 'en/note/paired.md', '');
    writePost(contentDir, 'note/中文.md', '');
    writePost(contentDir, 'note/stable.md', 'link: stable\n');

    const first = planContentMigration({ contentDir, siteConfigPath: configPath });
    assert.equal(first.scannedFiles, 7);
    assert.equal(first.changes.length, 5);
    assert.equal(first.unchangedFiles, 2);
    assert.deepEqual(first.errors, []);
    assert.equal(first.changes.find((change) => change.file.endsWith('/en/note/paired.md'))?.link, 'custom-paired');

    applyContentMigration(first);

    const second = planContentMigration({ contentDir, siteConfigPath: configPath });
    assert.equal(second.changes.length, 0);
    assert.equal(second.unchangedFiles, 7);
    assert.deepEqual(second.errors, []);
    assert.match(fs.readFileSync(path.join(contentDir, 'note/legacy.md'), 'utf8'), /^---\nlink: old\/public-url\n/);
    assert.doesNotMatch(fs.readFileSync(path.join(contentDir, 'note/both.md'), 'utf8'), /^slug:/m);
    assert.match(fs.readFileSync(path.join(contentDir, 'note/中文.md'), 'utf8'), /^---\nlink: 'note\/中文'\n/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('default-locale path stays authoritative when a translation has a custom link', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-default-path-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    const defaultFile = writePost(contentDir, 'note/foo.md', '');
    writePost(contentDir, 'en/note/foo.md', 'link: translated-custom\n');

    const plan = runContentMigration({ contentDir, siteConfigPath: configPath });

    assert.deepEqual(plan.errors, []);
    assert.equal(plan.changes.length, 1);
    assert.equal(plan.changes[0]?.sourcePath, defaultFile);
    assert.equal(plan.changes[0]?.link, 'note/foo');
    assert.equal(matter(fs.readFileSync(defaultFile, 'utf8')).data.link, 'note/foo');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('translations without links follow the default-locale path instead of another translation custom link', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-translation-path-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    const defaultFile = writePost(contentDir, 'note/foo.md', '');
    writePost(contentDir, 'en/note/foo.md', 'link: translated-custom\n');
    const untranslatedFile = writePost(contentDir, 'pt-BR/note/foo.md', '');

    const plan = runContentMigration({ contentDir, siteConfigPath: configPath });

    assert.deepEqual(plan.errors, []);
    assert.deepEqual(
      new Map(plan.changes.map(({ sourcePath, link }) => [sourcePath, link])),
      new Map([
        [defaultFile, 'note/foo'],
        [untranslatedFile, 'note/foo'],
      ]),
    );
    assert.equal(matter(fs.readFileSync(untranslatedFile, 'utf8')).data.link, 'note/foo');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('generated links preserve Astro legacy path slugs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-path-slugs-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    writePost(contentDir, 'Foo Bar/index.md', '');
    writePost(contentDir, 'Camel Case.md', '');
    writePost(contentDir, 'note/Hello, World!.md', '');
    writePost(contentDir, 'en/Nested Folder/Index Post.mdx', '');
    writePost(contentDir, 'pt-BR/Release Notes.md', '');

    const plan = planContentMigration({ contentDir, siteConfigPath: configPath });

    assert.deepEqual(plan.errors, []);
    assert.deepEqual(
      plan.changes.map(({ sourcePath, link }) => [path.relative(contentDir, sourcePath), link]),
      [
        ['Camel Case.md', 'camel-case'],
        ['Foo Bar/index.md', 'foo-bar'],
        ['en/Nested Folder/Index Post.mdx', 'nested-folder/index-post'],
        ['note/Hello, World!.md', 'note/hello-world'],
        ['pt-BR/Release Notes.md', 'release-notes'],
      ],
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('generated links preserve the legacy optional slug transliteration', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-transliterated-slugs-'));
  try {
    const configPath = writeSiteConfig(root, true);
    const contentDir = path.join(root, 'src/content/blog');
    writePost(contentDir, '笔记/中文文章.md', '');

    const plan = planContentMigration({ contentDir, siteConfigPath: configPath });

    assert.deepEqual(plan.errors, []);
    assert.equal(plan.changes[0]?.link, 'bi-ji/zhong-wen-wen-zhang');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('legacy slug fields preserve their pre-migration public URLs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-legacy-slugs-'));
  try {
    const configPath = writeSiteConfig(root, true);
    const contentDir = path.join(root, 'src/content/blog');
    writePost(contentDir, 'localized.md', 'slug: en/custom-path\n');
    writePost(contentDir, 'translated.md', 'slug: 中文路径\n');

    const plan = runContentMigration({ contentDir, siteConfigPath: configPath });

    assert.deepEqual(plan.errors, []);
    assert.equal(matter(fs.readFileSync(path.join(contentDir, 'localized.md'), 'utf8')).data.link, 'custom-path');
    assert.equal(matter(fs.readFileSync(path.join(contentDir, 'translated.md'), 'utf8')).data.link, 'zhong-wen-lu-jing');
    assert.equal(planContentMigration({ contentDir, siteConfigPath: configPath }).changes.length, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('frontmatter block scalars may contain indented delimiter text', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-block-scalar-'));
  try {
    const configPath = writeSiteConfig(root, true);
    const contentDir = path.join(root, 'src/content/blog');
    const preferredFile = writePost(contentDir, 'preferred.md', 'link: kept\nslug: |\n  ignored\n  ---\n');
    const transliteratedFile = writePost(contentDir, 'transliterated.md', 'slug: |\n  中\n  ---\n');

    const plan = runContentMigration({ contentDir, siteConfigPath: configPath });

    assert.deepEqual(plan.errors, []);
    assert.equal(matter(fs.readFileSync(preferredFile, 'utf8')).data.link, 'kept');
    assert.equal(Object.hasOwn(matter(fs.readFileSync(preferredFile, 'utf8')).data, 'slug'), false);
    assert.equal(matter(fs.readFileSync(transliteratedFile, 'utf8')).data.link, 'zhong');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('multi-line flow scalar slug fails safely instead of corrupting frontmatter', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-flow-scalar-'));
  try {
    const configPath = writeSiteConfig(root, true);
    const contentDir = path.join(root, 'src/content/blog');
    // A double-quoted scalar spanning two lines: the line-level editors track
    // only block scalars (| / >), so a naive rewrite would strip the first line
    // and leave the trailing line behind, breaking the YAML.
    const renameFile = writePost(contentDir, 'rename.md', 'slug: "中文\n  路径"\n');
    const removeFile = writePost(contentDir, 'remove.md', 'link: kept\nslug: "中文\n  路径"\n');
    const renameOriginal = fs.readFileSync(renameFile, 'utf8');
    const removeOriginal = fs.readFileSync(removeFile, 'utf8');

    const plan = runContentMigration({ contentDir, siteConfigPath: configPath });

    assert.equal(plan.changes.length, 0);
    assert.equal(plan.errors.length, 2);
    for (const issue of plan.errors) assert.match(issue.message, /无法安全改写 slug 字段/);
    assert.equal(fs.readFileSync(renameFile, 'utf8'), renameOriginal);
    assert.equal(fs.readFileSync(removeFile, 'utf8'), removeOriginal);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('frontmatter delimiters allow trailing whitespace but must start in column zero', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-frontmatter-delimiter-'));
  try {
    const configPath = writeSiteConfig(root, true);
    const contentDir = path.join(root, 'src/content/blog');
    const filePath = path.join(contentDir, 'trailing-space.md');
    fs.mkdirSync(contentDir, { recursive: true });
    fs.writeFileSync(filePath, '---\nslug: |\n  中\n  ---\ntitle: test\ndate: 2026-01-01\n---   \nbody\n');

    const plan = runContentMigration({ contentDir, siteConfigPath: configPath });
    const migrated = fs.readFileSync(filePath, 'utf8');

    assert.deepEqual(plan.errors, []);
    assert.equal(matter(migrated).data.link, 'zhong');
    assert.equal(Object.hasOwn(matter(migrated).data, 'slug'), false);
    assert.match(migrated, /\n--- {3}\nbody\n$/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('content migration ignores underscore paths and their duplicate links', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-hidden-content-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    const visible = writePost(contentDir, 'visible.md', 'link: stable\n');
    const hiddenFile = writePost(contentDir, '_hidden.md', 'link: stable\n');
    const hiddenDirectoryFile = writePost(contentDir, '_draft/hidden.md', 'link: stable\n');
    const originals = new Map([hiddenFile, hiddenDirectoryFile].map((file) => [file, fs.readFileSync(file, 'utf8')]));

    const plan = runContentMigration({ contentDir, siteConfigPath: configPath });

    assert.equal(plan.scannedFiles, 1);
    assert.equal(plan.unchangedFiles, 1);
    assert.deepEqual(plan.errors, []);
    assert.equal(fs.existsSync(visible), true);
    for (const [file, original] of originals) assert.equal(fs.readFileSync(file, 'utf8'), original);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('content migration rejects symlinks without writing their external targets', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-symlink-content-'));
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-symlink-external-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    const pendingFile = writePost(contentDir, 'pending.md', '');
    const externalFile = writePost(external, 'outside.md', '');
    const pendingOriginal = fs.readFileSync(pendingFile, 'utf8');
    const externalOriginal = fs.readFileSync(externalFile, 'utf8');
    fs.symlinkSync(externalFile, path.join(contentDir, 'linked.md'));

    const plan = runContentMigration({ contentDir, siteConfigPath: configPath });

    assert.equal(plan.errors.length, 1);
    assert.match(plan.errors[0].message, /不能是符号链接/);
    assert.equal(fs.readFileSync(pendingFile, 'utf8'), pendingOriginal);
    assert.equal(fs.readFileSync(externalFile, 'utf8'), externalOriginal);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(external, { recursive: true, force: true });
  }
});

test('generated links remain strings for YAML implicit scalar values', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-yaml-string-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    const implicitScalars = ['true', 'null', '123', '2026-01-01'];
    for (const value of implicitScalars) writePost(contentDir, `${value}.md`, '');

    const plan = runContentMigration({ contentDir, siteConfigPath: configPath });
    assert.deepEqual(plan.errors, []);
    assert.equal(plan.changes.length, implicitScalars.length);

    for (const value of implicitScalars) {
      const raw = fs.readFileSync(path.join(contentDir, `${value}.md`), 'utf8');
      assert.match(raw, new RegExp(`^---\\nlink: '${value}'\\n`));
      assert.equal(matter(raw).data.link, value);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('invalid slug values block every write even when link exists', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-invalid-slug-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    const files = [
      writePost(contentDir, 'object.md', 'link: preferred-object\nslug:\n  nested: bad\n'),
      writePost(contentDir, 'number.md', 'link: preferred-number\nslug: 123\n'),
      writePost(contentDir, 'empty.md', "link: preferred-empty\nslug: ''\n"),
      writePost(contentDir, 'pending.md', ''),
    ];
    const originals = new Map(files.map((file) => [file, fs.readFileSync(file, 'utf8')]));

    const plan = runContentMigration({ contentDir, siteConfigPath: configPath });
    assert.equal(plan.errors.length, 3);
    assert.equal(plan.changes.length, 1);
    for (const issue of plan.errors) assert.match(issue.message, /slug 必须是非空字符串/);
    for (const file of files) assert.equal(fs.readFileSync(file, 'utf8'), originals.get(file));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('duplicate links block every write', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-collision-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    const firstFile = writePost(contentDir, 'a.md', 'link: same\n');
    writePost(contentDir, 'b.md', 'link: same\n');
    const before = fs.readFileSync(firstFile, 'utf8');

    const plan = runContentMigration({ contentDir, siteConfigPath: configPath });
    assert.equal(plan.errors.length, 2);
    assert.equal(fs.readFileSync(firstFile, 'utf8'), before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('apply rejects changes to previously unchanged inputs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-unchanged-race-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    const pendingFile = writePost(contentDir, 'pending.md', '');
    const stableFile = writePost(contentDir, 'stable.md', 'link: stable\n');
    const pendingOriginal = fs.readFileSync(pendingFile, 'utf8');
    const plan = planContentMigration({ contentDir, siteConfigPath: configPath });

    fs.writeFileSync(stableFile, fs.readFileSync(stableFile, 'utf8').replace('link: stable', 'link: pending'));

    assert.throws(() => applyContentMigration(plan), /在扫描后发生变化/);
    assert.equal(fs.readFileSync(pendingFile, 'utf8'), pendingOriginal);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('apply rejects new content files added after planning', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-file-set-race-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    const pendingFile = writePost(contentDir, 'pending.md', '');
    const pendingOriginal = fs.readFileSync(pendingFile, 'utf8');
    const plan = planContentMigration({ contentDir, siteConfigPath: configPath });

    writePost(contentDir, 'new.md', 'link: pending\n');

    assert.throws(() => applyContentMigration(plan), /文件集合在扫描后发生变化/);
    assert.equal(fs.readFileSync(pendingFile, 'utf8'), pendingOriginal);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('apply rechecks content immediately before installing an atomic write', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-immediate-race-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    const pendingFile = writePost(contentDir, 'pending.md', '');
    const plan = planContentMigration({ contentDir, siteConfigPath: configPath });
    const writeFileSync = fs.writeFileSync.bind(fs);
    const concurrent = fs.readFileSync(pendingFile, 'utf8').replace('title: test', 'title: concurrently edited');
    let injected = false;

    context.mock.method(
      fs,
      'writeFileSync',
      (filePath: fs.PathOrFileDescriptor, data: string | NodeJS.ArrayBufferView, options?: fs.WriteFileOptions) => {
        writeFileSync(filePath, data, options);
        if (!injected && typeof filePath === 'number' && data === plan.changes[0]?.updated) {
          injected = true;
          fs.writeFileSync(pendingFile, concurrent);
        }
      },
    );

    assert.throws(() => applyContentMigration(plan), /在写入前发生变化/);
    assert.equal(injected, true);
    assert.equal(fs.readFileSync(pendingFile, 'utf8'), concurrent);
    assert.equal(
      fs.readdirSync(contentDir).some((entry) => entry.includes('.koharu-migrate-')),
      false,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('atomic migration writes preserve the source file mode', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-file-mode-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    const pendingFile = writePost(contentDir, 'pending.md', '');
    fs.chmodSync(pendingFile, 0o640);

    runContentMigration({ contentDir, siteConfigPath: configPath });

    assert.equal(fs.statSync(pendingFile).mode & 0o777, 0o640);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('atomic migration supports source names near the filesystem component limit', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-long-name-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    const longName = `${'a'.repeat(240)}.md`;
    const pendingFile = writePost(contentDir, longName, '');

    const plan = runContentMigration({ contentDir, siteConfigPath: configPath });

    assert.deepEqual(plan.errors, []);
    assert.equal(matter(fs.readFileSync(pendingFile, 'utf8')).data.link, longName.slice(0, -3));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('apply rolls back every installed atomic write when a later write fails', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-write-rollback-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    const files = [
      writePost(contentDir, 'first.md', ''),
      writePost(contentDir, 'second.md', ''),
      writePost(contentDir, 'third.md', ''),
    ];
    const originals = new Map(files.map((file) => [file, fs.readFileSync(file, 'utf8')]));
    const plan = planContentMigration({ contentDir, siteConfigPath: configPath });
    const renameSync = fs.renameSync.bind(fs);
    let updatedWrites = 0;
    const rollbackPaths: string[] = [];

    context.mock.method(fs, 'renameSync', (oldPath: fs.PathLike, newPath: fs.PathLike) => {
      const change = plan.changes.find((candidate) => candidate.sourcePath === String(newPath));
      const data = change ? fs.readFileSync(oldPath, 'utf8') : null;
      if (change && data === change.updated) {
        updatedWrites++;
        if (updatedWrites === 2) throw new Error('injected second write failure');
      }
      if (change && data === change.original) {
        rollbackPaths.push(String(newPath));
      }
      renameSync(oldPath, newPath);
    });

    assert.throws(() => applyContentMigration(plan), /injected second write failure/);
    assert.equal(updatedWrites, 2);
    assert.deepEqual(
      rollbackPaths,
      plan.changes
        .slice(0, 1)
        .toReversed()
        .map((change) => change.sourcePath),
    );
    for (const file of files) assert.equal(fs.readFileSync(file, 'utf8'), originals.get(file));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('apply reports both write and rollback failures', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-migrate-rollback-failure-'));
  try {
    const configPath = writeSiteConfig(root);
    const contentDir = path.join(root, 'src/content/blog');
    writePost(contentDir, 'first.md', '');
    writePost(contentDir, 'second.md', '');
    const plan = planContentMigration({ contentDir, siteConfigPath: configPath });
    const renameSync = fs.renameSync.bind(fs);
    let updatedWrites = 0;
    let rollbackWrites = 0;

    context.mock.method(fs, 'renameSync', (oldPath: fs.PathLike, newPath: fs.PathLike) => {
      const change = plan.changes.find((candidate) => candidate.sourcePath === String(newPath));
      const data = change ? fs.readFileSync(oldPath, 'utf8') : null;
      if (change && data === change.updated) {
        updatedWrites++;
        if (updatedWrites === 2) throw new Error('injected write failure');
      }
      if (change && data === change.original) {
        rollbackWrites++;
        if (rollbackWrites === 1) throw new Error('injected rollback failure');
      }
      renameSync(oldPath, newPath);
    });

    assert.throws(
      () => applyContentMigration(plan),
      (error) => {
        assert.ok(error instanceof AggregateError);
        assert.match(error.message, /injected write failure/);
        assert.match(error.message, /injected rollback failure/);
        assert.equal(error.errors.length, 2);
        return true;
      },
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('restore replaces user snapshots and migrates restored content', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-restore-target-'));
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-restore-stage-'));
  const archive = path.join(BACKUP_DIR, `backup-test-${process.pid}-${Date.now()}.tar.gz`);

  try {
    const contentDir = path.join(root, 'src/content/blog');
    writePost(contentDir, 'stale.md', 'link: stale\n');
    fs.mkdirSync(path.join(root, 'public/img'), { recursive: true });
    fs.writeFileSync(path.join(root, 'public/img/stale.txt'), 'stale');
    fs.mkdirSync(path.join(root, 'src/pages'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src/pages/stale.md'), 'stale');
    fs.writeFileSync(path.join(root, 'src/pages/keep.astro'), 'keep');
    writeSiteConfig(root);
    fs.writeFileSync(path.join(root, 'config/new-theme.yaml'), 'keep: true\n');

    writePost(path.join(stage, 'content/blog'), 'restored.md', '');
    fs.mkdirSync(path.join(stage, 'pages'), { recursive: true });
    fs.mkdirSync(path.join(stage, 'img'), { recursive: true });
    fs.writeFileSync(path.join(stage, 'img/restored.txt'), 'restored');
    const stagedConfig = path.join(stage, 'config/site.yaml');
    fs.mkdirSync(path.dirname(stagedConfig), { recursive: true });
    fs.writeFileSync(stagedConfig, 'i18n:\n  defaultLocale: zh\n  locales:\n    - code: zh\n');
    writeBackupManifest(stage, ['content/blog', 'config', 'pages', 'img']);

    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    tarCreate(archive, stage);

    const preview = getRestorePreview(archive, { projectRoot: root });
    assert.deepEqual(preview.items.find((item) => item.path === 'src/content/blog')?.deletedFiles, [
      'src/content/blog/stale.md',
    ]);
    assert.deepEqual(preview.items.find((item) => item.path === 'public/img')?.deletedFiles, ['public/img/stale.txt']);
    assert.deepEqual(preview.items.find((item) => item.path === 'src/pages')?.deletedFiles, ['src/pages/stale.md']);
    assert.equal(preview.migration?.changes.length, 1);
    assert.equal(preview.migration?.errors.length, 0);
    assert.equal(fs.existsSync(path.join(contentDir, 'stale.md')), true);
    assert.equal(fs.existsSync(path.join(contentDir, 'restored.md')), false);

    const output = restoreBackup(archive, { projectRoot: root });

    assert.equal(output.migration?.changes.length, 1);
    assert.equal(output.migration?.errors.length, 0);
    assert.equal(fs.existsSync(path.join(contentDir, 'stale.md')), false);
    assert.match(fs.readFileSync(path.join(contentDir, 'restored.md'), 'utf8'), /^---\nlink: 'restored'\n/);
    assert.equal(fs.existsSync(path.join(root, 'public/img/stale.txt')), false);
    assert.equal(fs.readFileSync(path.join(root, 'public/img/restored.txt'), 'utf8'), 'restored');
    assert.equal(fs.existsSync(path.join(root, 'src/pages/stale.md')), false);
    assert.equal(fs.readFileSync(path.join(root, 'src/pages/keep.astro'), 'utf8'), 'keep');
    assert.equal(fs.readFileSync(path.join(root, 'config/new-theme.yaml'), 'utf8'), 'keep: true\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(stage, { recursive: true, force: true });
    fs.rmSync(archive, { force: true });
  }
});

test('non-interactive restore previews fail when restored content cannot migrate', () => {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-restore-preview-error-stage-'));
  const archive = path.join(BACKUP_DIR, `backup-preview-error-${process.pid}-${Date.now()}.tar.gz`);

  try {
    writePost(path.join(stage, 'content/blog'), 'first.md', 'link: duplicate\n');
    writePost(path.join(stage, 'content/blog'), 'second.md', 'link: duplicate\n');
    writeBackupManifest(stage, ['content/blog']);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    tarCreate(archive, stage);

    const result = spawnSync('pnpm', ['exec', 'tsx', 'scripts/koharu.tsx', 'restore', archive, '--dry-run', '--force'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      timeout: 10_000,
    });

    assert.equal(result.status, 1, result.stderr || result.stdout);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
    fs.rmSync(archive, { force: true });
  }
});

test('restore rejects symlinked targets without deleting external files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-restore-symlink-target-'));
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-restore-symlink-external-'));
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-restore-symlink-stage-'));
  const archive = path.join(BACKUP_DIR, `backup-symlink-test-${process.pid}-${Date.now()}.tar.gz`);

  try {
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(external, 'private.md'), 'do not delete');
    fs.symlinkSync(external, path.join(root, 'src/pages'), 'dir');
    fs.mkdirSync(path.join(stage, 'pages'), { recursive: true });
    fs.writeFileSync(path.join(stage, 'pages/restored.md'), 'restored');
    writeBackupManifest(stage, ['pages']);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    tarCreate(archive, stage);

    assert.throws(() => getRestorePreview(archive, { projectRoot: root }), /包含符号链接/);
    assert.throws(() => restoreBackup(archive, { projectRoot: root }), /包含符号链接/);
    assert.equal(fs.readFileSync(path.join(external, 'private.md'), 'utf8'), 'do not delete');
    assert.equal(fs.existsSync(path.join(external, 'restored.md')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(external, { recursive: true, force: true });
    fs.rmSync(stage, { recursive: true, force: true });
    fs.rmSync(archive, { force: true });
  }
});
