import DOMPurify from 'dompurify';

import { type PreviewMetadataResponse, readLinkMetadata } from './link-metadata';

interface CachedLink {
  expires: number;
  value: Promise<PreviewMetadataResponse>;
}

const linkCache = new Map<string, CachedLink>();
const MAX_CACHED_LINKS = 100;
let mermaidId = 0;
let activeLinkRequests = 0;
const linkRequestQueue: (() => void)[] = [];
const decryptedScopes = new WeakMap<HTMLElement, () => void>();

async function fetchLink(endpoint: string, url: string): Promise<PreviewMetadataResponse> {
  const key = `${endpoint}\n${url}`;
  const cached = linkCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const value = (async () => {
    if (activeLinkRequests >= 3) await new Promise<void>((resolve) => linkRequestQueue.push(resolve));
    activeLinkRequests += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const target = new URL(endpoint, location.href);
      target.searchParams.set('url', url);
      // Same-origin deployments may require the host's preview login; never send credentials to another instance.
      const response = await fetch(target, {
        signal: controller.signal,
        credentials: target.origin === location.origin ? 'same-origin' : 'omit',
      });
      if (!response.ok) throw new Error('链接信息暂时无法获取');
      return await readLinkMetadata(response);
    } finally {
      clearTimeout(timeout);
      activeLinkRequests -= 1;
      linkRequestQueue.shift()?.();
    }
  })();
  const entry = { expires: Date.now() + 5 * 60_000, value };
  linkCache.set(key, entry);
  void value.catch(() => {
    if (linkCache.get(key) === entry) linkCache.delete(key);
  });
  while (linkCache.size > MAX_CACHED_LINKS) {
    const oldest = linkCache.keys().next().value;
    if (oldest) linkCache.delete(oldest);
  }
  return value;
}

