# MetaBoost API

> Simple payment metadata storage and retrieval for Bitcoin Lightning, Monero, and other payment networks.

## 🎉 Simple & Flexible

Store payment data as simple JSON objects with any fields you need, plus optional cryptographic signatures.

```json
{
  "type": "bitcoin-lightning",
  "metadata": {
    "payment_hash": "d87bdee6f9e4d3f00f09c9ad29d61d34405bb4cfe64fc0490b26e5105d7acea7",
    "amount_msat": "100000",
    "sender": "02b66d7caae1acb51a95e036fc12b1e6837d9143141fcff520876b04b9d82f36d1",
    "receiver": "032f4ffbbafffbe51726ad3c164a3d0d37ec27bc67b29a159b0f49ae8ac21b8508",
    "timestamp": 1647906111,
    "verified": true
  },
  "signature": "optional_cryptographic_signature"
}
```

## 🚀 Quick Start

### Store Payment Metadata
```bash
curl -X POST https://metaboost.vercel.app/v1/payment-metadata \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bitcoin-lightning",
    "metadata": {
      "payment_hash": "abc123...",
      "amount_msat": "50000",
      "timestamp": 1700000000
    }
  }'
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "updateToken": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

### Retrieve Payment Metadata
```bash
curl https://metaboost.vercel.app/v1/payment-metadata/{id}
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "bitcoin-lightning",
  "metadata": {
    "payment_hash": "abc123...",
    "amount_msat": "50000",
    "timestamp": 1700000000
  }
}
```

## 📚 Documentation

- **[API Documentation](https://metaboost.vercel.app/)** - Complete API reference and examples
- **[Signature Guide](SIGNATURE_GUIDE.md)** - How to sign and verify payment metadata

## 💡 Key Features

### ✅ Flexible Metadata
Store any payment-related fields you need:
```json
{
  "type": "bitcoin-lightning",
  "metadata": {
    "payment_hash": "...",
    "amount_msat": "100000",
    
    // Add any custom fields
    "podcast_title": "My Podcast",
    "episode_number": 42,
    "boost_message": "Great show!",
    "app_name": "MyApp",
    "user_id": "user_12345"
  }
}
```

### ✅ Optional Cryptographic Signatures
Sign your payment metadata to prove authenticity:
```json
{
  "type": "bitcoin-lightning",
  "metadata": { /* your payment data */ },
  "signature": "65_byte_signature_with_recovery"
}
```

**Public Key Recovery (secp256k1):** With Lightning/Bitcoin signatures, you can recover the signer's public key from the signature - no need to store it separately! Use 65-byte signatures (64 bytes + 1 recovery param).

The API stores signatures but doesn't verify them - giving you flexibility to use any signature algorithm (secp256k1, ed25519, etc.).

### ✅ Multiple Payment Types
- Bitcoin Lightning Network
- Monero
- Extensible for other payment networks

### ✅ Podcast Integration
Link payments to specific podcast episodes:
```json
{
  "type": "bitcoin-lightning",
  "metadata": { /* ... */ },
  "podcastGuid": "podcast-uuid",
  "rssItemGuid": "episode-guid"
}
```

Then query all payments for an episode:
```bash
curl "https://metaboost.vercel.app/v1/payment-metadata/findByRSSItem?podcastGuid=podcast-uuid&rssItemGuid=episode-guid"
```


## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/payment-metadata` | Create payment metadata |
| GET | `/v1/payment-metadata/{id}` | Get by ID |
| GET | `/v1/payment-metadata/findByRSSItem` | Find by podcast episode |
| GET | `/v1/payment-metadata/list` | List all (paginated) |
| PUT | `/v1/payment-metadata?updateToken={token}` | Update metadata |
| DELETE | `/v1/payment-metadata/{id}?updateToken={token}` | Delete metadata |

## 📖 Common Use Cases

### Lightning Network Payment
```json
{
  "type": "bitcoin-lightning",
  "metadata": {
    "payment_hash": "d87bdee6f9e4d3f00f09c9ad29d61d34405bb4cfe64fc0490b26e5105d7acea7",
    "payment_preimage": "preimage_hex",
    "amount_msat": "100000",
    "sender": "sender_lightning_pubkey",
    "receiver": "receiver_lightning_pubkey",
    "timestamp": 1700000000,
    "verified": true
  }
}
```

### Monero Payment
```json
{
  "type": "monero",
  "metadata": {
    "tx_hash": "monero_transaction_hash",
    "tx_key": "transaction_key",
    "amount": "1000000000000",
    "confirmations": 10,
    "timestamp": 1700000000,
    "verified": true
  }
}
```

### Podcast Boost
```json
{
  "type": "bitcoin-lightning",
  "metadata": {
    "payment_hash": "...",
    "amount_msat": "50000",
    "boost_message": "Great episode!",
    "app_name": "Fountain",
    "sender_name": "Alice"
  },
  "podcastGuid": "podcast-uuid",
  "rssItemGuid": "episode-123"
}
```

## 🛠️ Development

### Prerequisites
- Node.js 20+
- Redis database
- Vercel account (for deployment)

### Setup
```bash
# Install dependencies
npm install

# Set environment variable
export REDIS_URL="redis://localhost:6379"

# Run locally
npm start

# Build TypeScript
npm run build

# Deploy to Vercel
npm run deploy
```

### Environment Variables
- `REDIS_URL` - Redis connection string (required)

