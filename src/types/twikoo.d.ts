declare module 'twikoo/dist/twikoo.nocss.js' {
  interface TwikooInitOptions {
    envId: string;
    el: string | HTMLElement;
    region?: string;
    path?: string;
    lang?: string;
    onCommentLoaded?: () => void;
  }

  interface TwikooRecentComment {
    id: string;
    nick: string;
    mailMd5: string;
    link: string;
    comment: string;
    commentText: string;
    url: string;
    created: number;
    avatar: string;
    relativeTime: string;
  }

  export function init(options: TwikooInitOptions): Promise<void>;
  export function getCommentsCount(options: { envId: string; region?: string; urls: string[] }): Promise<number[]>;
  export function getRecentComments(options: {
    envId: string;
    region?: string;
    pageSize?: number;
    includeReply?: boolean;
  }): Promise<TwikooRecentComment[]>;
}
