/**
 * Generate AI summaries for blog posts using xsai SDK
 *
 * This script:
 * 1. Reads all markdown files from src/content/blog/
 * 2. Extracts plain text from body using remark
 * 3. Calls LLM API (OpenAI-compatible) to generate summaries
 * 4. Caches results for incremental updates
 * 5. Outputs summaries.json for page display
 *
 * Usage:
 *   pnpm generate:summaries                    # Use default model
 *   pnpm generate:summaries --model qwen2.5:1.5b
 *   pnpm generate:summaries --force            # Regenerate all
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateText } from '@xsai/generate-text';
import chalk from 'chalk';
import { glob } from 'glob';
import matter from 'gray-matter';
import { remark } from 'remark';
import strip from 'strip-markdown';

// --------- Configuration ---------
const CONTENT_GLOB = 'src/content/blog/**/*.md';
const CACHE_FILE = '.cache/summaries-cache.json';
const OUTPUT_FILE = 'src/assets/summaries.json';
const CACHE_VERSION = '1';

// LLM API settings (OpenAI-compatible)
// Works with: LM Studio, Ollama, OpenAI, etc.
const API_BASE_URL = 'http://127.0.0.1:1234/v1/';
const API_KEY = 'lm-studio'; // LM Studio doesn't require a real key
const DEFAULT_MODEL = 'qwen/qwen3-4b-2507';

// Exclude patterns - posts matching these patterns won't get summaries
const EXCLUDE_PATTERNS = [
  'weekly-', // Exclude weekly newsletters
];

// --------- Parse CLI Arguments ---------
function parseArgs(): { model: string; force: boolean } {
  const args = process.argv.slice(2);
  let model = DEFAULT_MODEL;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      model = args[i + 1];
      i++;
    } else if (args[i] === '--force') {
      force = true;
    }
  }

  return { model, force };
}

// --------- Type Definitions ---------
interface PostData {
  slug: string;
  title: string;
  text: string;
  hash: string;
}

interface CacheEntry {
  hash: string;
  title: string;
  summary: string;
  generatedAt: string;
}

interface SummariesCache {
  version: string;
  model: string;
  entries: Record<string, CacheEntry>;
}

interface SummaryOutput {
  title: string;
  summary: string;
}

// --------- Utility Functions ---------

function shouldExclude(slug: string): boolean {
  return EXCLUDE_PATTERNS.some((pattern) => slug.includes(pattern));
}

function computeHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

async function loadCache(): Promise<SummariesCache | null> {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(data) as SummariesCache;
  } catch {
    return null;
  }
}

