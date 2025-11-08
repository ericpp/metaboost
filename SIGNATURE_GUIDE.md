# Signature Guide for MetaBoost API

## Public Key Recovery (ECDSA/secp256k1)

### Can You Identify the Signer from the Signature?

**YES** - if using ECDSA/secp256k1 (Bitcoin/Lightning)!

With secp256k1, you can recover the public key from the signature without needing to store it separately. This is widely used in Bitcoin and Ethereum.

```javascript
// Example: Recover public key from signature
const crypto = require('crypto');
const secp256k1 = require('secp256k1');

function recoverPublicKey(message, signatureWithRecovery) {
  // Signature format: 64 bytes (r+s) + 1 byte (recovery param)
  const signature = signatureWithRecovery.slice(0, 64);
  const recovery = signatureWithRecovery[64];
  
  const messageHash = crypto.createHash('sha256').update(message).digest();
  
  // Recover the public key
  const publicKey = secp256k1.ecdsaRecover(signature, recovery, messageHash);
  return Buffer.from(publicKey).toString('hex');
}
```

**Benefits:**
- Don't need to store sender public key in metadata
- Can verify signature and identify signer in one step
- Reduces data size

**Important:** Standard ECDSA signatures are 64 bytes (r+s). For recovery, you need a 65-byte signature that includes the recovery parameter.

### Recovery Not Possible With:
- Ed25519 (must provide public key separately)
- RSA (must provide public key separately)

## The Canonicalization Problem

### Why Field Order Matters

When you sign JSON data, **field order affects the signature**. Consider:

```javascript
const obj1 = { a: 1, b: 2 };
const obj2 = { b: 2, a: 1 };

JSON.stringify(obj1);  // '{"a":1,"b":2}'
JSON.stringify(obj2);  // '{"b":2,"a":1}'
```

These are **semantically identical** JSON objects, but they produce **different string representations**, which means they would produce **different signatures**!

### The Solution: Canonical JSON

Before signing or verifying, you must **canonicalize** the JSON by:
1. Sorting all keys alphabetically (recursively)
2. Removing all whitespace
3. Using consistent formatting

This ensures that equivalent JSON objects always produce the same signature.

## Canonicalization Implementation

### JavaScript / Node.js

```javascript
/**
 * Canonicalize JSON for consistent signatures
 * RFC 8785 inspired (simplified version)
 */
function canonicalizeJSON(obj) {
  // Handle primitives
  if (obj === null) {
    return 'null';
  }
  
  if (obj === undefined) {
    return undefined; // Don't include undefined values
  }
  
  if (typeof obj === 'boolean') {
    return obj ? 'true' : 'false';
  }
  
  if (typeof obj === 'number') {
    return JSON.stringify(obj);
  }
  
  if (typeof obj === 'string') {
    return JSON.stringify(obj);
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    const elements = obj
      .map(item => canonicalizeJSON(item))
      .filter(item => item !== undefined);
    return '[' + elements.join(',') + ']';
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys
      .map(key => {
        const value = canonicalizeJSON(obj[key]);
        if (value === undefined) return undefined;
        return '"' + key + '":' + value;
      })
      .filter(pair => pair !== undefined);
    return '{' + pairs.join(',') + '}';
  }
  
  throw new Error('Cannot canonicalize: ' + typeof obj);
}

// Test it
const metadata1 = { z: 3, a: 1, m: 2 };
const metadata2 = { a: 1, m: 2, z: 3 };

console.log(canonicalizeJSON(metadata1)); // {"a":1,"m":2,"z":3}
console.log(canonicalizeJSON(metadata2)); // {"a":1,"m":2,"z":3}
// ✅ Same output regardless of original order!
```

### Python

```python
import json
from typing import Any

def canonicalize_json(obj: Any) -> str:
    """
    Canonicalize JSON for consistent signatures
    RFC 8785 inspired (simplified version)
    """
    # Handle None
    if obj is None:
        return 'null'
    
    # Handle booleans
    if isinstance(obj, bool):
        return 'true' if obj else 'false'
    
    # Handle numbers
    if isinstance(obj, (int, float)):
        # Use JSON serialization for proper number formatting
        return json.dumps(obj)
    
    # Handle strings
    if isinstance(obj, str):
        return json.dumps(obj)  # Properly escapes quotes, etc.
    
    # Handle lists
    if isinstance(obj, list):
        elements = [canonicalize_json(item) for item in obj]
        return '[' + ','.join(elements) + ']'
    
    # Handle dictionaries
    if isinstance(obj, dict):
        # CRITICAL: Sort keys alphabetically
        sorted_keys = sorted(obj.keys())
        pairs = []
        for key in sorted_keys:
            value = canonicalize_json(obj[key])
            pairs.append(f'"{key}":{value}')
        return '{' + ','.join(pairs) + '}'
    
    raise ValueError(f"Cannot canonicalize type: {type(obj)}")

# Test it
metadata1 = {"z": 3, "a": 1, "m": 2}
metadata2 = {"a": 1, "m": 2, "z": 3}

print(canonicalize_json(metadata1))  # {"a":1,"m":2,"z":3}
print(canonicalize_json(metadata2))  # {"a":1,"m":2,"z":3}
# ✅ Same output regardless of original order!
```

### Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "sort"
    "strings"
)

func canonicalizeJSON(v interface{}) (string, error) {
    switch val := v.(type) {
    case nil:
        return "null", nil
    
    case bool:
        if val {
            return "true", nil
        }
        return "false", nil
    
    case float64, int, int64:
        b, err := json.Marshal(val)
        return string(b), err
    
    case string:
        b, err := json.Marshal(val)
        return string(b), err
    
    case []interface{}:
        elements := make([]string, len(val))
        for i, item := range val {
            canonical, err := canonicalizeJSON(item)
            if err != nil {
                return "", err
            }
            elements[i] = canonical
        }
        return "[" + strings.Join(elements, ",") + "]", nil
    
    case map[string]interface{}:
        // Sort keys
        keys := make([]string, 0, len(val))
        for k := range val {
            keys = append(keys, k)
        }
        sort.Strings(keys)
        
        pairs := make([]string, len(keys))
        for i, k := range keys {
            canonical, err := canonicalizeJSON(val[k])
            if err != nil {
                return "", err
            }
            pairs[i] = fmt.Sprintf(`"%s":%s`, k, canonical)
        }
        return "{" + strings.Join(pairs, ",") + "}", nil
    
    default:
        return "", fmt.Errorf("cannot canonicalize type: %T", v)
    }
}
```

## Complete Signing Example

### JavaScript with secp256k1

```javascript
const crypto = require('crypto');
const secp256k1 = require('secp256k1');

// Your canonicalization function from above
function canonicalizeJSON(obj) { /* ... */ }

async function signMetadata(metadata, privateKeyHex, includeRecovery = true) {
  // 1. Canonicalize
  const canonical = canonicalizeJSON(metadata);
  
  // 2. Hash
  const messageHash = crypto
    .createHash('sha256')
    .update(canonical, 'utf8')
    .digest();
  
  // 3. Sign
  const privateKey = Buffer.from(privateKeyHex, 'hex');
  const sigObj = secp256k1.ecdsaSign(messageHash, privateKey);
  
  // 4. Include recovery parameter for public key recovery
  if (includeRecovery) {
    // 65-byte signature: 64 bytes (r+s) + 1 byte (recovery)
    const sigWithRecovery = Buffer.concat([
      Buffer.from(sigObj.signature),
      Buffer.from([sigObj.recid])
    ]);
    return sigWithRecovery.toString('hex');
  }
  
  // 4b. Or just 64-byte signature (no recovery)
  return Buffer.from(sigObj.signature).toString('hex');
}

async function verifyMetadata(metadata, signatureHex, publicKeyHex = null) {
  // 1. Canonicalize (MUST use same function!)
  const canonical = canonicalizeJSON(metadata);
  
  // 2. Hash
  const messageHash = crypto
    .createHash('sha256')
    .update(canonical, 'utf8')
    .digest();
  
  const signatureBuffer = Buffer.from(signatureHex, 'hex');
  
  // 3a. If 65-byte signature, recover public key
  if (signatureBuffer.length === 65 && !publicKeyHex) {
    const signature = signatureBuffer.slice(0, 64);
    const recovery = signatureBuffer[64];
    
    // Recover public key from signature
    const recoveredPubkey = secp256k1.ecdsaRecover(signature, recovery, messageHash);
    
    // Verify with recovered key
    return secp256k1.ecdsaVerify(signature, messageHash, recoveredPubkey);
  }
  
  // 3b. If 64-byte signature, use provided public key
  if (!publicKeyHex) {
    throw new Error('Public key required for 64-byte signatures');
  }
  
  const signature = signatureBuffer.slice(0, 64);
  const publicKey = Buffer.from(publicKeyHex, 'hex');
  
  return secp256k1.ecdsaVerify(signature, messageHash, publicKey);
}

// Usage
const metadata = {
  payment_hash: "abc123...",
  amount_msat: "50000",
  sender: "sender_pubkey",
  timestamp: 1700000000
};

const signature = await signMetadata(metadata, privateKeyHex);

// Send to API
fetch('https://metaboost.vercel.app/v1/payment-metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'bitcoin-lightning',
    metadata,
    signature
  })
});

// Later: Verify
const isValid = await verifyMetadata(
  receivedMetadata, 
  receivedSignature, 
  senderPublicKey
);
```

### Python with ecdsa

```python
import hashlib
from ecdsa import SigningKey, VerifyingKey, SECP256k1

def canonicalize_json(obj):
    """Your canonicalization function from above"""
    pass

