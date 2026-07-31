import type { CommitInfo, GitCommand } from '../constants/update';
import { MAIN_BRANCH, UPSTREAM_REMOTE } from '../constants/update';

/**
 * Pure planner for the update flow.
 *
 * Every decision that can destroy user data — which merge strategy runs, which
 * conflicts are auto-resolved, which files a clean update deletes — is computed
 * here from plain data so it can be tested without touching a repository.
 * `update-operations.ts` executes the returned plans through `git-porcelain.ts`.
 */

/** Which git strategy an update performs. */
export type UpdateStrategy = 'rebase' | 'downgrade' | 'clean' | 'merge';

export interface StrategyInput {
  normalizedTag: string | null;
  isDowngrade?: boolean;
  rebase?: boolean;
  clean?: boolean;
}

export interface TargetRef {
  normalizedTag: string | null;
  targetRef: string;
}

export interface ConflictResolutionPlan {
  /** Conflicts the policy resolves by keeping the local version. */
  autoResolveFiles: string[];
  /** Conflicts the user must resolve by hand. */
  manualFiles: string[];
  /** Whether the merge may be committed once every auto-resolved file is staged. */
  canAutoComplete: boolean;
  isRebaseConflict: boolean;
}

export interface ConflictOutcome {
  autoResolvedFiles: string[];
  manualFiles: string[];
  /** All conflicts are resolved; the executor may commit the merge. */
  canCommit: boolean;
}

export interface CleanRemovalInput {
  localFiles: string[];
  upstreamFiles: string[];
  userContentPrefixes: string[];
  batchSize?: number;
}

export interface CleanRemovalPlan {
  filesToRemove: string[];
  commands: GitCommand[];
}

/** `git rm` batch size that keeps arguments below ARG_MAX. */
const REMOVAL_BATCH_SIZE = 100;

/** 规范化版本号为带 v 前缀的格式 */
export function normalizeTag(tag: string): string {
  return tag.startsWith('v') ? tag : `v${tag}`;
}

/** Resolve the ref an update targets: an explicit tag, otherwise the upstream main branch. */
export function resolveTargetRef(targetTag?: string): TargetRef {
  const normalizedTag = targetTag ? normalizeTag(targetTag) : null;
  return { normalizedTag, targetRef: normalizedTag || `${UPSTREAM_REMOTE}/${MAIN_BRANCH}` };
}

export function selectUpdateStrategy(input: StrategyInput): UpdateStrategy {
  if (input.rebase) return 'rebase';
  if (input.isDowngrade && input.normalizedTag) return 'downgrade';
  if (input.clean) return 'clean';
  return 'merge';
}

/** A downgrade is an explicit tag that HEAD is already ahead of. */
export function decideDowngrade(input: { normalizedTag: string | null; aheadCount: number; behindCount: number }): boolean {
  return Boolean(input.normalizedTag && input.aheadCount > 0 && input.behindCount === 0);
}

/** Parse `rev-list --left-right --count HEAD...ref` output. */
export function parseRevListCounts(output: string | null): { aheadCount: number; behindCount: number } {
  const [aheadStr, behindStr] = (output || '0\t0').split('\t');
  return {
    aheadCount: Number.parseInt(aheadStr, 10) || 0,
    behindCount: Number.parseInt(behindStr, 10) || 0,
  };
}

/** Parse `log --pretty=format:%h|%s|%ar|%an` output. */
export function parseCommits(output: string): CommitInfo[] {
  return output
    .trim()
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const [hash, message, date, author] = line.split('|');
      return { hash, message, date, author };
    });
}

export function isUserContentPath(filePath: string, userContentPrefixes: string[]): boolean {
  return userContentPrefixes.some((prefix) => filePath === prefix || filePath.startsWith(`${prefix}/`));
}

export function classifyConflicts(
  files: string[],
  userContentPrefixes: string[],
): { userFiles: string[]; themeFiles: string[] } {
  const userFiles: string[] = [];
  const themeFiles: string[] = [];
  for (const file of files) {
    if (isUserContentPath(file, userContentPrefixes)) userFiles.push(file);
    else themeFiles.push(file);
  }
  return { userFiles, themeFiles };
}

