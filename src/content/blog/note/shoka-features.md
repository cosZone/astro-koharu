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
