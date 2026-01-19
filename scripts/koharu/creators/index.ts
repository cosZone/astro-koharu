// Types

// Creators
export { FriendCreator } from './friend-creator';
export { PostCreator } from './post-creator';
export type { CategoryTreeItem, ContentCreator, CreatorProps, FriendData, PostData } from './types';

import { FriendCreator } from './friend-creator';
import { PostCreator } from './post-creator';
// Creator registry
import type { ContentCreator } from './types';

export const CREATORS: ContentCreator[] = [
  {
    id: 'post',
    label: '博客文章',
    description: '创建新的博客文章',
    Component: PostCreator,
  },
  {
    id: 'friend',
    label: '友情链接',
    description: '添加新的友情链接',
    Component: FriendCreator,
  },
];

export type CreatorType = (typeof CREATORS)[number]['id'];