def sign_metadata(metadata: dict, private_key_hex: str) -> str:
    """Sign payment metadata"""
    # 1. Canonicalize
    canonical = canonicalize_json(metadata)
    
    # 2. Hash
    message_hash = hashlib.sha256(canonical.encode('utf-8')).digest()
    
    # 3. Sign
    private_key = SigningKey.from_string(
        bytes.fromhex(private_key_hex), 
        curve=SECP256k1
    )
    signature = private_key.sign_digest(message_hash)
    
    # 4. Encode as hex
    return signature.hex()

def verify_metadata(
    metadata: dict, 
    signature_hex: str, 
    public_key_hex: str
) -> bool:
    """Verify payment metadata signature"""
    # 1. Canonicalize (MUST use same function!)
    canonical = canonicalize_json(metadata)
    
    # 2. Hash
    message_hash = hashlib.sha256(canonical.encode('utf-8')).digest()
    
    # 3. Verify
    public_key = VerifyingKey.from_string(
        bytes.fromhex(public_key_hex),
        curve=SECP256k1
    )
    
    try:
        return public_key.verify_digest(
            bytes.fromhex(signature_hex),
            message_hash
        )
    except:
        return False

# Usage
metadata = {
    "payment_hash": "abc123...",
    "amount_msat": "50000",
    "sender": "sender_pubkey",
    "timestamp": 1700000000
}

signature = sign_metadata(metadata, private_key_hex)

# Send to API
import requests
requests.post('https://metaboost.vercel.app/v1/payment-metadata', json={
    'type': 'bitcoin-lightning',
    'metadata': metadata,
    'signature': signature
})

# Later: Verify
is_valid = verify_metadata(received_metadata, received_signature, sender_pubkey)
```

## Best Practices

### 1. Share the Canonicalization Function

Both signer and verifier **must use the exact same canonicalization function**. Consider:
- Publishing your canonicalization function in a shared library
- Using a standard like RFC 8785 (JCS - JSON Canonicalization Scheme)
- Documenting your exact canonicalization rules

### 2. Use Public Key Recovery (secp256k1)

If using secp256k1, include the recovery parameter so receivers can identify the signer:

```json
{
  "metadata": {
    "payment_hash": "abc...",
    "amount_msat": "50000",
    // No need to include sender_pubkey - can be recovered!
    "signature_algorithm": "secp256k1-sha256-recoverable"
  },
  "signature": "65_byte_signature_with_recovery_param"
}
```

Or include the public key if using standard 64-byte signatures:

```json
{
  "metadata": {
    "payment_hash": "abc...",
    "amount_msat": "50000",
    "sender_pubkey": "02abc...",  // Required for verification
    "signature_algorithm": "secp256k1-sha256"
  },
  "signature": "64_byte_signature"
}
```

### 3. Test Your Implementation

```javascript
// Test that field order doesn't matter
const test1 = { z: 3, a: 1 };
const test2 = { a: 1, z: 3 };

const canonical1 = canonicalizeJSON(test1);
const canonical2 = canonicalizeJSON(test2);

console.assert(canonical1 === canonical2, 'Canonicalization failed!');
console.assert(canonical1 === '{"a":1,"z":3}', 'Wrong format!');
```

### 4. Handle Edge Cases

- Nested objects (recursively sort)
- Arrays (maintain order, don't sort)
- Numbers (consistent formatting: `1.0` vs `1`)
- Strings (proper escaping: `"hello"` not `hello`)
- Special values (`null`, `true`, `false`)

## Common Mistakes

### ❌ Wrong: Using JSON.stringify() directly

```javascript
// DON'T DO THIS
const canonical = JSON.stringify(metadata);  // Field order not guaranteed!
const signature = sign(canonical);
```

### ❌ Wrong: Sorting only top-level keys

```javascript
// DON'T DO THIS
const canonical = JSON.stringify(metadata, Object.keys(metadata).sort());
// Doesn't sort nested objects!
```

### ✅ Right: Recursive canonicalization

```javascript
// DO THIS
const canonical = canonicalizeJSON(metadata);  // Sorts all levels
const signature = sign(canonical);
```

## API Behavior

The MetaBoost API:
- ✅ **Stores** the signature you provide
- ✅ **Returns** the signature when you query
- ❌ **Does NOT verify** signatures
- ❌ **Does NOT canonicalize** your data

**Why?** This gives you flexibility:
- Use any signature algorithm (secp256k1, ed25519, RSA, etc.)
- Use any canonicalization scheme
- Skip signatures if you don't need them

**Your responsibility:**
- Canonicalize before signing
- Canonicalize before verifying
- Use the same canonicalization function for both

## References

- [RFC 8785 - JSON Canonicalization Scheme (JCS)](https://tools.ietf.org/html/rfc8785)
- [JSON Signature Format (JSF)](https://cyberphone.github.io/doc/security/jsf.html)
- [Canonical JSON](http://wiki.laptop.org/go/Canonical_JSON)

---

Need help? See the [API Documentation](https://metaboost.vercel.app/) or [README](README.md).

