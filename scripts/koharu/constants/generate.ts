export type GenerateType = 'lqips' | 'similarities' | 'summaries';

export interface GenerateItem {
  id: GenerateType;
  label: string;
  description: string;
  duration: 'fast' | 'medium' | 'slow';
  script: string;
  requiresLlm?: boolean;
}

export const GENERATE_ITEMS: GenerateItem[] = [
  {
    id: 'lqips',
    label: 'LQIP 图片占位符',
    description: '快速 - 生成低质量图片占位符',
    duration: 'fast',
    script: 'src/scripts/generateLqips.ts', // TODO: Refactor to root scripts directory
  },
  {
    id: 'similarities',
    label: '相似度向量',
    description: '较慢 - 生成语义相似度向量 (首次需下载模型并缓存)',
    duration: 'medium',
    script: 'src/scripts/generateSimilarities.ts', // TODO: Refactor to root scripts directory
  },
  {
    id: 'summaries',
    label: 'AI 摘要',
    description: '依赖 LLM - 生成 AI 文章摘要',
    duration: 'slow',
    script: 'src/scripts/generateSummaries.ts', // TODO: Refactor to root scripts directory
    requiresLlm: true,
  },
];

export const DEFAULT_LLM_MODEL = 'qwen/qwen3-4b-2507';
export const LLM_API_URL = 'http://127.0.0.1:1234/v1/';
