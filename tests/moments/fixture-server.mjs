import http from 'node:http';

const port = Number(process.env.FIXTURE_PORT ?? 4178);
const channel = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Fixture Daily',
  username: 'daily',
};
const message = {
  id: '018f3f7a-2b1c-7def-8abc-1234567890ab',
  channel,
  content: {
    kind: 'text',
    text: 'Fixture hello from Koharu Suite',
    html: '<p>Fixture hello from <strong>Koharu Suite</strong></p>',
    entities: [],
  },
  media: [
    {
      id: '018f3f7a-2b1c-7def-8abc-1234567890ac',
      kind: 'photo',
      cacheStatus: 'ready',
      duration: null,
      fileName: 'fixture.jpg',
      fileSize: '1024',
      height: 640,
      mimeType: 'image/jpeg',
      originalUrl: '/api/v1/media/018f3f7a-2b1c-7def-8abc-1234567890ac',
      thumbnailUrl: '/api/v1/media/018f3f7a-2b1c-7def-8abc-1234567890af',
      width: 960,
    },
    {
      id: '018f3f7a-2b1c-7def-8abc-1234567890ad',
      kind: 'video',
      cacheStatus: 'pending',
      duration: 8,
      fileName: 'pending.mp4',
      fileSize: '2048',
      height: 720,
      mimeType: 'video/mp4',
      originalUrl: null,
      thumbnailUrl: null,
      width: 1280,
    },
    {
      id: '018f3f7a-2b1c-7def-8abc-1234567890ae',
      kind: 'document',
      cacheStatus: 'unavailable',
      duration: null,
      fileName: 'unavailable.pdf',
      fileSize: '4096',
      height: null,
      mimeType: 'application/pdf',
      originalUrl: null,
      thumbnailUrl: null,
      width: null,
    },
  ],
  mediaGroupId: null,
  authorSignature: 'Fixture Bot',
  publishedAt: '2026-07-25T12:00:00.000Z',
  revision: 2,
  sourceUrl: 'https://t.me/daily/1',
};
const albumMessages = [
  message,
  {
    ...message,
    id: '018f3f7a-2b1c-7def-8abc-1234567890b2',
    content: { kind: 'none', text: null, html: null, entities: [] },
    media: [
      {
        ...message.media[2],
        id: '018f3f7a-2b1c-7def-8abc-1234567890b4',
        fileName: 'second-unavailable.jpg',
        mimeType: 'image/jpeg',
        kind: 'photo',
      },
    ],
    authorSignature: null,
    revision: 1,
    sourceUrl: 'https://t.me/daily/2',
  },
  {
    ...message,
    id: '018f3f7a-2b1c-7def-8abc-1234567890b3',
    content: { kind: 'none', text: null, html: null, entities: [] },
    media: [
      {
        ...message.media[2],
        id: '018f3f7a-2b1c-7def-8abc-1234567890b5',
        fileName: 'third-unavailable.jpg',
        mimeType: 'image/jpeg',
        kind: 'photo',
      },
    ],
    authorSignature: null,
    revision: 1,
    sourceUrl: 'https://t.me/daily/3',
  },
];
const unrelatedMessage = {
  ...message,
  id: '018f3f7a-2b1c-7def-8abc-1234567890b6',
  content: { kind: 'text', text: 'Older fixture message', html: '<p>Older fixture message</p>', entities: [] },
  media: [],
  mediaGroupId: null,
  publishedAt: '2026-07-25T11:59:00.000Z',
  revision: 1,
  sourceUrl: 'https://t.me/daily/0',
};
const mismatchMessageId = '018f3f7a-2b1c-7def-8abc-1234567890b0';

function send(response, status, body, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  response.end(JSON.stringify(body));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  if (url.pathname === '/api/v1/channels') return send(response, 200, { items: [channel] });

  if (url.searchParams.get('cursor') === 'rate-limit') {
    return send(response, 429, { error: { code: 'rate_limited', message: 'synthetic limit' } }, { 'Retry-After': '7' });
  }
  if (url.searchParams.get('cursor') === 'invalid') return send(response, 200, { unexpected: true });

  if (url.pathname === '/api/v1/messages') {
    return send(response, 200, { items: [...albumMessages, unrelatedMessage], nextCursor: 'older-page' });
  }
  if (url.pathname === '/api/v1/messages/latest') return send(response, 200, { items: albumMessages, nextCursor: null });
  if (url.pathname === '/api/v1/search/messages') {
    return send(response, 200, {
      items: [{ match: { score: 1, snippet: 'Fixture hello' }, message }],
      mode: 'trigram',
      nextCursor: null,
    });
  }
  if (url.pathname === `/api/v1/messages/${message.id}/context`) {
    return send(response, 200, { message, newer: null, older: null });
  }
  if (url.pathname === `/api/v1/messages/${mismatchMessageId}/context`) {
    return send(response, 200, {
      message: {
        ...message,
        id: mismatchMessageId,
        channel: { ...channel, id: '018f3f7a-2b1c-7def-8abc-1234567890b1' },
      },
      newer: null,
      older: null,
    });
  }
  if (url.pathname === `/api/v1/messages/${message.id}`) return send(response, 200, message);

  return send(response, 404, { error: { code: 'not_found', message: 'synthetic not found' } });
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`fixture listening on ${port}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
