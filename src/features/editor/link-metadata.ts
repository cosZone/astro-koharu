export interface PreviewMetadataResponse {
  html?: string;
  title?: string;
  description?: string;
  image?: string;
  error?: boolean | string;
}

export const MAX_LINK_METADATA_BYTES = 256 * 1024;

/** Public instances are untrusted: bound decoded bytes before JSON/HTML reaches the main thread. */
export async function readLinkMetadata(response: Response): Promise<PreviewMetadataResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('链接实例未提供响应正文');
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    if (Number(response.headers.get('content-length')) > MAX_LINK_METADATA_BYTES) throw new Error('链接信息超过大小限制');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_LINK_METADATA_BYTES) throw new Error('链接信息超过大小限制');
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const result: unknown = JSON.parse(text);
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('链接实例返回的格式有误');
  const data = result as Record<string, unknown>;
  for (const field of ['html', 'title', 'description', 'image']) {
    if (data[field] !== undefined && typeof data[field] !== 'string') throw new Error('链接实例返回的格式有误');
  }
  if (data.error !== undefined && typeof data.error !== 'boolean' && typeof data.error !== 'string')
    throw new Error('链接实例返回的格式有误');
  return data as PreviewMetadataResponse;
}
