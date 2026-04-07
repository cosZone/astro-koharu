# =============================================================================
# astro-koharu Dockerfile
# Multi-stage build for static site generation with nginx
# =============================================================================

# =============================================================================
# Stage 1: Builder
# Combines dependency installation and build in one stage to preserve pnpm
# symlink structure (copying node_modules between stages breaks symlinks)
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Copy package files first (for Docker layer caching)
COPY package.json pnpm-lock.yaml ./

# Install dependencies (include dev deps for build)
RUN pnpm install --frozen-lockfile --prod=false

# Copy source files
COPY . .

# Build the static site
RUN pnpm build

# =============================================================================
# Stage 2: Production (nginx)
# =============================================================================
FROM nginx:alpine AS production

# Copy nginx configuration
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