async function saveCache(cache: SummariesCache): Promise<void> {
  const dir = path.dirname(CACHE_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function isCacheValid(cache: SummariesCache, model: string): boolean {
  return cache.version === CACHE_VERSION && cache.model === model;
}

async function getPlainText(markdown: string): Promise<string> {
  const result = await remark().use(strip).process(markdown);
  return String(result)
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+.*$/gm, '')
    .replace(/^\s*(TLDR|Introduction|Conclusion|Summary|References?|Footnotes?)\s*$/gim, '')
    .replace(/^[A-Z\s]{4,}$/gm, '')
    .replace(/^\|.*\|$/gm, '')
    .replace(/^:::.*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractSlug(filePath: string, link?: string): string {
  if (link) return link;
  const relativePath = filePath.replace(/^src\/content\/blog\//, '').replace(/\.md$/, '');
  return relativePath;
}

// --------- LLM API ---------

async function checkApiRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}models`);
    return response.ok;
  } catch {
    return false;
  }
}

async function generateSummary(text: string, model: string): Promise<string> {
  // Truncate text to avoid token limits
  const truncatedText = text.slice(0, 6000);

  const { text: summary } = await generateText({
    apiKey: API_KEY,
    baseURL: API_BASE_URL,
    model,
    messages: [
      {
        role: 'system',
        content:
          '你是一个文章总结助手。请用中文，用 2-3 句话简洁地总结文章的核心内容。只输出总结，不要有任何前缀、解释或思考过程。',
      },
      {
        role: 'user',
        content: `请总结以下文章：\n\n${truncatedText}`,
      },
    ],
    temperature: 0.3,
    maxTokens: 200,
  });

  if (!summary) {
    throw new Error('No summary received from LLM response');
  }
  return summary.trim();
}

// --------- File Processing ---------

async function processFile(filePath: string): Promise<PostData | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);

    if (frontmatter.draft) return null;

    if (!frontmatter.title) {
      console.log(chalk.yellow(`  Skipping ${filePath}: no title`));
      return null;
    }

    const slug = extractSlug(filePath, frontmatter.link as string | undefined);

    if (shouldExclude(slug)) {
      return null;
    }

    const plainText = await getPlainText(body);
    const hash = computeHash(content);

    return {
      slug,
      title: frontmatter.title as string,
      text: plainText,
      hash,
    };
  } catch (error) {
    console.error(chalk.red(`  Error processing ${filePath}:`), error);
    return null;
  }
}

async function loadPosts(files: string[]): Promise<PostData[]> {
  console.log(chalk.blue('Processing markdown files...'));
  const posts: PostData[] = [];
  for (let i = 0; i < files.length; i++) {
    process.stdout.write(`\r  Processing ${i + 1}/${files.length}...`);
    const post = await processFile(files[i]);
    if (post) posts.push(post);
  }
  console.log('');
  return posts;
}

// --------- Main Execution ---------

async function main() {
  const startTime = Date.now();
  const { model, force } = parseArgs();

  try {
    console.log(chalk.cyan('=== AI Summary Generator ===\n'));
    console.log(chalk.gray(`Model: ${model}`));
    if (force) {
      console.log(chalk.yellow('Force regenerate: ignoring cache'));
    }
    console.log('');

    // Check LLM API is running
    console.log(chalk.blue(`Checking API connection (${API_BASE_URL})...`));
    const apiRunning = await checkApiRunning();
    if (!apiRunning) {
      console.log(chalk.red('Error: LLM API is not running.'));
      console.log(chalk.gray('Please start your LLM server (LM Studio, Ollama, etc.)'));
      process.exitCode = 1;
      return;
    }
    console.log(chalk.green('API connected!\n'));

    // Load cache
    let cache = force ? null : await loadCache();
    if (cache) {
      if (isCacheValid(cache, model)) {
        console.log(chalk.gray(`Loaded cache with ${Object.keys(cache.entries).length} entries\n`));
      } else {
        console.log(chalk.yellow('Cache invalidated (model changed), will regenerate all\n'));
        cache = null;
      }
    } else if (!force) {
      console.log(chalk.gray('No cache found, will generate all summaries\n'));
    }

    // Find all markdown files
    const files = await glob(CONTENT_GLOB);
    if (!files.length) {
      console.log(chalk.yellow('No content files found.'));
      return;
    }
    console.log(chalk.blue(`Found ${files.length} markdown files\n`));

    // Process all files
    const posts = await loadPosts(files);
    if (!posts.length) {
      console.log(chalk.red('No valid posts found.'));
      return;
    }
    console.log(chalk.green(`Loaded ${posts.length} posts\n`));

    // Generate summaries incrementally
    const validCache = cache?.entries || {};
    const newEntries: Record<string, CacheEntry> = {};
    let cached = 0;
    let generated = 0;
    let errors = 0;

    console.log(chalk.blue('Generating summaries...'));

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const cachedEntry = validCache[post.slug];

      if (cachedEntry && cachedEntry.hash === post.hash) {
        // Use cached summary
        newEntries[post.slug] = cachedEntry;
        cached++;
        process.stdout.write(`\r  [${i + 1}/${posts.length}] ${chalk.gray('cached')}: ${post.slug.slice(0, 40)}...`);
      } else {
        // Generate new summary
        process.stdout.write(`\r  [${i + 1}/${posts.length}] ${chalk.yellow('generating')}: ${post.slug.slice(0, 40)}...`);

        try {
          const summary = await generateSummary(post.text, model);
          newEntries[post.slug] = {
            hash: post.hash,
            title: post.title,
            summary,
            generatedAt: new Date().toISOString(),
          };
          generated++;
        } catch (error) {
          console.log('');
          console.error(chalk.red(`  Error generating summary for ${post.slug}:`), error);
          errors++;
          // Keep old cached entry if available
          if (cachedEntry) {
            newEntries[post.slug] = cachedEntry;
          }
        }
      }
    }

    console.log('');
    console.log(chalk.green(`  Cached: ${cached}, Generated: ${generated}, Errors: ${errors}`));

    // Save cache
    const newCache: SummariesCache = {
      version: CACHE_VERSION,
      model,
      entries: newEntries,
    };
    await saveCache(newCache);
    console.log(chalk.gray(`\nCache saved to: ${CACHE_FILE}`));

    // Generate output file for page display
    const output: Record<string, SummaryOutput> = {};
    for (const [slug, entry] of Object.entries(newEntries)) {
      output[slug] = {
        title: entry.title,
        summary: entry.summary,
      };
    }

    const outputDir = path.dirname(OUTPUT_FILE);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(chalk.green(`\nDone! Generated summaries for ${Object.keys(newEntries).length} posts in ${elapsed}s`));
    console.log(chalk.cyan(`Output saved to: ${OUTPUT_FILE}`));
  } catch (error) {
    console.error(chalk.red('\nError:'), error);
    process.exitCode = 1;
  }
}

main();
