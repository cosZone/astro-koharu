---
title: Shoka 主题 Markdown 语法演示
date: 2026-02-07 12:00:00
categories:
  - 笔记
tags:
  - Shoka
  - Markdown
  - 测试
description: 展示所有 Shoka 主题兼容的特殊 Markdown 语法
math: true
quiz: true
---

本文展示了从 Hexo Shoka 主题迁移的所有特殊 Markdown 语法。

## 文字特效

### 下划线 (ins)

```markdown
++这是下划线文字++

++波浪下划线++{.wavy}

++着重点标记++{.dot}
```

++这是下划线文字++

++波浪下划线++{.wavy}

++着重点标记++{.dot}

### 下划线颜色

```markdown
++主色调++{.primary} ++成功++{.success} ++警告++{.warning} ++危险++{.danger} ++信息++{.info}
```

++主色调++{.primary} ++成功++{.success} ++警告++{.warning} ++危险++{.danger} ++信息++{.info}

### 高亮 (mark)

```markdown
==这是高亮文字==
```

==这是高亮文字==

### 上下标

```markdown
H~2~O 是水的化学式
E = mc^2^ 是质能方程
```

H~2~O 是水的化学式

E = mc^2^ 是质能方程

### 颜色文字

```markdown
[红色]{.red} [粉色]{.pink} [橙色]{.orange} [黄色]{.yellow} [绿色]{.green} [水色]{.aqua} [蓝色]{.blue} [紫色]{.purple} [灰色]{.grey}
```

[红色]{.red} [粉色]{.pink} [橙色]{.orange} [黄色]{.yellow} [绿色]{.green} [水色]{.aqua} [蓝色]{.blue} [紫色]{.purple} [灰色]{.grey}

### 彩虹文字

```markdown
[这段文字会有彩虹渐变效果]{.rainbow}
```

[这段文字会有彩虹渐变效果]{.rainbow}

### 键盘键

```markdown
[Ctrl]{.kbd} + [C]{.kbd} 复制，[Ctrl]{.kbd} + [V]{.kbd} 粘贴
```

[Ctrl]{.kbd} + [C]{.kbd} 复制，[Ctrl]{.kbd} + [V]{.kbd} 粘贴

## 隐藏文字 (Spoiler)

```markdown
这里有一段!!隐藏文字，鼠标点击显示!!

这里有一段!!模糊文字，鼠标悬停显示!!{.blur}
```

这里有一段!!隐藏文字，鼠标点击显示!!

这里有一段!!模糊文字，鼠标悬停显示!!{.blur}

## 标签块 (Labels)

```markdown
[默认]{.label .default} [主要]{.label .primary} [信息]{.label .info} [成功]{.label .success} [警告]{.label .warning} [危险]{.label .danger}
```

[默认]{.label .default} [主要]{.label .primary} [信息]{.label .info} [成功]{.label .success} [警告]{.label .warning} [危险]{.label .danger}

## 提醒块 (Note Blocks)

```markdown
:::default
这是默认提醒块
:::

:::primary
这是主要提醒块，用于重要提示
:::

:::info
这是信息提醒块，用于提供额外信息
:::

:::success
这是成功提醒块，用于正面反馈
:::

:::warning
这是警告提醒块，请注意
:::

:::danger
这是危险提醒块，务必谨慎
:::

:::info no-icon
这是没有图标的信息块
:::
```

:::default
这是默认提醒块
:::

:::primary
这是主要提醒块，用于重要提示
:::

:::info
这是信息提醒块，用于提供额外信息
:::

:::success
这是成功提醒块，用于正面反馈
:::

:::warning
这是警告提醒块，请注意
:::

:::danger
这是危险提醒块，务必谨慎
:::

:::info no-icon
这是没有图标的信息块
:::

## 折叠块 (Collapse)

```markdown
+++primary 点击展开详细内容
这里是折叠的内容，点击标题可以展开或收起。

支持 **Markdown** 格式化。

- 列表项 1
- 列表项 2
+++
```

```markdown
+++warning 注意事项
这里列出一些需要注意的问题：

1. 注意事项一
2. 注意事项二
+++
```

~~~~markdown
+++danger 危险操作
请确保你知道自己在做什么！

```bash
rm -rf /  # 请勿执行此命令
```
+++
~~~~

+++primary 点击展开详细内容
这里是折叠的内容，点击标题可以展开或收起。

支持 **Markdown** 格式化。

- 列表项 1
- 列表项 2
+++

+++warning 注意事项
这里列出一些需要注意的问题：

1. 注意事项一
2. 注意事项二
+++

