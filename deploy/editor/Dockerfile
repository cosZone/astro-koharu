# syntax=docker/dockerfile:1
FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
COPY deploy/editor/package.json deploy/editor/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Keep the source layout for relative imports without including the blog, CMS, or their dependencies.
COPY src/features/editor/server/public-url.ts src/features/editor/server/og-service.ts src/features/editor/server/http.ts ./src/features/editor/server/
COPY src/lib/markdown/link-card-template.ts ./src/lib/markdown/
COPY scripts/editor-og.ts ./scripts/

ENV NODE_ENV=production \
    EDITOR_OG_HOST=0.0.0.0 \
    EDITOR_OG_PORT=4323 \
    TSX_DISABLE_CACHE=1

USER node
EXPOSE 4323
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4323/api/editor/og').then(r => { if (r.status !== 400) process.exit(1) }).catch(() => process.exit(1))"
CMD ["node", "--import", "tsx", "scripts/editor-og.ts"]
