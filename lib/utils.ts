import { VercelRequest, VercelResponse } from '@vercel/node';
import { PaymentType } from './types.js';

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
  // Validate payment type (always required)
  if (!body.type || !isValidPaymentType(body.type)) {
    return { valid: false, error: 'type is required and must be either "bitcoin-lightning" or "monero"' };
  }
  
  // Validate metadata is provided and is an object
  if (!body.metadata) {
    return { valid: false, error: 'metadata is required' };
  }
  
  if (typeof body.metadata !== 'object' || body.metadata === null || Array.isArray(body.metadata)) {
    return { valid: false, error: 'metadata must be an object' };
  }
  
  // Validate optional signature
  if (body.signature !== undefined && typeof body.signature !== 'string') {
    return { valid: false, error: 'signature must be a string' };
  }
  
  // Validate optional query fields
  if (body.podcastGuid !== undefined && typeof body.podcastGuid !== 'string') {
    return { valid: false, error: 'podcastGuid must be a string' };
  }
  
  if (body.rssItemGuid !== undefined && typeof body.rssItemGuid !== 'string') {
    return { valid: false, error: 'rssItemGuid must be a string' };
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
  
  // Validate payment type (always required)
  if (!body.type || !isValidPaymentType(body.type)) {
    return { valid: false, error: 'type is required and must be either "bitcoin-lightning" or "monero"' };
  }
  
  // Validate metadata is provided and is an object
  if (!body.metadata) {
    return { valid: false, error: 'metadata is required' };
  }
  
  if (typeof body.metadata !== 'object' || body.metadata === null || Array.isArray(body.metadata)) {
    return { valid: false, error: 'metadata must be an object' };
  }
  
  // Validate optional signature
  if (body.signature !== undefined && typeof body.signature !== 'string') {
    return { valid: false, error: 'signature must be a string' };
  }
  
  return { valid: true };
}

