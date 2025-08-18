# Finapsis API - Docker Deployment Guide

## Building and Pushing to Docker Hub

### 1. Build the Docker Image

```bash
# Build for multiple architectures (recommended for Oracle Cloud ARM instances)
docker buildx build --platform linux/amd64,linux/arm64 \
  --target production \
  -t your-dockerhub-username/finapsis-api:latest \
  -f apps/api/Dockerfile \
  --push .

# Or build for specific architecture only
docker buildx build --platform linux/amd64 \
  --target production \
  -t your-dockerhub-username/finapsis-api:latest \
  -f apps/api/Dockerfile \
  --push .
```

## Oracle Cloud VM Deployment

### 2. Prepare OCI Configuration on VM

First, create the OCI configuration directory on your VM:

```bash
# On your Oracle Cloud VM
sudo mkdir -p /opt/finapsis/oci-config
sudo chmod 700 /opt/finapsis/oci-config
```

Copy your OCI configuration files to the VM:

```bash
# From your local machine, copy the OCI config
scp ~/.oci/config your-vm-user@your-vm-ip:/opt/finapsis/oci-config/config
scp ~/.oci/oci_api_key.pem your-vm-user@your-vm-ip:/opt/finapsis/oci-config/oci_api_key.pem

# Set proper permissions on VM
sudo chmod 600 /opt/finapsis/oci-config/config
sudo chmod 600 /opt/finapsis/oci-config/oci_api_key.pem
```

### 3. Set Environment Variables on VM

Create environment variables file on the VM (these will take precedence over the .env file):

```bash
# On your VM, create the environment file
sudo tee /opt/finapsis/.env.production <<EOF
# Override any .env values here - these take precedence
REDIS_HOST=your-redis-host
DATABASE_URL=your-production-database-url

# OCI Configuration (optional - will use mounted config files if not set)
OCI_TENANCY_ID=ocid1.tenancy.oc1..aaaaaaaaxokk2gewz5xryccusugcdzidxvzooqgtuhswio5lrpk2uqnvsvhq
OCI_USER_ID=ocid1.user.oc1..aaaaaaaak77vwm3433ibncl5whc3xblqnpwyqakpoie7sxovkc42u7md6dyq
OCI_FINGERPRINT=d9:88:dd:76:e1:53:e1:a3:d0:cd:9a:a6:b0:ab:c9:00
OCI_REGION=us-phoenix-1
OCI_COMPARTMENT_ID=ocid1.tenancy.oc1..aaaaaaaaxokk2gewz5xryccusugcdzidxvzooqgtuhswio5lrpk2uqnvsvhq
OCI_NAMESPACE=axjq1e002pwz
OCI_DOCUMENTS_BUCKET_NAME=bucket-20250805-2220

# The private key path will be set automatically by the container
EOF
```

### 4. Run the Container

```bash
# Run the container with mounted OCI config and environment variables
docker run -d \
  --name finapsis-api \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /opt/finapsis/oci-config:/oci-config:ro \
  --env-file /opt/finapsis/.env.production \
  your-dockerhub-username/finapsis-api:latest
```

### 5. Check Deployment

```bash
# Check container logs
docker logs finapsis-api

# Check container status
docker ps

# Test the API
curl http://localhost:3000/health
```

## How Environment Variables Work

### Precedence Order (highest to lowest):
1. **VM Shell Environment Variables** (set via `--env-file` or `-e` flags)
2. **Container .env file** (copied during build from `apps/api/.env`)

### OCI Authentication Flow:
1. Container startup script checks for mounted OCI config files
2. If found, copies them to `/root/.oci/` with proper permissions
3. Sets `OCI_PRIVATE_KEY_PATH=/root/.oci/oci_api_key.pem`
4. OCI SDK first tries environment variables, then falls back to config file

## Docker Compose Alternative

If you prefer using docker-compose on the VM:

```yaml
# /opt/finapsis/docker-compose.yml
version: '3.8'

services:
  finapsis-api:
    image: your-dockerhub-username/finapsis-api:latest
    container_name: finapsis-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /opt/finapsis/oci-config:/oci-config:ro
    env_file:
      - /opt/finapsis/.env.production
```

Then run with:
```bash
cd /opt/finapsis
docker-compose up -d
```

## Security Notes

- OCI config files are mounted read-only (`ro`) for security
- Container uses proper file permissions (600) for OCI files
- Environment variables in the VM take precedence over built-in .env file
- Private keys are never exposed in Docker layers (mounted at runtime)

## Troubleshooting

### Check OCI Configuration
```bash
docker exec finapsis-api ls -la /root/.oci/
docker exec finapsis-api cat /root/.oci/config
```

### Check Environment Variables
```bash
docker exec finapsis-api env | grep OCI_
```

### View Application Logs
```bash
docker logs -f finapsis-api
```