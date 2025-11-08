// Types for MetaBoost API - Simple Payment Metadata Storage

export enum PaymentType {
  BITCOIN_LIGHTNING = 'bitcoin-lightning',
  MONERO = 'monero'
}

// Payment metadata - users can store any payment-related fields
export interface SimplePaymentMetadata {
  // Payment identification
  payment_hash?: string;        // Lightning payment hash or transaction ID
  payment_preimage?: string;    // Lightning preimage (optional)
  tx_hash?: string;             // Monero/Bitcoin transaction hash
  tx_key?: string;              // Monero transaction key
  
  // Payment details
  amount?: string;              // Payment amount (in appropriate unit)
  amount_msat?: string;         // Lightning amount in millisatoshis
  currency?: string;            // Currency code (e.g., "BTC", "XMR", "USD")
  
  // Sender/Receiver info
  sender?: string;              // Sender identifier (pubkey, address, etc.)
  receiver?: string;            // Receiver identifier
  
  // Timestamps
  timestamp?: number;           // Payment timestamp (unix)
  resolved_at?: number;         // When payment was confirmed
  expires_at?: number;          // Expiration timestamp
  
  // Verification
  confirmations?: number;       // Number of confirmations
  verified?: boolean;           // Whether payment has been verified
  
  // Custom fields - users can add any additional data
  [key: string]: any;
}

export interface PaymentMetadata {
  id: string;
  type: PaymentType;
  
  // Payment metadata with any custom fields
  metadata: SimplePaymentMetadata;
  
  // Optional cryptographic signature for metadata
  // This allows users to cryptographically sign their payment data
  signature?: string;
  
  // Query support fields
  podcastGuid?: string;
  rssItemGuid?: string;
}

export interface PaymentMetadataNew {
  type: PaymentType;
  
  // Payment metadata with any custom fields
  metadata: SimplePaymentMetadata;
  
  // Optional cryptographic signature for metadata
  // Sign the canonicalized JSON string of the metadata object
  signature?: string;
  
  // Optional query fields
  podcastGuid?: string;
  rssItemGuid?: string;
}

export interface PaymentMetadataUpdate {
  id: string;
  updateToken: string;
  type: PaymentType;
  
  // Payment metadata with any custom fields
  metadata: SimplePaymentMetadata;
  
  // Optional cryptographic signature for metadata
  signature?: string;
}

export interface PaymentMetadataResponse {
  id: string;
  updateToken: string;
}

export interface StoredPaymentMetadata extends PaymentMetadata {
  updateToken: string;
}