/** The main git step for a strategy; downgrade and clean need the follow-up plans below. */
export function planStrategyCommands(
  strategy: UpdateStrategy,
  context: { targetRef: string; normalizedTag: string | null; versionInfo: string },
): GitCommand[] {
  const { targetRef, normalizedTag, versionInfo } = context;

  switch (strategy) {
    case 'rebase':
      return [{ args: `rebase ${targetRef}` }];
    case 'downgrade':
      // checkout + commit keeps the history instead of rewriting it.
      return [{ args: `checkout ${normalizedTag} -- .` }];
    case 'clean':
      // `merge -s ours` records the merge base, then upstream files overwrite the tree.
      return [
        { args: `merge -s ours --no-ff --allow-unrelated-histories ${targetRef} -m "chore: clean update to ${versionInfo}"` },
        { args: `checkout ${targetRef} -- .` },
      ];
    default:
      return [
        { args: `merge --no-ff --allow-unrelated-histories ${targetRef} -m "chore: merge upstream theme ${versionInfo}"` },
      ];
  }
}

/** Commit a downgrade checkout; only runs when the checkout changed something. */
export function planDowngradeCommit(normalizedTag: string): GitCommand {
  return { args: `commit -m "Downgrade to ${normalizedTag}"` };
}

/** Fold the overwritten tree into the clean-mode merge commit. */
export function planCleanFinalizeCommands(): GitCommand[] {
  return [{ args: 'add -A' }, { args: 'commit --amend --no-edit' }];
}

/** Clean mode deletes theme files that upstream removed; user content is never deleted. */
export function planCleanRemovals(input: CleanRemovalInput): CleanRemovalPlan {
  const upstreamFiles = new Set(input.upstreamFiles);
  const filesToRemove = [...new Set(input.localFiles)].filter(
    (file) => !upstreamFiles.has(file) && !isUserContentPath(file, input.userContentPrefixes),
  );

  const batchSize = input.batchSize ?? REMOVAL_BATCH_SIZE;
  const commands: GitCommand[] = [];
  for (let index = 0; index < filesToRemove.length; index += batchSize) {
    const batch = filesToRemove
      .slice(index, index + batchSize)
      .map((file) => `'${file.replaceAll("'", "'\\''")}'`)
      .join(' ');
    commands.push({ args: `rm --quiet -- ${batch}`, safe: true });
  }

  return { filesToRemove, commands };
}

/**
 * Decide how a conflict is handled.
 *
 * Only a regular merge auto-resolves: user content keeps the local version so an
 * update can never overwrite posts or config. Rebase and clean conflicts always
 * go back to the user, because their file states are not "ours vs theirs".
 */
export function planConflictResolution(input: {
  strategy: UpdateStrategy;
  conflictFiles: string[];
  userContentPrefixes: string[];
}): ConflictResolutionPlan {
  if (input.strategy !== 'merge') {
    return {
      autoResolveFiles: [],
      manualFiles: input.conflictFiles,
      canAutoComplete: false,
      isRebaseConflict: input.strategy === 'rebase',
    };
  }

  const { userFiles, themeFiles } = classifyConflicts(input.conflictFiles, input.userContentPrefixes);
  return { autoResolveFiles: userFiles, manualFiles: themeFiles, canAutoComplete: true, isRebaseConflict: false };
}

/** Fold the auto-resolution results back into a final conflict decision. */
export function resolveConflictOutcome(plan: ConflictResolutionPlan, failedFiles: string[]): ConflictOutcome {
  const manualFiles = [...plan.manualFiles, ...failedFiles];
  const autoResolvedFiles = plan.autoResolveFiles.filter((file) => !manualFiles.includes(file));
  return { autoResolvedFiles, manualFiles, canCommit: plan.canAutoComplete && manualFiles.length === 0 };
}

/** Conflicted paths reported by `status --porcelain`, used when `diff --diff-filter=U` is empty. */
export function parseConflictStatusLines(statusLines: string[]): string[] {
  return [
    ...new Set(
      statusLines
        .filter((line) => {
          const status = line.slice(0, 2);
          return status.includes('U') || status === 'AA' || status === 'DD';
        })
        .map((line) => line.slice(3)),
    ),
  ];
}
