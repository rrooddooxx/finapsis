import { devLogger } from "../../utils/logger.utils";

interface PendingConfirmation {
  processingLogId: string;
  userId: string;
  transactionData: any;
  timestamp: Date;
  expiresAt: Date;
}

/**
 * In-memory store for tracking pending transaction confirmations
 * In a production environment, this could be stored in Redis or database
 */
class PendingConfirmationsStore {
  private confirmations = new Map<string, PendingConfirmation>();

  /**
   * Add a pending confirmation for a user
   */
  addPendingConfirmation(userId: string, processingLogId: string, transactionData: any): void {
    const key = userId;
    const confirmation: PendingConfirmation = {
      processingLogId,
      userId,
      transactionData,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    this.confirmations.set(key, confirmation);
    devLogger('PendingConfirmationsStore', `📝 Added pending confirmation for user ${userId}, processing log: ${processingLogId}`);
  }

  /**
   * Get and remove the most recent pending confirmation for a user
   */
  getPendingConfirmation(userId: string): PendingConfirmation | null {
    const key = userId;
    const confirmation = this.confirmations.get(key);

    if (!confirmation) {
      devLogger('PendingConfirmationsStore', `❌ No pending confirmation found for user ${userId}`);
      return null;
    }

    // Check if confirmation has expired
    if (confirmation.expiresAt < new Date()) {
      this.confirmations.delete(key);
      devLogger('PendingConfirmationsStore', `⏰ Confirmation expired for user ${userId}, removing`);
      return null;
    }

    // Remove from store after retrieving (one-time use)
    this.confirmations.delete(key);
    devLogger('PendingConfirmationsStore', `✅ Retrieved pending confirmation for user ${userId}, processing log: ${confirmation.processingLogId}`);
    
    return confirmation;
  }

  /**
   * Check if a user has any pending confirmations
   */
  hasPendingConfirmation(userId: string): boolean {
    const confirmation = this.confirmations.get(userId);
    if (!confirmation) return false;

    // Check if expired
    if (confirmation.expiresAt < new Date()) {
      this.confirmations.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Clean up expired confirmations
   */
  cleanupExpired(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, confirmation] of this.confirmations.entries()) {
      if (confirmation.expiresAt < now) {
        this.confirmations.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      devLogger('PendingConfirmationsStore', `🧹 Cleaned up ${cleanedCount} expired confirmations`);
    }
  }

  /**
   * Get stats about pending confirmations
   */
  getStats(): { total: number, expired: number } {
    const now = new Date();
    let expired = 0;

    for (const confirmation of this.confirmations.values()) {
      if (confirmation.expiresAt < now) {
        expired++;
      }
    }

    return {
      total: this.confirmations.size,
      expired
    };
  }
}

export const pendingConfirmationsStore = new PendingConfirmationsStore();

// Auto-cleanup expired confirmations every 30 minutes
setInterval(() => {
  pendingConfirmationsStore.cleanupExpired();
}, 30 * 60 * 1000);