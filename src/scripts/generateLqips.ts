/**
 * Generate simple LQIP (Low Quality Image Placeholders) for images
 *
 * This script:
 * 1. Reads all images from public/img/
 * 2. Extracts dominant colors from 4 quadrants
 * 3. Outputs CSS gradient strings to src/assets/lqips.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { glob } from 'glob';
import sharp from 'sharp';

// --------- Configuration ---------
const IMAGE_GLOB = 'public/img/**/*.{webp,jpg,jpeg,png}';
const OUTPUT_FILE = 'src/assets/lqips.json';

// --------- Type Definitions ---------
interface RgbColor {
  r: number;
  g: number;
  b: number;
}

type LqipMap = Record<string, string>;

// --------- Color Utilities ---------

/**
 * Convert RGB to hex string
 */
function rgbToHex(rgb: RgbColor): string {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

// --------- Image Processing ---------

/**
 * Process a single image and generate gradient CSS
 */
async function processImage(imagePath: string): Promise<string | null> {
  try {
    // Resize to 2x2 to get 4 quadrant colors
    const resized = await sharp(imagePath).resize(2, 2, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });

    const channels = resized.info.channels;
    const data = resized.data;

    // Extract 4 colors (top-left, top-right, bottom-left, bottom-right)
    const colors: string[] = [];
    for (let i = 0; i < 4; i++) {
      const offset = i * channels;
      const rgb: RgbColor = {
        r: data[offset],
        g: data[offset + 1],
        b: data[offset + 2],
      };
      colors.push(rgbToHex(rgb));
    }

    // Store only the 3 hex colors (without #) as a compact string
    // Colors: top-left, top-right, bottom-right (used for 0%, 50%, 100%)
    const compact = `${colors[0].slice(1)}${colors[1].slice(1)}${colors[3].slice(1)}`;

    return compact;
  } catch (error) {
    console.error(chalk.red(`  Error processing ${imagePath}:`), error);
    return null;
  }
}

/**
 * Convert file path to short key (relative to /img/)
 */
function filePathToKey(filePath: string): string {
  // public/img/cover/1.webp → cover/1.webp
  return filePath.replace(/^public\/img\//, '');
}

// --------- Main Execution ---------
async function main() {
  const startTime = Date.now();

  try {
    console.log(chalk.cyan('=== LQIP Generator ===\n'));

    const files = await glob(IMAGE_GLOB);
    if (!files.length) {
      console.log(chalk.yellow('No image files found.'));
      return;
    }
    console.log(chalk.blue(`Found ${files.length} images\n`));

    const lqips: LqipMap = {};
    let processed = 0;
    let skipped = 0;

    for (const file of files) {
      process.stdout.write(`\r  Processing ${processed + 1}/${files.length}: ${path.basename(file)}...`);

      const compact = await processImage(file);
      if (compact !== null) {
        const key = filePathToKey(file);
        lqips[key] = compact;
        processed++;
      } else {
        skipped++;
      }
    }

    console.log('');

    const dir = path.dirname(OUTPUT_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(lqips, null, 2)}\n`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(chalk.green(`\nDone! Generated LQIP for ${processed} images in ${elapsed}s`));
    if (skipped > 0) {
      console.log(chalk.yellow(`  Skipped: ${skipped} images`));
    }
    console.log(chalk.cyan(`Output saved to: ${OUTPUT_FILE}`));
  } catch (error) {
    console.error(chalk.red('\nError:'), error);
    process.exitCode = 1;
  }
}

main();