+++danger 危险操作
请确保你知道自己在做什么！

```bash
rm -rf /  # 请勿执行此命令
```
+++

## 标签卡 (Tabs)

````markdown
;;;tab1 JavaScript
```js
console.log('Hello, World!');
```
;;;

;;;tab1 Python
```python
print('Hello, World!')
```
;;;

;;;tab1 Rust
```rust
fn main() {
    println!("Hello, World!");
}
```
;;;
````

;;;tab1 JavaScript
```js
console.log('Hello, World!');
```
;;;

;;;tab1 Python
```python
print('Hello, World!')
```
;;;

;;;tab1 Rust
```rust
fn main() {
    println!("Hello, World!");
}
```
;;;

## 注音

```markdown
{取り返す^とりかえす}是日语中"取回"的意思。

{漢字^かんじ}的注音示例。
```

{取り返す^とりかえす}是日语中"取回"的意思。

{漢字^かんじ}的注音示例。

## 代码块增强

`````markdown
```js title="hello.js" url="https://example.com" linkText="查看源码" mark:1,3
const greeting = 'Hello';
const name = 'World';
console.log(`${greeting}, ${name}!`);
```

```bash command:("$":1-3)
npm install astro
npm run dev
npm run build
```
`````

```js title="hello.js" url="https://example.com" linkText="查看源码" mark:1,3
const greeting = 'Hello';
const name = 'World';
console.log(`${greeting}, ${name}!`);
```

```bash command:("$":1-3)
npm install astro
npm run dev
npm run build
```

## 数学公式

```markdown
行内公式：$E = mc^2$

块级公式：

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$
```

行内公式：$E = mc^2$

块级公式：

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

## 友链卡

```markdown
{% links %}
- site: 余弦の博客
  url: https://blog.cosine.ren
  owner: cos
  desc: FE / ACG / 手工
  image: https://blog.cosine.ren/img/avatar.webp
  color: '#ed788b'
- site: 示例博客
  url: https://example.com
  owner: Alice
  desc: 一个热爱技术的博客
  image: https://api.dicebear.com/7.x/avataaars/svg?seed=Alice
  color: '#BEDCFF'
{% endlinks %}
```

{% links %}
- site: 余弦の博客
  url: https://blog.cosine.ren
  owner: cos
  desc: FE / ACG / 手工
  image: https://blog.cosine.ren/img/avatar.webp
  color: '#ed788b'
- site: 示例博客
  url: https://example.com
  owner: Alice
  desc: 一个热爱技术的博客
  image: https://api.dicebear.com/7.x/avataaars/svg?seed=Alice
  color: '#BEDCFF'
{% endlinks %}

## 多媒体

### 音频

```markdown
{% media audio %}
- name: 示例音频
  url: https://music.163.com/#/song?id=3339210292
{% endmedia %}
```

{% media audio %}
- name: 示例音频
  url: https://music.163.com/#/song?id=3339210292
{% endmedia %}

### 音频歌单

```markdown
{% media audio %}
- title: 诗岸歌单 山山～全是山山～
  list:
    - https://music.163.com/#/playlist?id=8676645748
- title: 『诗岸』全是山山！
  list:
    - https://music.163.com/#/playlist?id=17606384886
{% endmedia %}
```

{% media audio %}
- title: 诗岸歌单 山山～全是山山～
  list:
    - https://music.163.com/#/playlist?id=8676645748
- title: 『诗岸』全是山山！
  list:
    - https://music.163.com/#/playlist?id=17606384886
{% endmedia %}

### 视频

```markdown
{% media video %}
- name: "测试 1"
  url: https://cdn.kastatic.org/ka-youtube-converted/O_nY1TM2RZM.mp4/O_nY1TM2RZM.mp4#t=0
- name: "测试 2"
  url: https://cdn.kastatic.org/ka-youtube-converted/O_nY1TM2RZM.mp4/O_nY1TM2RZM.mp4#t=0
{% endmedia %}
```

{% media video %}
- name: "测试 1"
  url: https://cdn.kastatic.org/ka-youtube-converted/O_nY1TM2RZM.mp4/O_nY1TM2RZM.mp4#t=0
- name: "测试 2"
  url: https://cdn.kastatic.org/ka-youtube-converted/O_nY1TM2RZM.mp4/O_nY1TM2RZM.mp4#t=0
{% endmedia %}

## 练习题

支持四种题型：**单选题**、**多选题**、**判断题**、**填空题**。

### 单选题

