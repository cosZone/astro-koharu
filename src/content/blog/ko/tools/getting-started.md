---
title: astro-koharu에 오신 것을 환영합니다
link: getting-started
catalog: true
date: 2024-01-01 00:00:00
description: astro-koharu 블로그 테마를 사용해 주셔서 감사합니다! Astro 기반의 현대적인 블로그 시스템으로, 우아한 인터페이스와 풍부한 기능을 갖추고 있습니다.
tags:
  - 入门
  - Astro
categories:
  - 工具
sticky: true
---

astro-koharu 블로그 테마를 사용해 주셔서 감사합니다!

## 이 테마에 대하여

astro-koharu는 Astro 7.x를 기반으로 구축된 현대적인 블로그 시스템으로, Hexo의 Shoka 테마에서 영감을 받아 디자인되었습니다. 다음과 같은 특징이 있습니다:

- **우수한 성능** - Astro 정적 사이트 생성을 기반으로 하여 로딩 속도가 빠름
- **우아한 디자인** - 모에/이차원 스타일, 핑크와 블루 배색
- **풍부한 기능** - 다단계 카테고리, 태그, 목차, 검색 등
- **반응형** - 데스크톱과 모바일 기기에 완벽하게 최적화

## 빠른 시작

### 1. 블로그 설정하기

`config/site.yaml` 파일을 편집하세요:

```yaml
site:
  title: 블로그 이름
  author: 작성자 이름
  description: 블로그 소개
  # ...기타 설정
```

### 2. 첫 번째 게시물 작성하기

`src/content/blog/` 디렉토리에 Markdown 파일을 생성하세요:

```markdown
---
title: 나의 첫 번째 게시물
date: 2024-01-01
tags:
  - 태그1
categories:
  - 카테고리명
---

게시물 내용...
```

### 3. 배포하기

Vercel을 통한 원클릭 배포를 추천합니다:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cosZone/astro-koharu)

## 더 알아보기

- 모든 Markdown 확장 기능을 확인하려면 [Markdown 기능 데모](/post/markdown-features)를 참조하세요.
- 상세한 설정 방법은 [사용 가이드](/post/astro-koharu-guide)를 참조하세요.

즐겁게 사용하시길 바랍니다!
