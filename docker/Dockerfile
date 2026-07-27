# =============================================================================
# astro-koharu Dockerfile
# Multi-stage build with static nginx (default) and optional Astro Node targets
# =============================================================================

# =============================================================================
# Stage 1: Builder
# Combines dependency installation and build in one stage to preserve pnpm
# symlink structure (copying node_modules between stages breaks symlinks)
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Only dynamic builds provide this value. Static builds keep it empty and do not
# need a running koharu-suite instance.
ARG KOHARU_SUITE_URL
ENV KOHARU_SUITE_URL=${KOHARU_SUITE_URL}

# Install the pnpm version used to generate the lockfile
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Copy dependency metadata first (for Docker layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies (include dev deps for build)
RUN pnpm install --frozen-lockfile --prod=false

# Copy source files
COPY . .

# Build the static site
RUN pnpm build

# =============================================================================
# Stage 2a: Dynamic production (Astro Node standalone)
# =============================================================================
FROM node:22-alpine AS dynamic
WORKDIR /app

ENV HOST=0.0.0.0 \
    PORT=4321 \
    NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Runtime dependencies only. Ignore the repository's developer-only `prepare`
# hook (Husky is intentionally absent from this production stage).
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter astro-koharu

COPY --from=builder /app/dist/client ./dist/client
COPY --from=builder /app/dist/server ./dist/server

EXPOSE 4321

# The static homepage is the process liveness probe. A temporary suite outage
# must not restart an otherwise healthy blog process.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4321/ || exit 1

USER node

CMD ["node", "dist/server/entry.mjs"]

# =============================================================================
# Stage 2b: Static production (nginx)
# =============================================================================
FROM nginx:alpine AS static

# Copy nginx configuration
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Keep the historical target name and the default (last) image unchanged.
FROM static AS production
