FROM oven/bun:alpine AS base

WORKDIR /app

# Install PDF conversion and system dependencies
RUN apk add --no-cache \
    graphicsmagick \
    ghostscript \
    poppler-utils \
    imagemagick \
    cairo-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    python3 \
    make \
    g++

# Copy package files
COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN bun install

# Copy source code
COPY apps/api/ ./apps/api/
COPY packages/shared/ ./packages/shared/

# Build the application
WORKDIR /app/apps/api
RUN bun run build

# Development stage
FROM base AS development
WORKDIR /app

# Create .oci directory for OCI configuration
RUN mkdir -p /app/.oci && chmod 700 /app/.oci

# Copy built application and source code
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api ./apps/api
COPY --from=base /app/packages/shared ./packages/shared
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

EXPOSE 3000

CMD ["bun", "run", "dist/index.js"]

# Production stage
FROM oven/bun:alpine AS production

WORKDIR /app

# Install PDF conversion and system dependencies in production
RUN apk add --no-cache \
    graphicsmagick \
    ghostscript \
    poppler-utils \
    imagemagick \
    cairo-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    python3 \
    make \
    g++

# Create .oci directory for OCI configuration
RUN mkdir -p /app/.oci && chmod 700 /app/.oci

# Copy built application
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/package.json ./

# Install production dependencies only
RUN bun install --production


EXPOSE 3000

CMD ["bun", "run", "dist/index.js"]