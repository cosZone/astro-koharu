import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_LINK_METADATA_BYTES, readLinkMetadata } from './link-metadata';

function streamed(chunks: Uint8Array[], headers?: Record<string, string>) {
  let canceled = false;
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) controller.enqueue(chunks[index++]);
      else controller.close();
    },
    cancel() {
      canceled = true;
    },
  });
  return { response: new Response(stream, { headers }), canceled: () => canceled };
}

test('metadata handles UTF-8 split across network chunks before shape validation', async () => {
  const data = { title: '中文标题', html: '<p>链接</p>', error: false };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const split = streamed(Array.from(bytes, (byte) => new Uint8Array([byte])));
  assert.deepEqual(await readLinkMetadata(split.response), data);
});

test('oversized or misleading content length cancels the response before parsing', async () => {
  for (const headers of [undefined, { 'content-length': '1' }]) {
    const value = streamed([new Uint8Array(MAX_LINK_METADATA_BYTES), new Uint8Array(1), new Uint8Array(1)], headers);
    await assert.rejects(readLinkMetadata(value.response), /大小限制/);
    assert.equal(value.canceled(), true);
  }
  const early = streamed([new Uint8Array(1)], { 'content-length': String(MAX_LINK_METADATA_BYTES + 1) });
  await assert.rejects(readLinkMetadata(early.response), /大小限制/);
  assert.equal(early.canceled(), true);
});

test('invalid JSON and metadata types fail without reaching the HTML boundary', async () => {
  for (const source of ['{', 'null', '[]', '{"html":42}', '{"title":{}}', '{"error":[]}']) {
    await assert.rejects(readLinkMetadata(new Response(source)));
  }
});

test('a failed network stream exits instead of accepting partial JSON', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.error(new Error('network failed'));
    },
  });
  await assert.rejects(readLinkMetadata(new Response(stream)), /network failed/);
});
