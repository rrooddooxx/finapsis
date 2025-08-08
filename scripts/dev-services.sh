#!/bin/bash

# Development services management script for Financial Assistant

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Change to project root
cd "$PROJECT_ROOT"

case "${1:-help}" in
    "start"|"up")
        print_status "Starting Redis and Redis Commander for development..."
        docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d
        print_success "Development services started!"
        print_status "Redis available at: localhost:6379"
        print_status "Redis Commander (Web UI) available at: http://localhost:8081"
        print_status "  Username: dev"
        print_status "  Password: dev123"
        ;;
    
    "stop"|"down")
        print_status "Stopping development services..."
        docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml down
        print_success "Development services stopped!"
        ;;
    
    "restart")
        print_status "Restarting development services..."
        docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml restart
        print_success "Development services restarted!"
        ;;
    
    "logs")
        print_status "Showing logs from development services..."
        docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml logs -f
        ;;
    
    "status")
        print_status "Status of development services:"
        docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml ps
        ;;
    
    "cli")
        print_status "Starting Redis CLI container..."
        docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml --profile cli run --rm redis-cli
        ;;
    
    "clean")
        print_warning "This will remove all containers and volumes (data will be lost)!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Cleaning up development services..."
            docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml down -v --remove-orphans
            docker volume prune -f
            print_success "Development services cleaned!"
        else
            print_status "Cleanup cancelled."
        fi
        ;;
    
    "test-connection")
        print_status "Testing Redis connection..."
        if command -v redis-cli &> /dev/null; then
            redis-cli -h localhost -p 6379 ping
        else
            docker run --rm --network financial-assistant_financial_network redis:7.2-alpine redis-cli -h redis -p 6379 ping
        fi
        print_success "Redis connection test completed!"
        ;;
    
    "help"|*)
        echo "Financial Assistant - Development Services Manager"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start, up          Start Redis and Redis Commander"
        echo "  stop, down         Stop all services"
        echo "  restart            Restart all services"
        echo "  logs              Show service logs"
        echo "  status            Show service status"
        echo "  cli               Start Redis CLI container"
        echo "  clean             Stop and remove all containers/volumes"
        echo "  test-connection   Test Redis connection"
        echo "  help              Show this help message"
        echo ""
        echo "After starting services:"
        echo "  - Redis: localhost:6379"
        echo "  - Redis Commander: http://localhost:8081 (dev/dev123)"
        ;;
esac