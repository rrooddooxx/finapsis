#!/usr/bin/env bun
/**
 * BullMQ Worker Entry Point
 * 
 * This file can be run independently to start background workers:
 * bun src/workers/index.ts
 * 
 * Or it can be started automatically when AUTO_START_DOCUMENT_WORKER=true
 */

import { devLogger } from '../utils/logger.utils';
import { documentProcessingWorker } from './document-processing.worker';
import { streamingConsumerService } from '../features/assistant-financial-documents/streaming-consumer.service';
import '../shared/envs.shared'; // For Bun.env typing

class WorkerManager {
  private isRunning = false;

  async start() {
    if (this.isRunning) {
      devLogger('Worker Manager', '⚠️ Workers are already running');
      return;
    }

    this.isRunning = true;
    devLogger('Worker Manager', '🚀 Starting BullMQ workers and OCI streaming consumer...');

    try {
      // Start OCI streaming consumer if enabled
      const shouldStartStreaming = Bun.env.AUTO_START_DOCUMENT_WORKER === 'true';
      
      if (shouldStartStreaming) {
        devLogger('Worker Manager', '📡 Starting OCI streaming consumer...');
        // Start streaming consumer in the background (non-blocking)
        streamingConsumerService.startConsumer().catch((error) => {
          devLogger('Worker Manager', `❌ Streaming consumer error: ${error.message}`);
        });
        devLogger('Worker Manager', '✅ OCI streaming consumer started');
      } else {
        devLogger('Worker Manager', '⏭️ Document worker auto-start disabled (AUTO_START_DOCUMENT_WORKER=false)');
      }

      // BullMQ workers are already started in their constructor
      devLogger('Worker Manager', '✅ BullMQ document processing workers are running');

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      devLogger('Worker Manager', '🎯 All workers are running. Ready to process document jobs!');

    } catch (error) {
      devLogger('Worker Manager', `❌ Failed to start workers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    devLogger('Worker Manager', '🛑 Stopping workers...');
    this.isRunning = false;

    try {
      // Stop streaming consumer
      await streamingConsumerService.stop();
      
      // Stop BullMQ workers
      await documentProcessingWorker.shutdown();
      
      devLogger('Worker Manager', '✅ All workers stopped gracefully');
    } catch (error) {
      devLogger('Worker Manager', `❌ Error during worker shutdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private setupGracefulShutdown() {
    const gracefulShutdown = async (signal: string) => {
      devLogger('Worker Manager', `🔄 Received ${signal}, shutting down gracefully...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      autoStartEnabled: Bun.env.AUTO_START_DOCUMENT_WORKER === 'true',
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton worker manager
export const workerManager = new WorkerManager();

// Auto-start if this file is run directly
// Note: Bun supports import.meta.main, but TypeScript may complain
// This will work at runtime with Bun
const isMainModule = typeof process !== 'undefined' && process.argv[1]?.includes('workers/index.ts');

if (isMainModule) {
  devLogger('Worker Manager', '🔧 Worker process started directly');
  
  workerManager.start().catch((error) => {
    console.error('Failed to start workers:', error);
    process.exit(1);
  });

  // Keep the process alive
  setInterval(() => {
    // Health check log every 5 minutes
  }, 5 * 60 * 1000);
}