import { VercelRequest, VercelResponse } from '@vercel/node';
import { PaymentType } from './types.js';
import { validateJPT } from './jpt.js';

export function sendError(res: VercelResponse, status: number, message: string) {
  return res.status(status).json({ error: message });
}

export function sendSuccess(res: VercelResponse, data: any, status: number = 200) {
  return res.status(status).json(data);
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function isValidPaymentType(type: string): type is PaymentType {
  return Object.values(PaymentType).includes(type as PaymentType);
}

export function validatePaymentMetadataNew(body: any): { valid: boolean; error?: string } {
  // Validate JPT
  if (!body.jpt) {
    return { valid: false, error: 'jpt is required' };
  }

  // JPT can be a string (encoded) or object (decoded)
  if (typeof body.jpt !== 'string' && typeof body.jpt !== 'object') {
    return { valid: false, error: 'jpt must be a string or object' };
  }

  // Validate JPT structure
  const jptValidation = validateJPT(body.jpt);
  if (!jptValidation.valid) {
    return { valid: false, error: `Invalid JPT: ${jptValidation.error}` };
  }
  
  // Validate payment type
  if (!body.type || !isValidPaymentType(body.type)) {
    return { valid: false, error: 'type is required and must be either "bitcoin-lightning" or "monero"' };
  }
  
  return { valid: true };
}

export function validatePaymentMetadataUpdate(body: any): { valid: boolean; error?: string } {
  if (!body.id || !isValidUUID(body.id)) {
    return { valid: false, error: 'id is required and must be a valid UUID' };
  }
  
  if (!body.updateToken || !isValidUUID(body.updateToken)) {
    return { valid: false, error: 'updateToken is required and must be a valid UUID' };
  }
  
  // Validate JPT
  if (!body.jpt) {
    return { valid: false, error: 'jpt is required' };
  }

  // JPT can be a string (encoded) or object (decoded)
  if (typeof body.jpt !== 'string' && typeof body.jpt !== 'object') {
    return { valid: false, error: 'jpt must be a string or object' };
  }

  // Validate JPT structure
  const jptValidation = validateJPT(body.jpt);
  if (!jptValidation.valid) {
    return { valid: false, error: `Invalid JPT: ${jptValidation.error}` };
  }
  
  // Validate payment type
  if (!body.type || !isValidPaymentType(body.type)) {
    return { valid: false, error: 'type is required and must be either "bitcoin-lightning" or "monero"' };
  }
  
  return { valid: true };
}

