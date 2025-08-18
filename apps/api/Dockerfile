FROM oven/bun:alpine AS production

WORKDIR /app

# Install system dependencies
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

# Copy source code
COPY . ./apps/api/
COPY ./package.json ./

# Install fresh dependencies (no lock file)
RUN bun install --no-save

# Build the application
WORKDIR /app/apps/api
RUN bun run build

# Back to app root for final setup
WORKDIR /app

# OCI configuration will be mounted from host ~/.oci directory

# Copy .env file for fallback configuration
COPY .env .env

# Create startup script with comprehensive logging
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "===========================================" ' >> /app/start.sh && \
    echo 'echo "🏦 FINAPSIS API - CONTAINER STARTUP" ' >> /app/start.sh && \
    echo 'echo "===========================================" ' >> /app/start.sh && \
    echo 'echo "📦 Container Image: finapsis-api" ' >> /app/start.sh && \
    echo 'echo "🐳 Platform: $(uname -m)" ' >> /app/start.sh && \
    echo 'echo "📅 Started at: $(date)" ' >> /app/start.sh && \
    echo 'echo "📂 Working directory: $(pwd)" ' >> /app/start.sh && \
    echo 'echo "" ' >> /app/start.sh && \
    echo 'echo "🔧 CONFIGURATION SETUP:" ' >> /app/start.sh && \
    echo '# OCI configuration mounted from host ~/.oci directory' >> /app/start.sh && \
    echo 'echo "✅ OCI configuration mounted from host (config + key via volumes)"' >> /app/start.sh && \
    echo 'echo "" ' >> /app/start.sh && \
    echo 'echo "🔑 ENVIRONMENT STATUS:" ' >> /app/start.sh && \
    echo 'echo "OCI_PRIVATE_KEY_PATH: $OCI_PRIVATE_KEY_PATH" ' >> /app/start.sh && \
    echo 'echo "OCI_REGION: ${OCI_REGION:-not-set}" ' >> /app/start.sh && \
    echo 'echo "OCI_TENANCY_ID: ${OCI_TENANCY_ID:0:20}..." ' >> /app/start.sh && \
    echo 'echo "DATABASE_URL: ${DATABASE_URL:0:30}..." ' >> /app/start.sh && \
    echo 'echo "REDIS_HOST: ${REDIS_HOST:-localhost}" ' >> /app/start.sh && \
    echo 'echo "" ' >> /app/start.sh && \
    echo 'echo "🔍 FILE SYSTEM CHECK:" ' >> /app/start.sh && \
    echo 'if [ -f "/root/.oci/config" ]; then echo "✅ /root/.oci/config exists (mounted)"; else echo "❌ /root/.oci/config missing (check host ~/.oci mount)"; fi' >> /app/start.sh && \
    echo 'if [ -f "$OCI_PRIVATE_KEY_PATH" ]; then echo "✅ OCI private key exists at $OCI_PRIVATE_KEY_PATH"; else echo "❌ OCI private key missing at $OCI_PRIVATE_KEY_PATH"; fi' >> /app/start.sh && \
    echo 'if [ -f "./apps/api/dist/index.js" ]; then echo "✅ ./apps/api/dist/index.js exists"; else echo "❌ ./apps/api/dist/index.js missing"; fi' >> /app/start.sh && \
    echo 'echo "" ' >> /app/start.sh && \
    echo 'echo "🚀 STARTING APPLICATION..." ' >> /app/start.sh && \
    echo 'echo "===========================================" ' >> /app/start.sh && \
    echo 'exec bun run apps/api/dist/index.js' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 3000

# Use the startup script
CMD ["/app/start.sh"]