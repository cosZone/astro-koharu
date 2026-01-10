import { spawn } from 'node:child_process';
import path from 'node:path';
import { DEFAULT_LLM_MODEL, GENERATE_ITEMS, type GenerateType, LLM_API_URL } from '../constants/generate';
import { PROJECT_ROOT } from '../constants/paths';

export interface RunScriptResult {
  success: boolean;
  code: number;
}

export interface GenerateOptions {
  model?: string;
  force?: boolean;
  /** Progress callback for tracking current task */
  onProgress?: (taskLabel: string) => void;
}

/**
 * Run a TypeScript script using npx tsx
 * Note: Uses spawn without shell for security (avoids command injection)
 */
export function runScript(scriptPath: string, args: string[] = []): Promise<RunScriptResult> {
  return new Promise((resolve) => {
    const fullPath = path.join(PROJECT_ROOT, scriptPath);
    const child = spawn('npx', ['tsx', fullPath, ...args], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        code: code ?? 1,
      });
    });

    child.on('error', () => {
      resolve({
        success: false,
        code: 1,
      });
    });
  });
}

/**
 * Check if LLM server is running
 */
export async function checkLlmServer(): Promise<boolean> {
  try {
    const response = await fetch(`${LLM_API_URL}models`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Run a generate command by type
 */
export async function runGenerate(type: GenerateType, options: GenerateOptions = {}): Promise<RunScriptResult> {
  const item = GENERATE_ITEMS.find((i) => i.id === type);
  if (!item) {
    return { success: false, code: 1 };
  }

  const args: string[] = [];
  if (type === 'summaries') {
    if (options.model) {
      args.push('--model', options.model);
    }
    if (options.force) {
      args.push('--force');
    }
  }

  return runScript(item.script, args);
}

/**
 * Run all generate commands in sequence
 */
export async function runGenerateAll(options: GenerateOptions = {}): Promise<Map<GenerateType, RunScriptResult>> {
  const results = new Map<GenerateType, RunScriptResult>();

  for (const item of GENERATE_ITEMS) {
    options.onProgress?.(item.label);
    const result = await runGenerate(item.id, options);
    results.set(item.id, result);
    if (!result.success) {
      break;
    }
  }

  return results;
}

export { DEFAULT_LLM_MODEL, type GenerateType, GENERATE_ITEMS };