/** Scope every listener and deferred DOM write to one preview revision. */
export function enhanceEditorPreview(container: HTMLElement): () => void {
  const doc = container.ownerDocument;
  const win = doc.defaultView;
  const cleanups: (() => void)[] = [];
  let disposed = false;
  const live = (element: Element) => !disposed && container.contains(element);

  function listen<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
  ) {
    element.addEventListener(type, handler);
    cleanups.push(() => element.removeEventListener(type, handler));
  }

  function images(root: ParentNode) {
    root.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
      const loaded = () => image.classList.add('loaded');
      const failed = () => {
        image.classList.add('error');
        if (!image.classList.contains('markdown-image') && !image.classList.contains('link-preview-image')) return;
        if (image.parentElement?.querySelector('.markdown-image-error, .link-preview-image-error')) return;
        const error = doc.createElement('span');
        error.className = image.classList.contains('link-preview-image') ? 'link-preview-image-error' : 'markdown-image-error';
        error.setAttribute('role', 'img');
        error.setAttribute('aria-label', image.alt ? `图片加载失败：${image.alt}` : '图片加载失败');
        error.textContent = '图片加载失败';
        image.parentElement?.appendChild(error);
      };
      listen(image, 'load', loaded);
      listen(image, 'error', failed);
      if (image.complete) (image.naturalWidth > 0 ? loaded : failed)();
    });
  }

  function links(root: ParentNode) {
    root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
      const href = (anchor.getAttribute('href') ?? '').trim();
      if (href.startsWith('#')) {
        listen(anchor, 'click', (event) => {
          event.preventDefault();
          let id = href.slice(1);
          try {
            id = decodeURIComponent(id);
          } catch {
            // Incomplete percent escapes can occur while the author is typing an anchor.
          }
          const target = doc.getElementById(id);
          if (target && container.contains(target)) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } else {
        try {
          const url = new URL(href, doc.baseURI);
          if (url.protocol === 'https:' || url.protocol === 'http:') {
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
          }
        } catch {
          // An unfinished URL can occur while the author is typing.
        }
      }
    });
  }
  links(container);

  container.querySelectorAll<HTMLElement>('.tab-group').forEach((group, groupIndex) => {
    const headers = Array.from(group.querySelectorAll<HTMLElement>(':scope > .tab-headers > .tab-header'));
    const panels = Array.from(group.querySelectorAll<HTMLElement>(':scope > .tab-panel'));
    const select = (index: number) => {
      headers.forEach((header, current) => {
        header.setAttribute('aria-selected', String(index === current));
        header.tabIndex = index === current ? 0 : -1;
      });
      panels.forEach((panel, current) => {
        panel.classList.toggle('active', current === index);
        panel.hidden = current !== index;
      });
    };
    headers.forEach((header, index) => {
      const id = `editor-tab-${groupIndex}-${index}`;
      header.id = id;
      header.setAttribute('aria-controls', `${id}-panel`);
      if (panels[index]) {
        panels[index].id = `${id}-panel`;
        panels[index].setAttribute('aria-labelledby', id);
      }
      listen(header, 'click', () => select(index));
      listen(header, 'keydown', (event) => {
        const forward = event.key === 'ArrowRight';
        const backward = event.key === 'ArrowLeft';
        if (!forward && !backward && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? headers.length - 1
              : (index + (forward ? 1 : -1) + headers.length) % headers.length;
        select(next);
        headers[next]?.focus();
      });
    });
    select(0);
  });

  container.querySelectorAll<HTMLElement>('spoiler-span, .spoiler.blur').forEach((spoiler) => {
    if (spoiler.tagName.toLowerCase() === 'spoiler-span' && win?.customElements.get('spoiler-span')) return;
    spoiler.dataset.fallbackReady = 'true';
    spoiler.setAttribute('role', 'button');
    spoiler.tabIndex = 0;
    spoiler.setAttribute('aria-label', '显示隐藏内容');
    spoiler.setAttribute('aria-pressed', 'false');
    const reveal = () => {
      spoiler.classList.toggle('revealed');
      const revealed = spoiler.classList.contains('revealed');
      spoiler.dataset.fallbackRevealed = String(revealed);
      spoiler.setAttribute('aria-pressed', String(revealed));
      spoiler.setAttribute('aria-label', revealed ? '隐藏内容' : '显示隐藏内容');
    };
    listen(spoiler, 'click', reveal);
    listen(spoiler, 'keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      reveal();
    });
  });

  images(container);

  async function enhanceLink(block: HTMLElement) {
    const url = block.dataset.editorOgUrl;
    const endpoint = block.dataset.editorOgEndpoint;
    if (!url || !endpoint) return;
    try {
      const data = await fetchLink(endpoint, url);
      if (!live(block)) return;
      if (data.html && win) {
        const purifier = DOMPurify(win);
        block.innerHTML = purifier.sanitize(data.html, {
          USE_PROFILES: { html: true, svg: true, mathMl: true },
          ADD_ATTR: ['target', 'loading', 'referrerpolicy'],
          FORBID_TAGS: ['style', 'form', 'input', 'textarea', 'select'],
        });
        block.dataset.state = data.error ? 'error' : 'success';
        images(block);
        links(block);
      } else {
        const title = block.querySelector('a');
        if (title && data.title) title.textContent = data.title;
        const status = block.querySelector('p');
        if (status) status.textContent = data.description ?? '未提供链接摘要';
        block.dataset.state = data.error ? 'error' : 'success';
      }
    } catch {
      if (!live(block)) return;
      block.dataset.state = 'error';
      const status = block.querySelector('p');
      if (status) status.textContent = '链接信息获取失败，原链接仍可打开';
    }
  }

  async function diagram(pre: HTMLElement) {
    const source = pre.dataset.diagram ?? pre.textContent ?? '';
    try {
      const { default: mermaid } = await import('mermaid');
      if (!live(pre)) return;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: doc.documentElement.classList.contains('dark') ? 'dark' : 'default',
      });
      const scratch = doc.createElement('div');
      scratch.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
      doc.body.appendChild(scratch);
      try {
        const { svg, bindFunctions } = await mermaid.render(`editor-mermaid-${++mermaidId}`, source, scratch);
        if (!live(pre)) return;
        pre.innerHTML = svg;
        pre.dataset.processed = 'true';
        bindFunctions?.(pre);
      } finally {
        scratch.remove();
      }
    } catch {
      if (!live(pre)) return;
      pre.dataset.processed = 'error';
      pre.setAttribute('aria-label', '图表语法暂不完整，显示源码');
    }
  }

  async function codepen(block: HTMLElement) {
    if (!live(block) || block.dataset.editorCodepenEnhanced === 'true') return;
    const user = block.dataset.user;
    const pen = block.dataset.slugHash;
    if (!user || !pen || !/^[\w-]+$/.test(user) || !/^[\w-]+$/.test(pen)) return;
    const frame = doc.createElement('iframe');
    frame.title = `CodePen：${user} / ${pen}`;
    frame.src = `https://codepen.io/${encodeURIComponent(user)}/embed/${encodeURIComponent(pen)}?default-tab=result`;
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
    frame.setAttribute('allow', 'fullscreen');
    frame.setAttribute('loading', 'lazy');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.style.cssText = 'width:100%;height:400px;border:0';
    block.dataset.editorCodepenEnhanced = 'true';
    block.prepend(frame);
  }

  const deferred = new Map<Element, () => Promise<void>>();
  container.querySelectorAll<HTMLElement>('[data-editor-og-url]').forEach((block) => {
    deferred.set(block, () => enhanceLink(block));
  });
  container.querySelectorAll<HTMLElement>('pre.mermaid').forEach((pre) => {
    deferred.set(pre, () => diagram(pre));
  });
  container.querySelectorAll<HTMLElement>('.codepen[data-user][data-slug-hash]').forEach((block) => {
    deferred.set(block, () => codepen(block));
  });
  if (win?.IntersectionObserver) {
    const observer = new win.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          void deferred.get(entry.target)?.();
          deferred.delete(entry.target);
        }
      },
      { rootMargin: '300px' },
    );
    deferred.forEach((_task, element) => {
      observer.observe(element);
    });
    cleanups.push(() => observer.disconnect());
  } else {
    deferred.forEach((task) => {
      void task();
    });
  }

  const encrypted = Array.from(
    container.querySelectorAll<HTMLElement>('.encrypted-block[data-cipher], .encrypted-post[data-cipher]'),
  );
  const encryptedPosts = new Set(encrypted.filter((block) => block.classList.contains('encrypted-post')));
  const remaining = new Set(encrypted);
  const ownedDecryptedRoots = new Set<HTMLElement>();
  const enhanceDecrypted = () => {
    if (disposed) return;
    for (const block of remaining) {
      if (!live(block)) {
        remaining.delete(block);
        continue;
      }
      const unlocked = encryptedPosts.has(block)
        ? !block.dataset.cipher
          ? block
          : null
        : block.querySelector<HTMLElement>(':scope > .encrypted-block-mount > .encrypted-block-content');
      if (!unlocked) continue;
      remaining.delete(block);
      if (decryptedScopes.has(unlocked)) continue;
      const cleanup = enhanceEditorPreview(unlocked);
      decryptedScopes.set(unlocked, cleanup);
      ownedDecryptedRoots.add(unlocked);
    }
    if (remaining.size === 0) encryptedObserver?.disconnect();
  };
  const encryptedObserver = win?.MutationObserver && remaining.size > 0 ? new win.MutationObserver(enhanceDecrypted) : null;
  encrypted.forEach((block) => {
    encryptedObserver?.observe(block, { childList: true, subtree: true });
  });
  doc.addEventListener('content:decrypted', enhanceDecrypted);
  cleanups.push(() => {
    doc.removeEventListener('content:decrypted', enhanceDecrypted);
    encryptedObserver?.disconnect();
    ownedDecryptedRoots.forEach((root) => {
      decryptedScopes.get(root)?.();
      decryptedScopes.delete(root);
    });
  });
  enhanceDecrypted();

  return () => {
    disposed = true;
    for (const cleanup of cleanups) cleanup();
    deferred.clear();
  };
}
