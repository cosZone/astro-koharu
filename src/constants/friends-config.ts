// Import YAML config directly - processed by @rollup/plugin-yaml

import type { FriendLink, FriendsIntro } from '@lib/config/types';
import yamlConfig from '../../config/site.yaml';

// Re-export type for backwards compatibility
export type { FriendLink };

export const friendsData: FriendLink[] = yamlConfig.friends?.data ?? [];

export const friendsIntro: FriendsIntro = yamlConfig.friends?.intro ?? {
  title: 'Friends',
  subtitle: '',
  applyTitle: 'Apply for friend link',
  applyDesc: 'Leave a comment with the following format',
};
