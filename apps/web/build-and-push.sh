#!/bin/bash

# Build and push script for the web application
# This script builds the Docker image for linux/amd64 platform and pushes to Docker Hub

set -e  # Exit immediately if a command exits with a non-zero status

# Configuration
DOCKERHUB_USERNAME=${DOCKERHUB_USERNAME:-"your-dockerhub-username"}
IMAGE_NAME="finapsis-web"
TAG=${TAG:-"latest"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Building and pushing $IMAGE_NAME:$TAG...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if DOCKERHUB_USERNAME is set
if [ "$DOCKERHUB_USERNAME" = "your-dockerhub-username" ]; then
    echo -e "${RED}❌ Please set DOCKERHUB_USERNAME environment variable or update the script${NC}"
    echo "Usage: DOCKERHUB_USERNAME=yourusername ./build-and-push.sh"
    exit 1
fi

# Navigate to project root (two levels up from apps/web)
cd "$(dirname "$0")/../.."

echo -e "${YELLOW}📦 Building Docker image for linux/amd64 platform...${NC}"

# Build the image using buildx for cross-platform support
docker buildx build \
    --platform linux/amd64 \
    --file ./apps/web/Dockerfile \
    --tag "${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}" \
    --tag "${DOCKERHUB_USERNAME}/${IMAGE_NAME}:$(git rev-parse --short HEAD)" \
    --load \
    .

echo -e "${GREEN}✅ Image built successfully!${NC}"

# Ask for confirmation before pushing
read -p "Do you want to push the image to Docker Hub? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🔄 Pushing image to Docker Hub...${NC}"
    
    # Push both tags
    docker push "${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}"
    docker push "${DOCKERHUB_USERNAME}/${IMAGE_NAME}:$(git rev-parse --short HEAD)"
    
    echo -e "${GREEN}✅ Image pushed successfully!${NC}"
    echo -e "${GREEN}🎉 Image available at: ${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping push to Docker Hub${NC}"
fi

# Clean up local images (optional)
read -p "Do you want to clean up local build images? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 Cleaning up local images...${NC}"
    docker image prune -f
    echo -e "${GREEN}✅ Cleanup completed!${NC}"
fi

echo -e "${GREEN}🎯 Build process completed!${NC}"