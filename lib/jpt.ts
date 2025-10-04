// JSON Payment Token (JPT) utilities
// JPT follows JWT-like structure: header.payload.signature

import type { 
  JPTHeader, 
  JPTPayload, 
  DecodedJPT, 
  JsonPaymentToken,
  LightningJPTPayload,
  MoneroJPTPayload
} from './types.js';
import { PaymentType } from './types.js';

/**
 * Decode base64url string to JSON object
 */
function base64UrlDecode(str: string): any {
  try {
    // Replace URL-safe characters
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const padded = base64 + padding;
    // Decode and parse
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error('Invalid base64url encoding');
  }
}

/**
 * Encode JSON object to base64url string
 */
function base64UrlEncode(obj: any): string {
  const json = JSON.stringify(obj);
  const base64 = Buffer.from(json).toString('base64');
  // Make URL-safe and remove padding
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Parse a JPT string into its components
 */
export function parseJPT(jptString: string): DecodedJPT {
  const parts = jptString.split('.');
  
  if (parts.length !== 3) {
    throw new Error('Invalid JPT format: must have three parts (header.payload.signature)');
  }

  const [headerStr, payloadStr, signature] = parts;

  try {
    const header = base64UrlDecode(headerStr) as JPTHeader;
    const payload = base64UrlDecode(payloadStr) as JPTPayload;

    return {
      header,
      payload,
      signature
    };
  } catch (error) {
    throw new Error(`Failed to parse JPT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encode a DecodedJPT back to string format
 */
export function encodeJPT(jpt: DecodedJPT): string {
  const headerStr = base64UrlEncode(jpt.header);
  const payloadStr = base64UrlEncode(jpt.payload);
  return `${headerStr}.${payloadStr}.${jpt.signature}`;
}

/**
 * Validate JPT header
 */
export function validateJPTHeader(header: any): { valid: boolean; error?: string } {
  if (!header || typeof header !== 'object') {
    return { valid: false, error: 'Header must be an object' };
  }

  if (header.typ !== 'JPT') {
    return { valid: false, error: 'Header typ must be "JPT"' };
  }

  if (!header.alg || typeof header.alg !== 'string') {
    return { valid: false, error: 'Header alg is required and must be a string' };
  }

  return { valid: true };
}

/**
 * Validate Lightning-specific JPT payload
 */
export function validateLightningPayload(payload: LightningJPTPayload): { valid: boolean; error?: string } {
  // Check for Lightning-specific fields
  if (payload.payment_hash && typeof payload.payment_hash !== 'string') {
    return { valid: false, error: 'payment_hash must be a string' };
  }

  if (payload.amt_paid_msat && typeof payload.amt_paid_msat !== 'string') {
    return { valid: false, error: 'amt_paid_msat must be a string' };
  }

  if (payload.resolve_time && typeof payload.resolve_time !== 'number') {
    return { valid: false, error: 'resolve_time must be a number' };
  }

  // Validate standard JWT claims
  if (payload.iat && typeof payload.iat !== 'number') {
    return { valid: false, error: 'iat must be a number' };
  }

  if (payload.exp && typeof payload.exp !== 'number') {
    return { valid: false, error: 'exp must be a number' };
  }

  // Check expiration if present
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, error: 'Token has expired' };
  }

  return { valid: true };
}

/**
 * Validate Monero-specific JPT payload
 */
export function validateMoneroPayload(payload: MoneroJPTPayload): { valid: boolean; error?: string } {
  if (payload.tx_hash && typeof payload.tx_hash !== 'string') {
    return { valid: false, error: 'tx_hash must be a string' };
  }

  if (payload.amount && typeof payload.amount !== 'string') {
    return { valid: false, error: 'amount must be a string' };
  }

  if (payload.confirmations && typeof payload.confirmations !== 'number') {
    return { valid: false, error: 'confirmations must be a number' };
  }

  // Validate standard JWT claims
  if (payload.iat && typeof payload.iat !== 'number') {
    return { valid: false, error: 'iat must be a number' };
  }

  if (payload.exp && typeof payload.exp !== 'number') {
    return { valid: false, error: 'exp must be a number' };
  }

  // Check expiration if present
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, error: 'Token has expired' };
  }

  return { valid: true };
}

/**
 * Validate JPT payload based on algorithm
 */
export function validateJPTPayload(header: JPTHeader, payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }

  // Validate based on algorithm type
  if (header.alg.includes('lightning')) {
    return validateLightningPayload(payload as LightningJPTPayload);
  } else if (header.alg.includes('monero')) {
    return validateMoneroPayload(payload as MoneroJPTPayload);
  }

  // Generic validation for unknown payment types
  return { valid: true };
}

/**
 * Validate a complete JPT
 */
export function validateJPT(jpt: JsonPaymentToken): { valid: boolean; error?: string; decoded?: DecodedJPT } {
  try {
    let decoded: DecodedJPT;

    // Handle both string and object formats
    if (typeof jpt === 'string') {
      decoded = parseJPT(jpt);
    } else {
      decoded = jpt;
    }

    // Validate header
    const headerValidation = validateJPTHeader(decoded.header);
    if (!headerValidation.valid) {
      return headerValidation;
    }

    // Validate payload
    const payloadValidation = validateJPTPayload(decoded.header, decoded.payload);
    if (!payloadValidation.valid) {
      return payloadValidation;
    }

    // Validate signature exists
    if (!decoded.signature || typeof decoded.signature !== 'string') {
      return { valid: false, error: 'Signature is required' };
    }

    return { valid: true, decoded };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Invalid JPT format' 
    };
  }
}

/**
 * Get payment type from JPT algorithm
 */
export function getPaymentTypeFromJPT(jpt: JsonPaymentToken): PaymentType | null {
  try {
    let decoded: DecodedJPT;

    if (typeof jpt === 'string') {
      decoded = parseJPT(jpt);
    } else {
      decoded = jpt;
    }

    const alg = decoded.header.alg.toLowerCase();

    if (alg.includes('lightning')) {
      return PaymentType.BITCOIN_LIGHTNING;
    } else if (alg.includes('monero')) {
      return PaymentType.MONERO;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Extract message to verify (header.payload) from JPT string
 */
export function getJPTMessage(jptString: string): string {
  const parts = jptString.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JPT format');
  }
  return `${parts[0]}.${parts[1]}`;
}

