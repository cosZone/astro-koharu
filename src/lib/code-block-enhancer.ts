/**
 * 代码块增强工具
 * 为 Shiki 渲染的代码块添加 Mac 窗口风格工具栏
 */

/**
 * 转义 HTML 特殊字符（用于语言名称显示）
 */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, '');
}

export interface CodeBlockInfo {
  element: HTMLElement;
  language: string;
  code: string;
  codeHTML: string;
  preClassName: string;
  preStyle: string;
  codeClassName: string;
}

/**
 * 从 Shiki 生成的代码块中提取语言
 */
export function extractLanguage(preElement: HTMLElement): string {
  // Check for mermaid class (astro-mermaid uses this)
  // Mermaid blocks are handled separately by mermaid-enhancer.ts
  if (preElement.classList.contains('mermaid')) {
    return 'mermaid';
  }

  // Primary method: Check for data-language attribute on pre element
  // This is the standard way Shiki adds language information in Astro
  // Shiki 会在 pre 标签的 data-language 属性中添加语言信息
  const dataLang = preElement.getAttribute('data-language');
  if (dataLang) {
    return dataLang;
  }

  // Fallback 1: Check for language-* class on code element
  // This handles cases where other markdown processors are used
  const codeElement = preElement.querySelector('code');
  if (codeElement) {
    const classes = codeElement.className.split(' ');
    const langClass = classes.find((cls) => cls.startsWith('language-'));
    if (langClass) {
      return langClass.replace('language-', '');
    }
  }

  // Fallback 2: Default to 'text' for plain code blocks
  return 'text';
}

/**
 * 提取代码内容（纯文本）
 */
export function extractCode(preElement: HTMLElement): string {
  const codeElement = preElement.querySelector('code');
  return codeElement?.textContent || '';
}

/**
 * 提取代码 HTML（保留语法高亮）
 */
export function extractCodeHTML(preElement: HTMLElement): string {
  const codeElement = preElement.querySelector('code');
  return codeElement?.innerHTML || '';
}

/**
 * 提取 pre 标签的 class
 */
export function extractPreClassName(preElement: HTMLElement): string {
  return preElement.className;
}

/**
 * 提取 pre 标签的内联样式
 */
export function extractPreStyle(preElement: HTMLElement): string {
  return preElement.getAttribute('style') || '';
}

/**
 * 提取 code 标签的 class
 */
export function extractCodeClassName(preElement: HTMLElement): string {
  const codeElement = preElement.querySelector('code');
  return codeElement?.className || '';
}

export interface ToolbarOptions {
  enableCopy?: boolean;
  enableFullscreen?: boolean;
}

/**
 * 创建工具栏 HTML
 */
export function createToolbar(language: string, options: ToolbarOptions = {}): string {
  const { enableCopy = true, enableFullscreen = true } = options;
  // 转义语言名防止 XSS
  const safeLanguage = escapeHtml(language);

  const fullscreenBtn = enableFullscreen
    ? `
        <button
          class="code-block-button code-block-fullscreen"
          aria-label="全屏查看"
          title="全屏查看"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
        </button>`
    : '';

  const copyBtn = enableCopy
    ? `
        <button
          class="code-block-button code-block-copy"
          aria-label="复制代码"
          title="复制代码"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 448 512" fill="currentColor">
            <path d="M192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-200.6c0-17.4-7.1-34.1-19.7-46.2L370.6 17.8C358.7 6.4 342.8 0 326.3 0L192 0zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-16-64 0 0 16-192 0 0-256 16 0 0-64-16 0z"/>
          </svg>
        </button>`
    : '';

  return `
    <div class="code-block-toolbar">
      <div class="code-block-dots">
        <span class="code-block-dot red"></span>
        <span class="code-block-dot yellow"></span>
        <span class="code-block-dot green"></span>
        <span class="code-block-language">${safeLanguage}</span>
      </div>
      <div class="code-block-actions">
        ${fullscreenBtn}
        ${copyBtn}
      </div>
    </div>
  `;
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      console.error('Failed to copy:', err);
      return false;
    }
  }
}

/**
 * 增强单个代码块
 */
