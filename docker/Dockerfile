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

# Build-time arguments for sensitive configuration
ARG REMARK_URL
ARG REMARK_SITE_ID
ARG UMAMI_ID
ARG UMAMI_ENDPOINT

# Set environment variables for build
ENV REMARK_URL=${REMARK_URL}
ENV REMARK_SITE_ID=${REMARK_SITE_ID}
ENV UMAMI_ID=${UMAMI_ID}
ENV UMAMI_ENDPOINT=${UMAMI_ENDPOINT}

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