```markdown
- 下列哪个是 JavaScript 的基本数据类型？{.quiz}
  - Object{.options}
  - Array{.options}
  - Symbol{.correct}
  - Function{.options}

> 解析：Symbol 是 ES6 引入的基本数据类型，而 Object、Array、Function 都是引用类型。
```

- 下列哪个是 JavaScript 的基本数据类型？{.quiz}
  - Object{.options}
  - Array{.options}
  - Symbol{.correct}
  - Function{.options}

> 解析：Symbol 是 ES6 引入的基本数据类型，而 Object、Array、Function 都是引用类型。

### 多选题

```markdown
- 以下哪些是 CSS 布局方式？{.quiz .multi}
  - Flexbox{.correct}
  - jQuery{.options}
  - Grid{.correct}
  - Float{.correct}

> 解析：Flexbox、Grid 和 Float 都是 CSS 布局方式。jQuery 是一个 JavaScript 库，不属于 CSS 布局。
```

- 以下哪些是 CSS 布局方式？{.quiz .multi}
  - Flexbox{.correct}
  - jQuery{.options}
  - Grid{.correct}
  - Float{.correct}

> 解析：Flexbox、Grid 和 Float 都是 CSS 布局方式。jQuery 是一个 JavaScript 库，不属于 CSS 布局。

### 判断题

```markdown
- `const` 声明的变量不能重新赋值，但可以修改其属性。{.quiz .true}

> 解析：`const` 只保证变量绑定不可变，如果变量指向一个对象，其属性仍然可以修改。

- HTML 是一种编程语言。{.quiz}

> 解析：HTML（超文本标记语言）是一种标记语言，不是编程语言。它没有逻辑控制能力。
```

- `const` 声明的变量不能重新赋值，但可以修改其属性。{.quiz .true}

> 解析：`const` 只保证变量绑定不可变，如果变量指向一个对象，其属性仍然可以修改。

- HTML 是一种编程语言。{.quiz}

> 解析：HTML（超文本标记语言）是一种标记语言，不是编程语言。它没有逻辑控制能力。

### 填空题

```markdown
- 在 JavaScript 中，`typeof null` 的结果是 [object]{.gap}。{.quiz .fill}

> 解析：这是一个历史遗留 bug。`null` 的类型标签与 object 相同，因此 `typeof null` 返回 `"object"`。常见错误答案是 [null]{.mistake}。
```

- 在 JavaScript 中，`typeof null` 的结果是 [object]{.gap}。{.quiz .fill}

> 解析：这是一个历史遗留 bug。`null` 的类型标签与 object 相同，因此 `typeof null` 返回 `"object"`。常见错误答案是 [null]{.mistake}。

- CSS 中，[Flexbox]{.gap} 适合一维布局，[Grid]{.gap} 适合二维布局，而 [Float]{.gap} 是传统的布局方式。{.quiz .fill}

> 解析：Flexbox 是一维布局模型（行或列），Grid 是二维布局模型（行和列同时控制），Float 是 CSS2 时代的传统布局方式。

## 加密内容块 (Encrypted Block)

使用 `:::encrypted{password="密码"}` 语法可以创建加密区块。区块内的内容在构建时使用 AES-256-GCM 进行真正加密，密码不会出现在最终的 HTML 中。读者需要输入正确密码才能解密查看。

**适用场景**：防止搜索引擎/爬虫收录敏感内容（如私人资源链接、付费内容片段等）。

:::info
前端无法实现真正意义上的加密：密码总需要在客户端输入，密文和算法都对用户可见，安全性完全取决于密码强度。本功能的目的不是对抗有针对性的破解，而是**防止搜索引擎和爬虫直接收录明文内容**。对于这个场景，AES-256-GCM 已经足够：构建产物中只有密文，不含密码和明文，搜索引擎无法索引加密区块的内容。
:::

````markdown

:::encrypted{password="test"}
这里是加密的内容，支持完整的 Markdown 语法：

- **粗体**、*斜体*、~~删除线~~
- `行内代码`
- [链接](https://example.com)

```js
console.log('加密内容中的代码也有语法高亮！');
```

行内公式 $E = mc^2$ 也可以正常渲染。
:::

:::encrypted{password="another"}
每个加密块可以设置独立的密码。
:::
````

:::encrypted{password="test"}
这里是加密的内容，支持完整的 Markdown 语法：

- **粗体**、*斜体*、~~删除线~~
- `行内代码`
- [链接](https://example.com)

```js
console.log('加密内容中的代码也有语法高亮！');
```

行内公式 $E = mc^2$ 也可以正常渲染。
:::

:::encrypted{password="another"}
每个加密块可以设置独立的密码。
:::
