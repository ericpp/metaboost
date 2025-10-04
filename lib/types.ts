// Types based on OpenAPI specification and JPT specification

// JSON Payment Token (JPT) Types
// JPT is similar to JWT but for payment verification

export interface JPTHeader {
  alg: string; // e.g., "lightning-keysend", "monero-transaction"
  typ: 'JPT';
}

// Standard JWT claims used in JPT
export interface JPTPayloadBase {
  aud?: string;  // Audience - receiver's identifier (e.g., lightning pubkey)
  iss?: string;  // Issuer - sender's identifier (e.g., lightning pubkey)
  iat?: number;  // Issued at time (unix timestamp)
  exp?: number;  // Expiration time (unix timestamp)
}

// Lightning-specific payload
export interface LightningJPTPayload extends JPTPayloadBase {
  resolve_time?: number;    // Unix timestamp when payment was resolved
  amt_paid_msat?: string;   // Amount paid in millisatoshis
  payment_hash?: string;    // Payment hash for verification
  preimage?: string;        // Payment preimage (optional)
}

// Monero-specific payload
export interface MoneroJPTPayload extends JPTPayloadBase {
  tx_hash?: string;         // Transaction hash
  tx_key?: string;          // Transaction key for verification
  amount?: string;          // Amount in atomic units
  confirmations?: number;   // Number of confirmations
}

// Union type for all payment-specific payloads
export type JPTPayload = LightningJPTPayload | MoneroJPTPayload;

// Full JPT structure (decoded)
export interface DecodedJPT {
  header: JPTHeader;
  payload: JPTPayload;
  signature: string;
}

// JPT can be stored as either a full encoded string or a decoded object
export type JsonPaymentToken = string | DecodedJPT;

export enum PaymentType {
  BITCOIN_LIGHTNING = 'bitcoin-lightning',
  MONERO = 'monero'
}

export interface PaymentMetadata {
  id: string;
  jpt: JsonPaymentToken;
  type: PaymentType;
  // Internal fields for query support
  podcastGuid?: string;
  rssItemGuid?: string;
}

export interface PaymentMetadataNew {
  jpt: JsonPaymentToken;
  type: PaymentType;
  podcastGuid?: string;
  rssItemGuid?: string;
}

export interface PaymentMetadataUpdate {
  id: string;
  updateToken: string;
  jpt: JsonPaymentToken;
  type: PaymentType;
}

export interface PaymentMetadataResponse {
  id: string;
  updateToken: string;
}

export interface StoredPaymentMetadata extends PaymentMetadata {
  updateToken: string;
}

