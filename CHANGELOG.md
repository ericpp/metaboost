# Changelog

## v0.2.0 - Major Simplification (2025-11-08)

### 🎉 Major Changes

**Removed Legacy Formats**
- ❌ Deleted JPT (JSON Payment Token) format - overly complex JWT-like encoding
- ❌ Deleted TLV (Type-Length-Value) format - was never implemented
- ✅ Kept only simple metadata format with optional signatures

### 🗑️ Removed Files

- `lib/jpt.ts` - JWT-like token utilities (no longer needed)
- `lib/tlv.ts` - TLV utilities (was never used - 242 lines of orphaned code)
- `MIGRATION.md` - Migration guide from JPT format
- `public/simple-api.html` - Consolidated into single index.html documentation

### ✨ Improvements

- **Simpler API**: Only one format to learn - plain JSON metadata
- **Cleaner codebase**: Removed 500+ lines of unused/legacy code
- **Better documentation**: Focused on what actually works
- **Flexible signatures**: Optional cryptographic signatures with canonical JSON

### 📝 API Changes

**Before (v0.1.x)**:
```json
{
  "jpt": "eyJhbGci...complex_base64url_token",
  "type": "bitcoin-lightning"
}
```

**After (v0.2.0)**:
```json
{
  "type": "bitcoin-lightning",
  "metadata": {
    "payment_hash": "abc123",
    "amount_msat": "50000",
    // ... any fields you need
  },
  "signature": "optional_signature"
}
```

### 🔧 Updated Components

- `lib/types.ts` - Removed JPT types, simplified to metadata only
- `lib/utils.ts` - Removed JPT validation, simpler metadata validation
- `api/v1/payment-metadata/*` - All endpoints updated to use metadata only
- `public/index.html` - Consolidated single documentation page, removed TLV/JPT refs
- `README.md` - Updated to reflect simplified API
- All files - Fixed domain from metaboost.fm to metaboost.vercel.app

### ⚠️ Breaking Changes

This is a BREAKING change if you were using JPT format:
- JPT format is NO LONGER SUPPORTED
- You must migrate to simple metadata format
- See `SIGNATURE_GUIDE.md` if you need cryptographic signatures

### 📚 New Documentation

- `SIGNATURE_GUIDE.md` - Comprehensive guide for signing/verifying metadata
- `lib/signature-utils.ts` - Canonical JSON utilities for signatures
- `CLEANUP_NOTES.md` - Details of cleanup process

### 🎯 Focus

The API now focuses on what matters:
- ✅ Store payment data as simple JSON
- ✅ Optional cryptographic signatures for verification
- ✅ Flexible - add any custom fields you need
- ✅ Simple - no complex encoding or legacy formats

---

## v0.1.0 - Initial Release

- Basic payment metadata storage
- JPT format support (later removed in v0.2.0)
- Redis backend
- REST API endpoints

