// Redis storage for payment metadata
// Uses Redis for persistent key-value storage

import { createClient } from 'redis';
import type { StoredPaymentMetadata } from './types.js';

class PaymentMetadataStorage {
  // Key prefixes for organization
  private readonly PAYMENT_PREFIX = 'payment:';
  private readonly RSS_INDEX_PREFIX = 'rss-index:';
  private client: ReturnType<typeof createClient> | null = null;

  /**
   * Get Redis client (lazy initialization)
   */
  private async getClient() {
    if (!this.client) {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      await this.client.connect();
    }
    return this.client;
  }

  /**
   * Get the primary key for a payment
   */
  private getPaymentKey(id: string): string {
    return `${this.PAYMENT_PREFIX}${id}`;
  }

  /**
   * Get the RSS index key for querying by podcast and item
   */
  private getRSSIndexKey(podcastGuid: string, rssItemGuid: string): string {
    return `${this.RSS_INDEX_PREFIX}${podcastGuid}:${rssItemGuid}`;
  }

  /**
   * Create a new payment metadata entry
   */
  async create(metadata: StoredPaymentMetadata): Promise<void> {
    const client = await this.getClient();
    const key = this.getPaymentKey(metadata.id);
    
    // Store the payment metadata
    await client.set(key, JSON.stringify(metadata));

    // If RSS item info is provided, add to RSS index
    if (metadata.podcastGuid && metadata.rssItemGuid) {
      const indexKey = this.getRSSIndexKey(metadata.podcastGuid, metadata.rssItemGuid);
      await client.sAdd(indexKey, metadata.id);
    }
  }

  /**
   * Find payment metadata by ID
   */
  async findById(id: string): Promise<StoredPaymentMetadata | null> {
    const client = await this.getClient();
    const key = this.getPaymentKey(id);
    const data = await client.get(key);
    
    if (!data) {
      return null;
    }

    return JSON.parse(data) as StoredPaymentMetadata;
  }

  /**
   * Find all payments for a specific RSS item
   */
  async findByRSSItem(podcastGuid: string, rssItemGuid: string): Promise<StoredPaymentMetadata[]> {
    const client = await this.getClient();
    const indexKey = this.getRSSIndexKey(podcastGuid, rssItemGuid);
    
    // Get all payment IDs from the index
    const paymentIds = await client.sMembers(indexKey);
    
    if (!paymentIds || paymentIds.length === 0) {
      return [];
    }

    // Fetch all payment metadata entries
    const results: StoredPaymentMetadata[] = [];
    for (const id of paymentIds) {
      const metadata = await this.findById(id);
      if (metadata) {
        results.push(metadata);
      }
    }

    return results;
  }

  /**
   * Update existing payment metadata
   */
  async update(metadata: StoredPaymentMetadata): Promise<boolean> {
    const existing = await this.findById(metadata.id);
    
    if (!existing) {
      return false;
    }

    const client = await this.getClient();
    const key = this.getPaymentKey(metadata.id);
    await client.set(key, JSON.stringify(metadata));

    // Note: RSS index remains the same (podcastGuid and rssItemGuid don't change)
    return true;
  }

  /**
   * Delete payment metadata
   */
  async delete(id: string): Promise<boolean> {
    const metadata = await this.findById(id);
    
    if (!metadata) {
      return false;
    }

    const client = await this.getClient();
    const key = this.getPaymentKey(id);
    await client.del(key);

    // Remove from RSS index if applicable
    if (metadata.podcastGuid && metadata.rssItemGuid) {
      const indexKey = this.getRSSIndexKey(metadata.podcastGuid, metadata.rssItemGuid);
      await client.sRem(indexKey, id);
    }

    return true;
  }

  /**
   * Find all payment metadata with optional pagination
   */
  async findAll(limit: number = 100, offset: number = 0): Promise<StoredPaymentMetadata[]> {
    const client = await this.getClient();
    
    // Get all payment keys
    const keys = await client.keys(`${this.PAYMENT_PREFIX}*`);
    
    if (!keys || keys.length === 0) {
      return [];
    }

    // Apply pagination
    const paginatedKeys = keys.slice(offset, offset + limit);
    
    // Fetch all payment metadata entries
    const results: StoredPaymentMetadata[] = [];
    for (const key of paginatedKeys) {
      const data = await client.get(key);
      if (data) {
        results.push(JSON.parse(data) as StoredPaymentMetadata);
      }
    }

    return results;
  }

  /**
   * Get total count of all payments
   */
  async getTotalCount(): Promise<number> {
    const client = await this.getClient();
    const keys = await client.keys(`${this.PAYMENT_PREFIX}*`);
    return keys ? keys.length : 0;
  }

  /**
   * Validate that the updateToken matches for a given payment
   */
  async validateUpdateToken(id: string, updateToken: string): Promise<boolean> {
    const metadata = await this.findById(id);
    return metadata ? metadata.updateToken === updateToken : false;
  }
}

// Singleton instance
export const storage = new PaymentMetadataStorage();

