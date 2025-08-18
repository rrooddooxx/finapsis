# syntax=docker.io/docker/dockerfile:1

# Build stage - using Bun for faster builds
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package.json only
COPY package.json ./

# Install fresh dependencies (no lockfile)
RUN bun install

# Copy source code
COPY . .

# Build the Vite application
RUN bun run build

# Production stage - Nginx
FROM nginx:alpine AS production

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create startup script for environment variable substitution
COPY <<EOF /docker-entrypoint.d/10-substitute-env.sh
#!/bin/sh
set -eu

# Replace environment variables in config.js
envsubst '\$VITE_BACKEND_API_URL' < /usr/share/nginx/html/config.js > /tmp/config.js
mv /tmp/config.js /usr/share/nginx/html/config.js

echo "Environment variables substituted in config.js"
EOF

RUN chmod +x /docker-entrypoint.d/10-substitute-env.sh

# Copy custom nginx configuration
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    listen [::]:80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Handle client-side routing (SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache HTML files
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Expose port 80
EXPOSE 80

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]