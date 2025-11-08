// Signature utilities for payment metadata
// Ensures consistent canonicalization for signing/verifying

/**
 * Canonicalize JSON object for signing
 * This ensures the same signature regardless of field order
 * 
 * Rules:
 * - Sort all keys alphabetically (recursively)
 * - No whitespace
 * - Deterministic number formatting
 * 
 * @param obj The object to canonicalize
 * @returns Canonical JSON string
 */
export function canonicalizeJSON(obj: any): string {
  if (obj === null) {
    return 'null';
  }
  
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  
  if (Array.isArray(obj)) {
    const elements = obj.map(item => canonicalizeJSON(item));
    return `[${elements.join(',')}]`;
  }
  
  // Sort keys alphabetically
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    const value = canonicalizeJSON(obj[key]);
    return `"${key}":${value}`;
  });
  
  return `{${pairs.join(',')}}`;
}

/**
 * Example usage for signing metadata
 */
export function exampleSign(metadata: any, signFunction: (data: string) => string): string {
  const canonical = canonicalizeJSON(metadata);
  return signFunction(canonical);
}

/**
 * Example usage for verifying signature
 */
export function exampleVerify(
  metadata: any, 
  signature: string, 
  verifyFunction: (data: string, sig: string) => boolean
): boolean {
  const canonical = canonicalizeJSON(metadata);
  return verifyFunction(canonical, signature);
}

/**
 * JavaScript example (for documentation)
 */
export const jsExample = `
// Canonicalize before signing
function canonicalizeJSON(obj) {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJSON).join(',') + ']';
  }
  
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    return '"' + key + '":' + canonicalizeJSON(obj[key]);
  });
  return '{' + pairs.join(',') + '}';
}

// Example: Sign metadata
const metadata = {
  payment_hash: "abc123",
  amount_msat: "50000",
  sender: "sender_pubkey",
  timestamp: 1700000000
};

const canonical = canonicalizeJSON(metadata);
// Always produces: {"amount_msat":"50000","payment_hash":"abc123","sender":"sender_pubkey","timestamp":1700000000}

const signature = signData(canonical);

// Example: Verify signature
const received = await fetch('/v1/payment-metadata/123').then(r => r.json());
const canonicalReceived = canonicalizeJSON(received.metadata);
const isValid = verifySignature(canonicalReceived, received.signature, senderPubkey);
`;

/**
 * Python example (for documentation)
 */
export const pythonExample = `
import json

def canonicalize_json(obj):
    """
    Canonicalize JSON for consistent signatures
    """
    if obj is None:
        return 'null'
    if isinstance(obj, bool):
        return 'true' if obj else 'false'
    if isinstance(obj, (int, float)):
        return json.dumps(obj)
    if isinstance(obj, str):
        return json.dumps(obj)
    if isinstance(obj, list):
        elements = [canonicalize_json(item) for item in obj]
        return '[' + ','.join(elements) + ']'
    if isinstance(obj, dict):
        sorted_keys = sorted(obj.keys())
        pairs = [f'"{key}":{canonicalize_json(obj[key])}' for key in sorted_keys]
        return '{' + ','.join(pairs) + '}'
    raise ValueError(f"Cannot canonicalize type {type(obj)}")

# Example: Sign metadata
metadata = {
    "payment_hash": "abc123",
    "amount_msat": "50000",
    "sender": "sender_pubkey",
    "timestamp": 1700000000
}

canonical = canonicalize_json(metadata)
# Always produces: {"amount_msat":"50000","payment_hash":"abc123","sender":"sender_pubkey","timestamp":1700000000}

signature = sign_data(canonical)

# Example: Verify signature
import hashlib
from ecdsa import VerifyingKey, SECP256k1

def verify_payment_signature(metadata, signature_hex, sender_pubkey_hex):
    canonical = canonicalize_json(metadata)
    message_hash = hashlib.sha256(canonical.encode()).digest()
    
    vk = VerifyingKey.from_string(bytes.fromhex(sender_pubkey_hex), curve=SECP256k1)
    return vk.verify_digest(bytes.fromhex(signature_hex), message_hash)
`;

