import { TextInput } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConfirmScreen,
  CreatingScreen,
  DoneScreen,
  ErrorScreen,
  MultiSelect,
  CycleSelect as Select,
  StepItem,
} from '../components';
import { useStepFlow } from '../hooks';
import { type ColophonChoiceStep, collectColophon, getColophonChoiceSteps } from '../utils/colophon-choices';
import { createPost, generateSlug, getCategoryTree, getColophonConfig, postExists } from '../utils/new-operations';
import type { CategoryTreeItem, CreatorProps, PostData } from './types';

type Step =
  | 'title'
  | 'slug'
  | 'description'
  | 'category'
  | 'tags'
  | ColophonChoiceStep['id']
  | 'draft'
  | 'confirm'
  | 'creating'
  | 'done'
  | 'error';

interface StepConfig {
  id: Step;
  label: string;
}

const LEADING_STEPS: StepConfig[] = [
  { id: 'title', label: '标题' },
  { id: 'slug', label: 'Slug' },
  { id: 'description', label: '描述' },
  { id: 'category', label: '分类' },
  { id: 'tags', label: '标签' },
];
const DRAFT_STEP: StepConfig = { id: 'draft', label: '草稿' };

export function PostCreator({ onComplete, showReturnHint = false }: CreatorProps) {
  // Data state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryTreeItem | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [draft, setDraft] = useState(false);
  const [inputError, setInputError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [createdPath, setCreatedPath] = useState('');
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [colophonSteps, setColophonSteps] = useState<ColophonChoiceStep[]>([]);
  const [colophonPicks, setColophonPicks] = useState<Record<string, string[]>>({});

  // Colophon steps sit between tags and draft, one per exclusive group plus one multi-select.
  const stepConfigs = useMemo<StepConfig[]>(
    () => [...LEADING_STEPS, ...colophonSteps.map(({ id, label }) => ({ id, label })), DRAFT_STEP],
    [colophonSteps],
  );
  const inputSteps = useMemo(() => stepConfigs.map((config) => config.id), [stepConfigs]);

  // Step flow management
  const { step, setStep, getStepStatus, goBack } = useStepFlow({
    initialStep: 'title' as Step,
    inputSteps,
    onComplete,
    showReturnHint,
  });
  const advance = useCallback((from: Step) => setStep(inputSteps[inputSteps.indexOf(from) + 1]), [inputSteps, setStep]);

  // Load categories asynchronously
  useEffect(() => {
    getCategoryTree().then(setCategories).catch(console.error);
    getColophonConfig()
      .then((config) => setColophonSteps(getColophonChoiceSteps(config)))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (step) {
      setInputError((prev) => (prev ? '' : prev));
    }
  }, [step]);

  // Get display value for a completed step
  const getStepDisplayValue = useCallback(
    (stepId: Step): string => {
      switch (stepId) {
        case 'title':
          return title;
        case 'slug':
          return slug || '(无)';
        case 'description':
          return description || '(无)';
        case 'category':
          return category?.path.join(' → ') || '';
        case 'tags':
          return tags.length > 0 ? tags.join(', ') : '(无)';
        case 'draft':
          return draft ? '是' : '否';
        default: {
          const choice = colophonSteps.find((item) => item.id === stepId);
          const labels = choice?.options.filter((option) => colophonPicks[choice.id]?.includes(option.value));
          return labels?.length ? labels.map((option) => option.label).join(', ') : '(无)';
        }
      }
    },
    [title, slug, description, category, tags, draft, colophonSteps, colophonPicks],
  );

  const handleTitleSubmit = useCallback(
    (value: string) => {
      if (!value.trim()) {
        setInputError('标题不能为空');
        return;
      }
      const trimmedTitle = value.trim();
      setTitle(trimmedTitle);
      setAutoSlug(generateSlug(trimmedTitle));
      setInputError('');
      setStep('slug');
    },
    [setStep],
  );

  const handleSlugSubmit = useCallback(
    (value: string) => {
      const finalSlug = value.trim();
      setSlug(finalSlug);
      setInputError('');
      setStep('description');
    },
    [setStep],
  );

  const handleDescriptionSubmit = useCallback(
    (value: string) => {
      setDescription(value.trim());
      setInputError('');
      setStep('category');
    },
    [setStep],
  );

  const handleCategorySelect = useCallback(
    (value: string) => {
      const selected = categories.find((c) => c.slug === value);
      if (selected) {
        setCategory(selected);
        setInputError('');
        setStep('tags');
      }
    },
    [categories, setStep],
  );

  const handleTagsSubmit = useCallback(
    (value: string) => {
      const tagList = value
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      setTags(tagList);
      setInputError('');
      advance('tags');
    },
    [advance],
  );

  const handleColophonPick = useCallback(
    (stepId: ColophonChoiceStep['id'], values: string[]) => {
      setColophonPicks((previous) => ({ ...previous, [stepId]: values }));
      advance(stepId);
    },
    [advance],
  );

  const handleDraftSelect = useCallback(
    (value: string) => {
      setDraft(value === 'yes');
      setStep('confirm');
    },
    [setStep],
  );

  const handleConfirm = useCallback(async () => {
    if (!category) {
      setOperationError('未选择分类');
      setStep('error');
      return;
    }

    const linkValue = slug || undefined;
    if (await postExists(linkValue, title, category.path)) {
      const filename = slug || generateSlug(title);
      setOperationError(`文章已存在: ${filename}.md`);
      setStep('error');
      return;
    }

    setStep('creating');

    try {
      const postData: PostData = {
        title,
        link: slug || undefined,
        description: description || undefined,
        categories: category.path,
        tags,
        colophon: collectColophon(colophonSteps, colophonPicks),
        draft,
      };

      const filePath = await createPost(postData);
      setCreatedPath(filePath);
      setStep('done');
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : String(err));
      setStep('error');
    }
  }, [category, slug, title, description, tags, colophonSteps, colophonPicks, draft, setStep]);

  const handleCancel = useCallback(() => {
    goBack('confirm');
  }, [goBack]);

  const categoryOptions = categories.map((c) => ({
    label: c.level > 0 ? `  └ ${c.name}` : c.name,
    value: c.slug,
  }));

  const renderCurrentInput = () => {
    switch (step) {
      case 'title':
        return (
          <Box marginTop={1}>
            <Text dimColor>{'> '}</Text>
            <TextInput defaultValue={title} onSubmit={handleTitleSubmit} />
          </Box>
        );
      case 'slug':
        return (
          <Box flexDirection="column">
            <Box marginTop={1}>
              <Text dimColor>{'> '}</Text>
              <TextInput defaultValue={slug || autoSlug} onSubmit={handleSlugSubmit} />
            </Box>
            <Text dimColor> 直接回车使用，清空后回车则不生成 link 字段</Text>
          </Box>
        );
      case 'description':
        return (
          <Box marginTop={1}>
            <Text dimColor>{'> '}</Text>
            <TextInput defaultValue={description} onSubmit={handleDescriptionSubmit} />
          </Box>
        );
      case 'category':
        return <Select options={categoryOptions} onChange={handleCategorySelect} />;
      case 'tags':
        return (
          <Box flexDirection="column">
            <Box marginTop={1}>
              <Text dimColor>{'> '}</Text>
              <TextInput defaultValue={tags.join(', ')} onSubmit={handleTagsSubmit} />
            </Box>
            <Text dimColor> 逗号分隔多个标签，如: 标签1, 标签2</Text>
          </Box>
        );
      case 'draft':
        return (
          <Select
            options={[
              { label: '否 - 立即发布', value: 'no' },
              { label: '是 - 保存为草稿', value: 'yes' },
            ]}
            onChange={handleDraftSelect}
          />
        );
      default: {
        const choice = colophonSteps.find((item) => item.id === step);
        if (!choice) return null;
        if (choice.exclusive) {
          return (
            <Select
              key={choice.id}
              options={[
                { label: '跳过', value: '' },
                ...choice.options.map(({ label, value, hint }) => ({ label: hint ? `${label} — ${hint}` : label, value })),
              ]}
              defaultValue={colophonPicks[choice.id]?.[0]}
              onChange={(value) => handleColophonPick(choice.id, value ? [value] : [])}
            />
          );
        }
        return (
          <MultiSelect
            key={choice.id}
            options={choice.options}
            defaultValue={colophonPicks[choice.id]}
            onSubmit={(values) => handleColophonPick(choice.id, values)}
          />
        );
      }
    }
  };

  if (step === 'confirm') {
    return (
      <ConfirmScreen
        title="新建博客文章"
        steps={stepConfigs.map((c) => ({
          label: c.label,
          value: getStepDisplayValue(c.id),
        }))}
        confirmText="确认创建?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }

  if (step === 'creating') {
    return <CreatingScreen title="新建博客文章" message="正在创建文章..." />;
  }

  if (step === 'done') {
    return (
      <DoneScreen
        title="新建博客文章"
        message="文章创建成功!"
        detail={`路径: ${createdPath}`}
        showReturnHint={showReturnHint}
      />
    );
  }

  if (step === 'error') {
    return <ErrorScreen title="新建博客文章" error={operationError} showReturnHint={showReturnHint} />;
  }

  const showBackHint = inputSteps.includes(step);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          新建博客文章
        </Text>
      </Box>

      {stepConfigs.map((config) => (
        <StepItem
          key={config.id}
          label={config.label}
          status={getStepStatus(config.id)}
          completedValue={getStepDisplayValue(config.id)}
          error={getStepStatus(config.id) === 'active' ? inputError : undefined}
        >
          {getStepStatus(config.id) === 'active' && renderCurrentInput()}
        </StepItem>
      ))}

      {showBackHint && (
        <Box marginTop={1}>
          <Text dimColor>按 Esc 返回上一步，首步按 Esc 退出</Text>
        </Box>
      )}
    </Box>
  );
}