## 🔒 Security

- **Update Tokens**: Keep your `updateToken` secure! Anyone with this token can modify or delete your payment metadata.
- **Signatures**: Optionally sign your metadata to prove authenticity. The API stores signatures but does NOT verify them - verification is the responsibility of the receiving application.
- **Validation**: The API validates data format but does NOT verify blockchain transactions. Always verify payments on-chain before trusting them.
- **CORS**: Enabled for browser-based applications

### Signature Format

⚠️ **Critical:** JSON field order affects signatures! You MUST canonicalize (sort keys) before signing/verifying.

To sign metadata:
1. **Canonicalize** the metadata JSON (sorted keys, no whitespace) ⭐ Most important!
2. Hash the canonical string (e.g., SHA-256)
3. Sign the hash with your private key (e.g., secp256k1, ed25519)
4. Encode signature as hex string

```javascript
// Proper canonicalization function
function canonicalizeJSON(obj) {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJSON).join(',') + ']';
  }
  
  // CRITICAL: Sort keys alphabetically
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    return '"' + key + '":' + canonicalizeJSON(obj[key]);
  });
  return '{' + pairs.join(',') + '}';
}

// Sign
const canonical = canonicalizeJSON(metadata);
const messageHash = crypto.createHash('sha256').update(canonical).digest();
const signature = secp256k1.ecdsaSign(messageHash, privateKey);

// Verify (use same canonicalization!)
const canonical = canonicalizeJSON(receivedMetadata);
const isValid = secp256k1.ecdsaVerify(signature, messageHash, senderPubkey);
```

**Why Canonicalization Matters:**
- `{"a":1,"b":2}` and `{"b":2,"a":1}` are equivalent JSON
- But they produce different signatures without canonicalization
- Both signer and verifier MUST use the same canonicalization function

See [SIGNATURE_GUIDE.md](SIGNATURE_GUIDE.md) for complete signature examples.

## 📝 JavaScript Example

```javascript
// Store a payment (with optional signature)
async function storePayment() {
  const metadata = {
    payment_hash: 'abc123...',
    amount_msat: '50000',
    sender: 'sender_pubkey',
    timestamp: Math.floor(Date.now() / 1000),
    memo: 'Great show!'
  };
  
  // Optional: Sign the metadata (use proper canonicalization!)
  const canonical = canonicalizeJSON(metadata); // See signature section above
  const signature = signData(canonical); // Your signing function
  
  const response = await fetch('https://metaboost.vercel.app/v1/payment-metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'bitcoin-lightning',
      metadata,
      signature, // Optional
      podcastGuid: 'my-podcast-guid',
      rssItemGuid: 'episode-42'
    })
  });
  
  const { id, updateToken } = await response.json();
  return { id, updateToken };
}

// Retrieve a payment
async function getPayment(id) {
  const response = await fetch(`https://metaboost.vercel.app/v1/payment-metadata/${id}`);
  return await response.json();
}

// Find all payments for an episode
async function getEpisodePayments(podcastGuid, rssItemGuid) {
  const url = new URL('https://metaboost.vercel.app/v1/payment-metadata/findByRSSItem');
  url.searchParams.set('podcastGuid', podcastGuid);
  url.searchParams.set('rssItemGuid', rssItemGuid);
  
  const response = await fetch(url);
  return await response.json();
}
```

## 🐍 Python Example

```python
import requests
import time
import json
import hashlib
from ecdsa import SigningKey, SECP256k1

# Store a payment (with optional signature)
def store_payment():
    metadata = {
        'payment_hash': 'abc123...',
        'amount_msat': '50000',
        'sender': 'sender_pubkey',
        'timestamp': int(time.time()),
        'memo': 'Great show!'
    }
    
    # Optional: Sign the metadata (use proper canonicalization!)
    canonical = canonicalize_json(metadata)  # See signature section above
    signature = sign_metadata(canonical)  # Your signing function
    
    response = requests.post('https://metaboost.vercel.app/v1/payment-metadata', json={
        'type': 'bitcoin-lightning',
        'metadata': metadata,
        'signature': signature,  # Optional
        'podcastGuid': 'my-podcast-guid',
        'rssItemGuid': 'episode-42'
    })
    return response.json()

def sign_metadata(canonical_json):
    """Sign metadata using secp256k1"""
    # sk = SigningKey.from_string(your_private_key_bytes, curve=SECP256k1)
    # message_hash = hashlib.sha256(canonical_json.encode()).digest()
    # signature = sk.sign_digest(message_hash)
    # return signature.hex()
    pass  # Implement with your private key

# Retrieve a payment
def get_payment(payment_id):
    response = requests.get(f'https://metaboost.vercel.app/v1/payment-metadata/{payment_id}')
    return response.json()

# Find all payments for an episode
def get_episode_payments(podcast_guid, rss_item_guid):
    response = requests.get('https://metaboost.vercel.app/v1/payment-metadata/findByRSSItem', params={
        'podcastGuid': podcast_guid,
        'rssItemGuid': rss_item_guid
    })
    return response.json()
```

## 🤝 Contributing

We welcome contributions! The API is designed to be simple and extensible.

## 📄 License

Apache-2.0

## 🔗 Links

- [Podcast Index](https://podcastindex.org/)
- [GitHub](https://github.com/Podcastindex-org)

---

Made with ❤️ by the Podcast Index team

