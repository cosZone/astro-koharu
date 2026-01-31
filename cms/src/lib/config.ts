/**
 * CMS Config Utilities
 *
 * Utilities for reading and modifying site configuration.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { CONFIG_PATH } from './paths';

/** CMS server port (default: 4322) */
export const CMS_PORT = 4322;

/** Astro dev server port (default: 4321) */
export const DEV_SERVER_PORT = 4321;

/** Astro dev server URL for previewing posts */
export const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

/**
 * Adds new category mappings to config/site.yaml
 * Preserves the existing file structure and adds to the categoryMap section
 */
export async function addCategoryMappings(projectRoot: string, mappings: Record<string, string>): Promise<void> {
  const configPath = path.join(projectRoot, CONFIG_PATH);
  const content = await fs.readFile(configPath, 'utf-8');

  // Parse YAML to get existing keys
  const config = yaml.load(content) as Record<string, unknown>;
  const existingCategoryMap = (config.categoryMap as Record<string, string>) || {};

  // Filter out mappings that already exist
  const newMappings: Record<string, string> = {};
  for (const [name, slug] of Object.entries(mappings)) {
    if (!(name in existingCategoryMap)) {
      newMappings[name] = slug;
    }
  }

  // No new mappings to add
  if (Object.keys(newMappings).length === 0) {
    return;
  }

  // Serialize back to YAML with targeted replacement to preserve comments
  const lines = content.split('\n');
  const newLines: string[] = [];
  let inCategoryMap = false;
  let categoryMapIndent = '';
  let insertedMappings = false;

  for (const line of lines) {
    // Check if we're entering categoryMap section
    if (/^categoryMap:\s*$/.test(line)) {
      inCategoryMap = true;
      newLines.push(line);
      continue;
    }

    // Check if we're leaving categoryMap section (new top-level key)
    if (inCategoryMap && /^[a-zA-Z]/.test(line) && !line.startsWith(' ') && !line.startsWith('#')) {
      // Insert new mappings before leaving
      if (!insertedMappings) {
        for (const [name, slug] of Object.entries(newMappings)) {
          newLines.push(`${categoryMapIndent}${name}: ${slug}`);
        }
        insertedMappings = true;
      }
      inCategoryMap = false;
    }

    // Get indent level for categoryMap entries
    if (inCategoryMap && /^\s+\S/.test(line) && !categoryMapIndent) {
      const match = line.match(/^(\s+)/);
      if (match?.[1]) {
        categoryMapIndent = match[1];
      }
    }

    newLines.push(line);
  }

  // If we never left categoryMap (it's at the end), insert now
  if (inCategoryMap && !insertedMappings) {
    for (const [name, slug] of Object.entries(newMappings)) {
      newLines.push(`${categoryMapIndent}${name}: ${slug}`);
    }
  }

  await fs.writeFile(configPath, newLines.join('\n'), 'utf-8');
}
