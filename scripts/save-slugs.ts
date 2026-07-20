// Backward-compatible alias for the content migration command.
// Usage: pnpm save-slugs [--dry-run]

import { runContentMigration } from './koharu/utils/migration-operations.js';

const dryRun = process.argv.includes('--dry-run');
const plan = runContentMigration({ dryRun });

for (const change of plan.changes) {
  console.log(`${dryRun ? '[dry-run] ' : ''}${change.file} -> link: ${change.link}`);
}
for (const issue of plan.errors) {
  console.error(`${issue.file}: ${issue.message}`);
}

if (plan.errors.length > 0) {
  console.error(`Migration stopped with ${plan.errors.length} error(s); no files were changed.`);
  process.exitCode = 1;
} else {
  console.log(`${dryRun ? '[dry-run] ' : ''}Processed ${plan.changes.length} posts (${plan.unchangedFiles} already migrated)`);
}
