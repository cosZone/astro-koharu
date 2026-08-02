import sanitizeHtml from 'sanitize-html';

const INVALID_XML_CHARACTERS =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional - filtering invalid XML characters
  /[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD\u{10000}-\u{10FFFF}]/gu;

const cleanInvalidXmlCharacters = (text: string) => text.replace(INVALID_XML_CHARACTERS, '');

export const getSanitizeHtml = (html: string) => {
  return sanitizeHtml(html, {
    // https://stackoverflow.com/questions/12229572/php-generated-xml-shows-invalid-char-value-27-message
    textFilter: cleanInvalidXmlCharacters,
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  });
};

const KOHARU_CONTENT_TAGS = ['a', 'blockquote', 'code', 'em', 'pre', 's', 'spoiler-span', 'strong', 'u'] as const;

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

const KOHARU_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tg:']);

function safeKoharuHref(value?: string): string | undefined {
  if (!value || value.trim() !== value) return undefined;
  const href = value;
  for (const character of href) {
    const code = character.charCodeAt(0);
    if (code <= 31 || code === 127) return undefined;
  }
  try {
    const url = new URL(href);
    if (!KOHARU_LINK_PROTOCOLS.has(url.protocol)) return undefined;
    if ((url.protocol === 'http:' || url.protocol === 'https:') && (url.username || url.password)) return undefined;
    return href;
  } catch {
    return undefined;
  }
}

interface SanitizeKoharuContentOptions {
  interactiveSpoilers?: boolean;
}

/**
 * Normalize Koharu Suite rich text for rendering in Moments and RSS.
 *
 * Suite HTML is external input even when it comes from a configured instance,
 * so only Telegram formatting emitted by the public API is retained. Telegram
 * spoilers are adapted to the same web component used by Shoka markdown
 * content. Newline text nodes remain unchanged so the Moments renderer can
 * preserve them without corrupting block structure.
 */
export function sanitizeKoharuContentHtml(
  html?: string | null,
  plainText?: string | null,
  options: SanitizeKoharuContentOptions = {},
): string {
  const richHtml = html?.trim() ? html : undefined;
  const source = richHtml ?? (plainText ? escapeHtml(plainText) : '');
  if (!source) return '';

  const normalizedSource = source.replace(/\r\n?/g, '\n');
  const interactiveSpoilers = options.interactiveSpoilers ?? true;
  return sanitizeHtml(normalizedSource, {
    allowedTags: [...KOHARU_CONTENT_TAGS],
    allowedAttributes: {
      a: ['href', 'rel'],
      blockquote: ['class'],
      code: ['class'],
    },
    allowedClasses: {
      blockquote: ['tg-expandable-blockquote'],
      code: [/^language-[A-Za-z0-9_+-]{1,64}$/],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tg'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
    transformTags: {
      a: (_tagName, attributes) => {
        const href = safeKoharuHref(attributes.href);
        const attribs: Record<string, string> = {};
        if (href) {
          attribs.href = href;
          attribs.rel = 'nofollow noopener noreferrer';
        }
        return {
          tagName: 'a',
          attribs,
        };
      },
      span: (_tagName, attributes) => {
        return attributes.class === 'tg-spoiler'
          ? { tagName: interactiveSpoilers ? 'spoiler-span' : 'span', attribs: {} }
          : { tagName: 'span', attribs: {} };
      },
      'spoiler-span': () => ({ tagName: 'span', attribs: {} }),
    },
    exclusiveFilter: (frame) => (frame.tag === 'a' && !frame.attribs.href ? 'excludeTag' : false),
    textFilter: cleanInvalidXmlCharacters,
  });
}

/** Use a visible, non-interactive spoiler fallback in feed readers. */
export function sanitizeKoharuRssContentHtml(html?: string | null, plainText?: string | null): string {
  return sanitizeKoharuContentHtml(html, plainText, { interactiveSpoilers: false });
}

/**
 * Strip all HTML tags and return plain text, truncated to maxLength.
 * Used by RSS feeds to generate <description> from rendered HTML.
 */
export function stripHtmlToText(html: string, maxLength: number = 150): string {
  const text = sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: cleanInvalidXmlCharacters,
  });
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '');
}

/**
 * 从Markdown内容中提取纯文本，用于生成OG描述
 * @param content Markdown内容字符串
 * @param maxLength 最大长度，默认150字符
 * @returns 提取的纯文本
 */
