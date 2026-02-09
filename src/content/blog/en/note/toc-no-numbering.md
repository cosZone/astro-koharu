---
title: Disabling TOC Numbering Example
link: toc-no-numbering
catalog: true
tocNumbering: false
date: 2024-01-07 00:00:00
description: Demonstrates how to disable automatic numbering in the table of contents.
tags:
  - 目录
  - 教程
categories:
  - 笔记
---

This post demonstrates how to disable automatic TOC numbering.

## TOC Numbering Feature

By default, astro-koharu uses CSS counters to automatically add hierarchical numbering to the table of contents:

- 1. Chapter One
  - 1.1. Section One
  - 1.2. Section Two
- 2. Chapter Two

## Disabling Numbering

Set `tocNumbering: false` to disable numbering for a specific post:

```yaml
---
title: My Post
tocNumbering: false
---
```

## Comparison

### With Numbering (Default)

TOC items display numbers like 1., 1.1., 1.1.1.

### Without Numbering

TOC items show only heading text, no number prefix.

## This Post's Effect

This post has `tocNumbering: false` set. Check the sidebar TOC (desktop) or expand the TOC (mobile) to see the result.

## Technical Implementation

Numbering is implemented with pure CSS counters — zero runtime overhead:

```css
.toc-numbering {
  counter-reset: h2;
}

.toc-numbering h2::before {
  counter-increment: h2;
  content: counter(h2) ". ";
}
```

## When to Disable

Consider disabling numbering for:

- Essay-style posts
- Headings that already have numbers
- Posts with loose structure
- Personal preference

## Summary

TOC numbering is an optional feature — use it flexibly based on the type of content.
