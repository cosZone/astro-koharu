import { Spinner, TextInput } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CycleSelect as Select } from './components';
import { AUTO_EXIT_DELAY } from './constants';
import { DEFAULT_LLM_MODEL, GENERATE_ITEMS, type GenerateType } from './constants/generate';
import { usePressAnyKey, useRetimer } from './hooks';
import { checkLlmServer, type RunScriptResult, runGenerate, runGenerateAll } from './utils/generate-operations';

type GenerateStatus = 'selecting' | 'model-input' | 'checking' | 'generating' | 'done' | 'error';
type GenerateSelection = GenerateType | 'all' | 'cancel';

interface GenerateAppProps {
  initialType?: GenerateType | 'all';
  initialModel?: string;
  force?: boolean;
  showReturnHint?: boolean;
  onComplete?: () => void;
}

export function GenerateApp({
  initialType,
  initialModel,
  force = false,
  showReturnHint = false,
  onComplete,
}: GenerateAppProps) {
  const [status, setStatus] = useState<GenerateStatus>(() => {
    if (initialType) {
      // If type is summaries or all, need model input (unless model provided)
      if ((initialType === 'summaries' || initialType === 'all') && !initialModel) {
        return 'model-input';
      }
      return 'checking';
    }
    return 'selecting';
  });
  const [selectedType, setSelectedType] = useState<GenerateSelection | null>(initialType || null);
  const [model, setModel] = useState(initialModel || DEFAULT_LLM_MODEL);
  const [results, setResults] = useState<Map<GenerateType, RunScriptResult>>(new Map());
  const [error, setError] = useState<string>('');
  const [currentTask, setCurrentTask] = useState<string>('');
  const retimer = useRetimer();
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  const needsLlm = selectedType === 'summaries' || selectedType === 'all';

  const handleTypeSelect = (value: string) => {
    if (value === 'cancel') {
      onComplete?.();
      return;
    }
    setSelectedType(value as GenerateSelection);
    // If summaries or all, need model input
    if (value === 'summaries' || value === 'all') {
      setStatus('model-input');
    } else {
      setStatus('checking');
    }
  };

  const handleModelSubmit = (value: string) => {
    setModel(value || DEFAULT_LLM_MODEL);
    setStatus('checking');
  };

  const executeGenerate = useCallback(async () => {
    try {
      setStatus('generating');

      if (selectedType === 'all') {
        // Run all generators with progress tracking
        const allResults = await runGenerateAll({
          model,
          force,
          onProgress: (label) => setCurrentTask(label),
        });

        // Check if cancelled during execution
        if (isUnmountedRef.current) return;

        setResults(allResults);

        // Check if any failed
        const failed = [...allResults.entries()].find(([, r]) => !r.success);
        if (failed) {
          setError(`生成 ${GENERATE_ITEMS.find((i) => i.id === failed[0])?.label} 失败`);
          setStatus('error');
        } else {
          setStatus('done');
        }
      } else if (selectedType && selectedType !== 'cancel') {
        // Run single generator
        const item = GENERATE_ITEMS.find((i) => i.id === selectedType);
        setCurrentTask(item?.label || '');

        const result = await runGenerate(selectedType, { model, force });

        // Check if cancelled during execution
        if (isUnmountedRef.current) return;

        setResults(new Map([[selectedType, result]]));

        if (!result.success) {
          setError(`生成失败 (exit code: ${result.code})`);
          setStatus('error');
        } else {
          setStatus('done');
        }
      }

      if (!showReturnHint) {
        retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
      }
    } catch (err) {
      if (isUnmountedRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      if (!showReturnHint) {
        retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
      }
    }
  }, [selectedType, model, force, showReturnHint, onComplete, retimer]);

  // Pre-flight check
  useEffect(() => {
    if (status !== 'checking') return;

    let cancelled = false;

    const check = async () => {
      if (needsLlm) {
        const llmAvailable = await checkLlmServer();
        if (cancelled) return;

        if (!llmAvailable) {
          setError('LLM 服务器未运行。请先启动 LM Studio、Ollama 或其他 LLM 服务。');
          setStatus('error');
          if (!showReturnHint) {
            retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
          }
          return;
        }
      }
      if (!cancelled) {
        executeGenerate();
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [status, needsLlm, executeGenerate, showReturnHint, onComplete, retimer]);

  // Listen for key press to return to menu
  usePressAnyKey((status === 'done' || status === 'error') && showReturnHint, () => {
    onComplete?.();
  });

  const successCount = [...results.values()].filter((r) => r.success).length;
  const failedCount = [...results.values()].filter((r) => !r.success).length;

  return (
    <Box flexDirection="column">
      {status === 'selecting' && (
        <Box flexDirection="column">
          <Text>选择要生成的内容:</Text>
          <Select
            options={[
              ...GENERATE_ITEMS.map((item) => ({
                label: `${item.label} (${item.description})`,
                value: item.id,
              })),
              { label: '全部生成', value: 'all' },
              { label: '返回', value: 'cancel' },
            ]}
            onChange={handleTypeSelect}
          />
        </Box>
      )}

      {status === 'model-input' && (
        <Box flexDirection="column">
          <Text>请输入 LLM 模型名称:</Text>
          <Box marginTop={1}>
            <Text dimColor>{'> '}</Text>
            <TextInput defaultValue={DEFAULT_LLM_MODEL} onSubmit={handleModelSubmit} />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>(按回车使用默认模型: {DEFAULT_LLM_MODEL})</Text>
          </Box>
        </Box>
      )}

      {status === 'checking' && (
        <Box>
          <Spinner label={needsLlm ? '正在检查 LLM 服务器...' : '准备中...'} />
        </Box>
      )}

      {status === 'generating' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Spinner label={`正在生成 ${currentTask}...`} />
          </Box>
          <Text dimColor>子进程输出将显示在下方:</Text>
          <Text dimColor>─────────────────────────────────</Text>
        </Box>
      )}

      {status === 'done' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color="green">
              生成完成
            </Text>
          </Box>
          {[...results.entries()].map(([type, result]) => {
            const item = GENERATE_ITEMS.find((i) => i.id === type);
            return (
              <Text key={type}>
                {result.success ? <Text color="green">{'  '}✓ </Text> : <Text color="red">{'  '}✗ </Text>}
                <Text>{item?.label}</Text>
              </Text>
            );
          })}
          <Box marginTop={1}>
            <Text>
              成功: <Text color="green">{successCount}</Text>
              {failedCount > 0 && (
                <>
                  {' '}
                  失败: <Text color="red">{failedCount}</Text>
                </>
              )}
            </Text>
          </Box>
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>按任意键返回主菜单...</Text>
            </Box>
          )}
        </Box>
      )}

      {status === 'error' && (
        <Box flexDirection="column">
          <Text bold color="red">
            生成失败
          </Text>
          <Text color="red">{error}</Text>
          {needsLlm && error.includes('LLM') && (
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>提示: 启动 LLM 服务后重试</Text>
              <Text dimColor>{'  '}• LM Studio: 启动应用并加载模型</Text>
              <Text dimColor>{'  '}• Ollama: ollama serve</Text>
            </Box>
          )}
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>按任意键返回主菜单...</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