export const extractTextFromMarkdown = (content: string, maxLength: number = 150): string => {
  if (!content) return '';

  let idx = 0;
  const len = content.length;

  // 跳过YAML front matter (避免startsWith和多次indexOf)
  if (content.charCodeAt(0) === 45 && content.charCodeAt(1) === 45 && content.charCodeAt(2) === 45) {
    // '---'
    idx = 4; // 跳过第一个 '---\n'
    // 查找结束的 '---'
    while (idx < len - 3) {
      if (
        content.charCodeAt(idx) === 10 && // '\n'
        content.charCodeAt(idx + 1) === 45 && // '-'
        content.charCodeAt(idx + 2) === 45 && // '-'
        content.charCodeAt(idx + 3) === 45
      ) {
        // '-'
        idx += 4;
        break;
      }
      idx++;
    }
  }

  // 提前计算搜索边界 (避免处理整个文档)
  const searchEnd = Math.min(idx + maxLength * 5, len);

  let result = '';
  let resultLen = 0;
  const targetLen = maxLength + 50;

  let lineStart = idx;
  let inCodeBlock = false;
  let containerDepth = 0;

  // 逐字符扫描 (避免split产生数组)
  while (idx < searchEnd && resultLen < targetLen) {
    const char = content.charCodeAt(idx);

    // 检测换行
    if (char === 10) {
      // '\n'
      if (idx > lineStart) {
        const line = content.slice(lineStart, idx).trim();

        if (line.length > 0) {
          // 检测代码块开关 (避免startsWith)
          if (line.charCodeAt(0) === 96 && line.charCodeAt(1) === 96 && line.charCodeAt(2) === 96) {
            // '```'
            inCodeBlock = !inCodeBlock;
          } else if (!inCodeBlock) {
            const firstChar = line.charCodeAt(0);
            // 检测 ::: 容器块边界 (encrypted, info, warning 等)
            if (firstChar === 58 && line.charCodeAt(1) === 58 && line.charCodeAt(2) === 58) {
              if (line.length > 3) containerDepth++;
              else if (containerDepth > 0) containerDepth--;
            } else if (containerDepth === 0) {
              // 跳过表格行 '|' 和单冒号 ':' 行
              if (firstChar !== 124 && firstChar !== 58) {
                const processed = processLine(line);
                if (processed.length >= 3) {
                  if (resultLen > 0) result += ' ';
                  result += processed;
                  resultLen += processed.length + 1;
                }
              }
            }
          }
        }
      }
      lineStart = idx + 1;
    }
    idx++;
  }

  // 处理最后一行
  if (lineStart < searchEnd && resultLen < targetLen && !inCodeBlock && containerDepth === 0) {
    const line = content.slice(lineStart, Math.min(lineStart + 200, searchEnd)).trim();
    if (line.length >= 3) {
      const processed = processLine(line);
      if (processed.length >= 3) {
        if (resultLen > 0) result += ' ';
        result += processed;
      }
    }
  }

  // 智能截断 (避免lastIndexOf)
  if (result.length > maxLength) {
    let cutIdx = maxLength;
    const minCut = Math.floor(maxLength * 0.8);
    // 向前找空格
    while (cutIdx > minCut && result.charCodeAt(cutIdx) !== 32) cutIdx--;
    result = `${result.slice(0, cutIdx)}...`;
  }

  return result;
};

/**
 * 处理单行markdown文本
 */
function processLine(line: string): string {
  let start = 0;
  const len = line.length;

  // 跳过行首标记
  const firstChar = line.charCodeAt(0);

  // '#' 标题
  if (firstChar === 35) {
    while (start < len && line.charCodeAt(start) === 35) start++;
    while (start < len && line.charCodeAt(start) === 32) start++; // 空格
  }
  // '- * +' 列表
  else if (firstChar === 45 || firstChar === 42 || firstChar === 43) {
    start = 1;
    while (start < len && line.charCodeAt(start) === 32) start++;
  }
  // '>' 引用
  else if (firstChar === 62) {
    start = 1;
    while (start < len && line.charCodeAt(start) === 32) start++;
  }
  // 数字列表 '1. 2. '
  else if (firstChar >= 48 && firstChar <= 57) {
    while (start < len && line.charCodeAt(start) >= 48 && line.charCodeAt(start) <= 57) start++;
    if (start < len && line.charCodeAt(start) === 46) start++; // '.'
    while (start < len && line.charCodeAt(start) === 32) start++;
  }

  if (start > 0) line = line.slice(start);

  // 只在需要时才使用正则 - 使用indexOf避免全文扫描
  let hasSpecialChars = false;
  for (let i = 0; i < line.length; i++) {
    const code = line.charCodeAt(i);
    // 检查 [ ` * _ ~ <
    if (code === 91 || code === 96 || code === 42 || code === 95 || code === 126 || code === 60) {
      hasSpecialChars = true;
      break;
    }
  }

  if (hasSpecialChars) {
    // 移除链接/图片 ![text](url) 或 [text](url)
    if (line.indexOf('[') >= 0) {
      line = line.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');
    }

    // 移除内联代码 `code`
    if (line.indexOf('`') >= 0) {
      line = line.replace(/`[^`]*`/g, '');
    }

    // 移除格式化 **bold** *italic* __bold__ _italic_
    if (line.indexOf('*') >= 0 || line.indexOf('_') >= 0) {
      line = line.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1');
    }

    // 移除HTML <tag>
    if (line.indexOf('<') >= 0) {
      line = line.replace(/<[^>]*>/g, '');
    }
  }

  return line.trim();
}
