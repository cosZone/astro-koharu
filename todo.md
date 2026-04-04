## feat

含有 中文 / 日语 等字符的 slug 转换为 拼音 / 罗马字母 的 slug

```typescript
import { slugify } from 'transliteration';

// Slugify
slugify('你好', { allowedChars: "a-zA-Z0-9-_.~/", separator: '-' });  // => 'ni-hao'
slugify('你好/世界', { allowedChars: "a-zA-Z0-9-_.~/", separator: '-' });  // => 'ni-hao-world'
```

## 需要修改 / 检查的地方

需要重点检查这些地方获取文章 url 的方式，并作修改

- [x] 文章详情页
    - [\[...slug\].astro](src\pages\[lang]\post\[...slug].astro)
    - [\[...slug\].astro](src\pages\post\[...slug].astro)
- [x] 随机文章组件
    - [PostFooterLists.tsx](src\components\post\PostFooterLists.tsx)
    - [RandomPostList.tsx](src\components\post\RandomPostList.tsx)
- [x] 相关文章组件
    - [PostRelatedList.tsx](src\components\post\PostRelatedList.tsx)
    - [PostFooterLists.tsx](src\components\post\PostFooterLists.tsx)
- [x] 分类
- [x] 标签
- [x] 归档
- [x] 周刊
    - [\[seriesSlug\].astro](src\pages\[seriesSlug].astro)
    - [routeBuilder](/src\lib\route.ts)
- [x] 首页(索引页)，包括分页
    - [routeBuilder](/src\lib\route.ts)
- [x] rss
- [x] 左侧栏系列文章组件

## 重点检查的地方

以下函数附近的代码

```typescript
// src\lib\content\locale.ts
getPostSlug()
// src\lib\route.ts
encodeSlug()
```

注意，需要检查多语言的情况

## 收尾工作

- [x] git commit 退回初始状态
- [x] 恢复测试时删去的文件
- [x] 删除测试文件

## 最后

- [ ] 配置文件里加个开关，控制是否开启转换 slug 功能

