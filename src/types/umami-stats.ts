// Umami Session Stats type

// Umami 的不同版本 api 返回的数据结构是不同的
// 但一般都含有以下字段：
// pageviews: 页面访问量
// visitors: 访问者数量

export interface UmamiSessionStats {
  pageviews:
    | {
        value: number;
      }
    | number;
  visitors:
    | {
        value: number;
      }
    | number;
  visits?:
    | {
        value: number;
      }
    | number;
  countries?:
    | {
        value: number;
      }
    | number;
  events?:
    | {
        value: number;
      }
    | number;
  bounces?:
    | {
        value: number;
      }
    | number;
  totaltime?:
    | {
        value: number;
      }
    | number;
  comparison?: {
    pageviews?:
      | {
          value: number;
        }
      | number;
    visitors?:
      | {
          value: number;
        }
      | number;
    visits?:
      | {
          value: number;
        }
      | number;
    bounces?:
      | {
          value: number;
        }
      | number;
    totaltime?:
      | {
          value: number;
        }
      | number;
  };
}

export interface UmamiSessionStatsConfig {
  baseUrl: string;
  websiteId: string;
  token: string;
  // login 方式
  loginType?: 'classic' | 'shared';
  path?: string;
  // 时间范围
  startAt?: number;
  endAt?: number;
}
