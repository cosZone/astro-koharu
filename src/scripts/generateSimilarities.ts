/**
 * Generate semantic similarity data for blog posts using transformers.js
 * https://alexop.dev/posts/semantic-related-posts-astro-transformersjs/
 *
 * This script:
 * 1. Loads the embedding model via @huggingface/transformers
 * 2. Reads all markdown files from src/content/blog/
 * 3. Extracts plain text from title + description + body using remark
 * 4. Generates normalized embeddings for each post (batched for performance)
 * 5. Computes cosine similarity between all posts
 * 6. Stores top N similar posts per post in JSON
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { type DeviceType, env, type FeatureExtractionPipeline, pipeline } from '@huggingface/transformers';
import chalk from 'chalk';
import { glob } from 'glob';
import matter from 'gray-matter';
import { remark } from 'remark';
import strip from 'strip-markdown';

// --------- Configuration ---------
const CONTENT_GLOB = 'src/content/blog/**/*.md';
const OUTPUT_FILE = 'src/assets/similarities.json';
const TOP_N_SIMILAR = 5;
const MODEL_NAME = 'Snowflake/snowflake-arctic-embed-m-v2.0';
// Alternative: 'sentence-transformers/all-MiniLM-L6-v2' (smaller, faster)

// Whether to include body content in similarity calculation
// true: uses title + description + body (more accurate, slower)
// false: uses title + description only (faster, good for large codebases)
const INCLUDE_BODY = false;

// Whether to use AI-generated summaries instead of description
// Requires running `pnpm generate:summaries` first
// When enabled, uses AI summary for similarity calculation if available
const USE_AI_SUMMARY = true;
const SUMMARIES_FILE = 'src/assets/summaries.json';

// Cache models locally
env.cacheDir = './.cache/transformers';

// --------- Type Definitions ---------
interface PostData {
  slug: string;
  title: string;
  description?: string;
  text: string;
}

interface SimilarPost {
  slug: string;
  title: string;
  similarity: number;
}

type SimilarityMap = Record<string, SimilarPost[]>;

interface SummaryEntry {
  title: string;
  summary: string;
}

type SummariesMap = Record<string, SummaryEntry>;

const VALID_DEVICE_TYPES: DeviceType[] = [
  'auto',
  'gpu',
  'cpu',
  'wasm',
  'webgpu',
  'cuda',
  'dml',
  'webnn',
  'webnn-npu',
  'webnn-gpu',
  'webnn-cpu',
];
const DEFAULT_DEVICE: DeviceType = 'cpu';

// --------- Utility Functions ---------

function isDeviceType(value: string): value is DeviceType {
  return VALID_DEVICE_TYPES.includes(value as DeviceType);
}

/**
 * Parse CLI arguments
 * Supported: --device <value>
 */
function parseArgs(argv: string[] = process.argv.slice(2)): { device: DeviceType } {
  let device = DEFAULT_DEVICE;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--device') {
      const value = argv[i + 1];
      if (!value || !isDeviceType(value)) {
        throw new Error(`Invalid device type: ${value}. Valid options are: ${VALID_DEVICE_TYPES.join(', ')}`);
      }
      device = value;
      i++;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { device };
}

/**
 * Load AI-generated summaries from file
 */
async function loadSummaries(): Promise<SummariesMap> {
  if (!USE_AI_SUMMARY) return {};
  try {
    const data = await fs.readFile(SUMMARIES_FILE, 'utf-8');
    return JSON.parse(data) as SummariesMap;
  } catch {
    console.log(chalk.yellow(`Warning: Could not load summaries from ${SUMMARIES_FILE}`));
    console.log(chalk.gray('Run `pnpm generate:summaries` first to generate AI summaries\n'));
    return {};
  }
}

/**
 * Normalizes a vector to unit length (L2 norm == 1)
 * This makes cosine similarity a simple dot product
 */
function normalize(vec: Float32Array): Float32Array {
  const len = Math.hypot(...vec);
  if (!len) return vec;
  return new Float32Array(vec.map((x) => x / len));
}

/**
 * Computes dot product of two same-length normalized vectors
 * For normalized vectors, this equals cosine similarity
 */
