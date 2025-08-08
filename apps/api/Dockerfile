FROM oven/bun:1.0-alpine AS base

WORKDIR /app

# Install GraphicsMagick for PDF conversion
RUN apk add --no-cache graphicsmagick

# Copy package files
COPY package.json bun.lockb* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY apps/api/ ./apps/api/
COPY packages/shared/ ./packages/shared/

# Build the application
WORKDIR /app/apps/api
RUN bun run build

# Production stage
FROM oven/bun:1.0-alpine AS production

WORKDIR /app

# Install GraphicsMagick for PDF conversion in production
RUN apk add --no-cache graphicsmagick

# Copy built application
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/package.json ./

# Install production dependencies only
RUN bun install --production --frozen-lockfile

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bun -u 1001
USER bun

EXPOSE 3000

CMD ["bun", "run", "dist/index.js"]