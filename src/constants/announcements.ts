// Import YAML config directly - processed by @rollup/plugin-yaml

import type { Announcement } from '@/types/announcement';
import yamlConfig from '../../config/site.yaml';

/**
 * Site Announcements Configuration
 *
 * Announcements are loaded from config/site.yaml
 * They will automatically appear based on their startDate/endDate settings.
 */
export const announcements: Announcement[] = (yamlConfig.announcements ?? []).map((a) => ({
  id: a.id,
  title: a.title,
  content: a.content,
  type: a.type,
  publishDate: a.publishDate,
  startDate: a.startDate,
  endDate: a.endDate,
  priority: a.priority,
  link: a.link,
  color: a.color,
}));
