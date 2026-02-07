/**
 * Remark plugin wrapper for shoka-preprocessor.
 *
 * Problem: Some Shoka syntax conflicts with standard Markdown/GFM parsing:
 * - `+++style Title` → parsed as thematicBreak before any remark plugin runs
 * - `~sub~` → parsed as GFM strikethrough (~~ is delete)
 * - `{% links %}` YAML content → parsed as Markdown lists
 *
 * Solution: This remark plugin runs as the FIRST plugin in the pipeline.
 * It reads `file.value` (the original raw text preserved in VFile), applies
 * the preprocessor, then re-parses the modified text into a new MDAST and
 * replaces the current tree's children.
 *
 * The re-parse pipeline must include all parser extensions (GFM, math) that
 * the main Astro pipeline uses, so that the new tree correctly recognizes
 * syntax like $...$ as math nodes rather than plain text.
 */
import type { Root } from 'mdast';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { VFile } from 'vfile';
import { preprocessShokaSyntax } from './shoka-preprocessor';

interface RemarkShokaPreprocessOptions {
  enableContainers?: boolean;
  enableHexoTags?: boolean;
  enableSuperSub?: boolean;
  enableMath?: boolean;
  enableEncryptedBlock?: boolean;
}

export function remarkShokaPreprocess(options?: RemarkShokaPreprocessOptions) {
  // Build the re-parse pipeline once (same parser extensions as Astro's main pipeline)
  const pipeline = unified().use(remarkParse).use(remarkGfm);
  if (options?.enableMath !== false) {
    pipeline.use(remarkMath);
  }
  if (options?.enableEncryptedBlock) {
    // remarkDirective must be in re-parse pipeline so :::encrypted survives re-parsing
    pipeline.use(remarkDirective);
  }

  return (tree: Root, file: VFile) => {
    const raw = String(file.value);
    if (!raw) return;

    const processed = preprocessShokaSyntax(raw, {
      enableContainers: options?.enableContainers,
      enableHexoTags: options?.enableHexoTags,
      enableSuperSub: options?.enableSuperSub,
    });

    // If no changes, skip re-parse
    if (processed === raw) return;

    // Re-parse the preprocessed text into a new MDAST
    const newTree = pipeline.parse(processed);

    // Replace the tree's children with the newly parsed ones
    tree.children = newTree.children;
  };
}
