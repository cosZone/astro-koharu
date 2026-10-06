import type { ResolvedColophonConfig } from '../../../src/lib/config/colophon';

export interface ColophonChoiceOption {
  label: string;
  value: string;
  hint?: string;
}

export interface ColophonChoiceStep {
  id: `colophon-group:${string}` | 'colophon-marks';
  label: string;
  exclusive: boolean;
  options: ColophonChoiceOption[];
}

/** One single-choice step per exclusive group, then one multi-select for every other mark. */
export function getColophonChoiceSteps(config: ResolvedColophonConfig): ColophonChoiceStep[] {
  if (!config.enabled) return [];
  const option = (mark: ResolvedColophonConfig['marks'][number], prefix = ''): ColophonChoiceOption => ({
    label: `${prefix}${mark.label}`,
    value: mark.id,
    ...(mark.description ? { hint: mark.description } : {}),
  });
  const exclusive = config.groups.filter((group) => group.exclusive);
  const steps: ColophonChoiceStep[] = exclusive
    .map((group) => ({
      id: `colophon-group:${group.id}` as const,
      label: `落款 · ${group.label}`,
      exclusive: true,
      options: config.marks.filter((mark) => mark.group === group.id).map((mark) => option(mark)),
    }))
    .filter((step) => step.options.length);

  const exclusiveIds = new Set(exclusive.map((group) => group.id));
  const others = config.marks.filter((mark) => mark.group === undefined || !exclusiveIds.has(mark.group));
  const groupLabels = new Map(config.groups.map((group) => [group.id, group.label]));
  const otherGroups = new Set(others.map((mark) => mark.group));
  const single = otherGroups.size === 1 ? [...otherGroups][0] : undefined;
  if (others.length) {
    steps.push({
      id: 'colophon-marks',
      label: `落款 · ${(single && groupLabels.get(single)) || '其他标记'}`,
      exclusive: false,
      options: others.map((mark) =>
        option(mark, otherGroups.size > 1 && mark.group ? `${groupLabels.get(mark.group)} / ` : ''),
      ),
    });
  }
  return steps;
}

/** Chosen mark ids in step order, ready for the `colophon:` frontmatter list. */
export function collectColophon(
  steps: readonly ColophonChoiceStep[],
  picks: Readonly<Record<string, readonly string[]>>,
): string[] {
  return steps.flatMap((step) => {
    const allowed = new Set(step.options.map((option) => option.value));
    return (picks[step.id] ?? []).filter((id) => allowed.has(id));
  });
}