function dotProduct(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Extract plain text from markdown content using remark + strip-markdown
 * This AST-based approach is more reliable than regex
 */
async function getPlainText(markdown: string): Promise<string> {
  const result = await remark().use(strip).process(markdown);
  return (
    String(result)
      // Remove import/export statements (MDX)
      .replace(/^import\s+.*$/gm, '')
      .replace(/^export\s+.*$/gm, '')
      // Remove common section headings that don't add semantic value
      .replace(/^\s*(TLDR|Introduction|Conclusion|Summary|References?|Footnotes?)\s*$/gim, '')
      // Remove all-caps headings
      .replace(/^[A-Z\s]{4,}$/gm, '')
      // Remove table remnants
      .replace(/^\|.*\|$/gm, '')
      // Remove container directives (:::)
      .replace(/^:::.*/gm, '')
      // Normalize multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Convert newlines to spaces for embedding
      .replace(/\n/g, ' ')
      // Normalize multiple spaces
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

/**
 * Extract slug from file path, with support for custom link field
 */
function extractSlug(filePath: string, link?: string): string {
  if (link) return link.toLowerCase();
  // Extract from path: src/content/blog/foo/bar.md -> foo/bar
  const relativePath = filePath.replace(/^src\/content\/blog\//, '').replace(/\.md$/, '');
  return relativePath.toLowerCase();
}

/**
 * Process a single markdown file
 */
async function processFile(filePath: string, summaries: SummariesMap): Promise<PostData | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);

    // Skip drafts
    if (frontmatter.draft) return null;

    // Skip files without title
    if (!frontmatter.title) {
      console.log(chalk.yellow(`  Skipping ${filePath}: no title`));
      return null;
    }

    // Skip posts with excludeFromSummary: true in frontmatter
    // These posts won't be included in similarity calculations
    if (frontmatter.excludeFromSummary === true) {
      return null;
    }

    const slug = extractSlug(filePath, frontmatter.link as string | undefined);

    // Use AI summary if available, otherwise use description
    const aiSummary = summaries[slug]?.summary;
    const description = aiSummary || (frontmatter.description as string) || '';

    // Combine title + description/summary (+ optional body) for embedding
    let fullText = `${frontmatter.title}. ${description}`;

    if (INCLUDE_BODY) {
      // Extract plain text using remark (AST-based, more reliable)
      const plainText = await getPlainText(body);
      fullText = `${fullText} ${plainText}`.slice(0, 8000);
    }

    return {
      slug,
      title: frontmatter.title as string,
      description,
      text: fullText,
    };
  } catch (error) {
    console.error(chalk.red(`  Error processing ${filePath}:`), error);
    return null;
  }
}

/**
 * Load and process all markdown files
 */
async function loadPosts(files: string[], summaries: SummariesMap): Promise<PostData[]> {
  console.log(chalk.blue('Processing markdown files...'));
  const posts: PostData[] = [];
  for (let i = 0; i < files.length; i++) {
    process.stdout.write(`\r  Processing ${i + 1}/${files.length}...`);
    const post = await processFile(files[i], summaries);
    if (post) posts.push(post);
  }
  console.log('');
  return posts;
}

/**
 * Generate embeddings for all posts one by one
 * Batch processing doesn't work reliably with this model
 */
async function generateEmbeddings(posts: PostData[], extractor: FeatureExtractionPipeline): Promise<Float32Array[]> {
  const embeddings: Float32Array[] = [];

  console.log(chalk.blue(`Generating embeddings for ${posts.length} posts...`));

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    process.stdout.write(`\r  Processing ${i + 1}/${posts.length}: ${post.slug.slice(0, 40)}...`);

    const output = (await extractor(post.text, {
      pooling: 'mean',
      normalize: false,
    })) as { data: Float32Array };

    embeddings.push(normalize(output.data));
  }

  console.log(`\n${chalk.green('Embeddings generated successfully!')}`);
  return embeddings;
}

/**
 * Compute top N similar posts for each post
 */
function computeSimilarities(posts: PostData[], embeddings: Float32Array[], topN: number): SimilarityMap {
  const result: SimilarityMap = {};

  console.log(chalk.blue('Computing similarities...'));

  for (let i = 0; i < posts.length; i++) {
    const similarities: SimilarPost[] = [];

    for (let j = 0; j < posts.length; j++) {
      if (i === j) continue;

      const similarity = dotProduct(embeddings[i], embeddings[j]);
      similarities.push({
        slug: posts[j].slug,
        title: posts[j].title,
        similarity: Math.round(similarity * 1000) / 1000,
      });
    }

    // Sort by similarity (descending) and take top N
    similarities.sort((a, b) => b.similarity - a.similarity);
    result[posts[i].slug] = similarities.slice(0, topN);
  }

  return result;
}

/**
 * Save results to JSON file
 */
async function saveResults(data: SimilarityMap, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
}

// --------- Main Execution ---------
async function main() {
  const startTime = Date.now();

  try {
    const { device } = parseArgs();

    console.log(chalk.cyan('=== Semantic Similarity Generator ===\n'));
    console.log(chalk.gray(`Mode: ${INCLUDE_BODY ? 'title + description + body' : 'title + description only'}`));
    console.log(chalk.gray(`AI Summary: ${USE_AI_SUMMARY ? 'enabled' : 'disabled'}`));
    console.log(chalk.gray(`Device: ${device ?? DEFAULT_DEVICE}\n`));

    // 1. Load AI summaries if enabled
    const summaries = await loadSummaries();
    if (USE_AI_SUMMARY && Object.keys(summaries).length > 0) {
      console.log(chalk.green(`Loaded ${Object.keys(summaries).length} AI summaries\n`));
    }

    // 2. Load the embedding model
    console.log(chalk.blue(`Loading model: ${MODEL_NAME}...`));
    const extractor = await pipeline('feature-extraction', MODEL_NAME, { device });
    console.log(chalk.green('Model loaded!\n'));

    // 3. Find all markdown files
    const files = await glob(CONTENT_GLOB);
    if (!files.length) {
      console.log(chalk.yellow('No content files found.'));
      return;
    }
    console.log(chalk.blue(`Found ${files.length} markdown files\n`));

    // 4. Parse and process all files
    const posts = await loadPosts(files, summaries);
    if (!posts.length) {
      console.log(chalk.red('No valid posts found.'));
      return;
    }
    console.log(chalk.green(`Loaded ${posts.length} posts\n`));

    // 5. Generate embeddings (batch mode for performance)
    const embeddings = await generateEmbeddings(posts, extractor);
    if (!embeddings.length) {
      console.log(chalk.red('No embeddings generated.'));
      return;
    }

    // 6. Compute similarities
    const similarities = computeSimilarities(posts, embeddings, TOP_N_SIMILAR);

    // 7. Save results
    await saveResults(similarities, OUTPUT_FILE);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(chalk.green(`\nDone! Generated similarities for ${posts.length} posts in ${elapsed}s`));
    console.log(chalk.cyan(`Output saved to: ${OUTPUT_FILE}`));
  } catch (error) {
    console.error(chalk.red('\nError:'), error);
    process.exitCode = 1;
  }
}

main();
