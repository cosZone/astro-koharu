# 友链分组

在 `config/site.yaml` 中添加可选的 `friends.groups`，并通过每条友链的 `group` 指定分组。分组名称和说明可自由修改；页面按分组配置顺序展示，同组友链保持 `friends.data` 中的顺序。

```yaml
friends:
  groups:
    - id: familiar
      title: 熟人
      description: 常有交流、彼此熟悉的朋友。
    - id: community
      title: 友链小伙伴
      description: 通过博客结识、交换友链的小伙伴。
    - id: following
      title: 单向关注
      description: 我喜欢阅读和推荐的博客。
  intro:
    title: 友情链接
  data:
    - site: 示例博客
      url: https://example.com/
      owner: Example
      desc: 分享生活与技术
      image: https://example.com/avatar.png
      group: following
```

- `id` 必须是非空且唯一的字符串，不能使用系统保留值 `all`、`ungrouped`；友链的 `group` 引用这个值。
- `title` 为分组标题，`description` 为可选说明。自定义文字按配置原样展示。
- 有分组配置时，页面按分组展示标题、数量和说明，顶部的页签在本页即时切换，只看某一组，不跳转、不改网址；`/friends/#friends-<id>` 链接会直接打开该组。没有 JavaScript 时所有分组照常列出。空分组只在被选中时显示空状态。
- 未填写 `group` 或引用了不存在的分组时，友链显示在最后的「未分组」中，不会消失。
- 不配置 `groups` 或设为 `[]` 时，继续展示原有的平铺列表，无须迁移旧配置。
- Koharu CLI 新建友链时会读取已有分组，允许选择分组或保持未分组；没有分组配置时，流程与旧版一致。

友链申请表仍只收集站点资料，分组由博客所有者维护。熟人关系和单向关注应按实际情况归类，不能仅凭留言或是否存在反向链接推断。