export function enhanceCodeBlock(preElement: HTMLElement, options: ToolbarOptions = {}): CodeBlockInfo | null {
  // 避免重复增强
  if (preElement.dataset.enhanced === 'true') {
    return null;
  }

  const language = extractLanguage(preElement);

  // 跳过 mermaid 图表（由 astro-mermaid 处理）
  if (language === 'mermaid') {
    return null;
  }

  // 跳过 infographic 图表（由 infographic-enhancer 处理）
  // 检测方式：内容以 "infographic " 开头
  const code = extractCode(preElement);
  if (code.trim().startsWith('infographic ')) {
    return null;
  }
  const codeHTML = extractCodeHTML(preElement);
  const preClassName = extractPreClassName(preElement);
  const preStyle = extractPreStyle(preElement);
  const codeClassName = extractCodeClassName(preElement);

  // 创建 wrapper 容器
  const wrapper = document.createElement('div');
  wrapper.className = 'code-block-wrapper';

  // 将 pre 包裹到 wrapper 中
  preElement.parentNode?.insertBefore(wrapper, preElement);
  wrapper.appendChild(preElement);

  // 在 pre 之前插入工具栏（作为兄弟节点）
  preElement.insertAdjacentHTML('beforebegin', createToolbar(language, options));

  // 标记为已增强
  preElement.dataset.enhanced = 'true';
  preElement.dataset.language = language;

  return {
    element: preElement,
    language,
    code,
    codeHTML,
    preClassName,
    preStyle,
    codeClassName,
  };
}

export interface EnhanceOptions {
  onCopy?: (code: string) => void;
  onFullscreen?: (info: CodeBlockInfo) => void;
  enableCopy?: boolean;
  enableFullscreen?: boolean;
}

/**
 * 增强所有代码块
 */
export function enhanceAllCodeBlocks(container: Element, options: EnhanceOptions = {}): void {
  const { enableCopy = true, enableFullscreen = true } = options;
  const codeBlocks = container.querySelectorAll('pre');

  codeBlocks.forEach((pre) => {
    const preElement = pre as HTMLElement;
    const info = enhanceCodeBlock(preElement, { enableCopy, enableFullscreen });

    if (!info) return;

    // 绑定复制按钮（按钮在 wrapper 中，不在 pre 内部）
    if (enableCopy) {
      const copyBtn = preElement.parentElement?.querySelector('.code-block-copy');
      if (copyBtn) {
        // 保存原始 SVG
        const originalSvg = copyBtn.innerHTML;
        // 对勾 SVG（复制成功状态）
        const checkmarkSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <mask id="checkmark-anim-${Date.now()}">
              <g fill="none" stroke="#fff" stroke-dasharray="24" stroke-dashoffset="24" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                <path d="M2 13.5l4 4l10.75 -10.75">
                  <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="24;0"/>
                </path>
                <path stroke="#000" stroke-width="6" d="M7.5 13.5l4 4l10.75 -10.75">
                  <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="24;0"/>
                </path>
                <path d="M7.5 13.5l4 4l10.75 -10.75">
                  <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="24;0"/>
                </path>
              </g>
            </mask>
            <rect width="24" height="24" fill="currentColor" mask="url(#checkmark-anim-${Date.now()})"/>
          </svg>`;

        copyBtn.addEventListener('click', async () => {
          const success = await copyToClipboard(info.code);
          if (success) {
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = checkmarkSvg;
            options.onCopy?.(info.code);
            setTimeout(() => {
              copyBtn.classList.remove('copied');
              copyBtn.innerHTML = originalSvg;
            }, 2000);
          }
        });
      }
    }

    // 绑定全屏按钮（按钮在 wrapper 中，不在 pre 内部）
    if (enableFullscreen) {
      const fullscreenBtn = preElement.parentElement?.querySelector('.code-block-fullscreen');
      if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
          options.onFullscreen?.(info);
        });
      }
    }
  });
}

/**
 * Create code view icon SVG (< > brackets with slash)
 */
export function createCodeViewIcon(): string {
  return `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
      <path d="m7 8l-4 4l4 4m10-8l4 4l-4 4M14 4l-4 16"/>
    </svg>
  `;
}

/**
 * Create diagram view icon (bar chart icon)
 */
export function createDiagramViewIcon(): string {
  return `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 6a1 1 0 0 0-1 1v10a1 1 0 0 0 2 0V7a1 1 0 0 0-1-1m-5 6a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0v-4a1 1 0 0 0-1-1m10-2a1 1 0 0 0-1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0-1-1m2-8H5a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3m1 17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1Z"/>
    </svg>
  `;
}
