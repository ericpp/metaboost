import { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../../../lib/storage.js';
import type { 
  PaymentMetadataNew, 
  PaymentMetadataUpdate, 
  PaymentMetadataResponse,
  StoredPaymentMetadata
} from '../../../lib/types.js';
import { 
  sendError, 
  sendSuccess, 
  validatePaymentMetadataNew,
  validatePaymentMetadataUpdate,
  isValidUUID
} from '../../../lib/utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    return handlePost(req, res);
  }

  if (req.method === 'PUT') {
    return handlePut(req, res);
  }

  return sendError(res, 405, 'Method not allowed');
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    const body = req.body as PaymentMetadataNew;

    // Validate input
    const validation = validatePaymentMetadataNew(body);
    if (!validation.valid) {
      return sendError(res, 400, validation.error || 'Invalid input');
    }

    // Generate IDs
    const id = uuidv4();
    const updateToken = uuidv4();

    // Create metadata
    const metadata: StoredPaymentMetadata = {
      id,
      jpt: body.jpt,
      type: body.type,
      updateToken,
      podcastGuid: body.podcastGuid,
      rssItemGuid: body.rssItemGuid
    };

    // Store metadata
    await storage.create(metadata);

    // Return response
    const response: PaymentMetadataResponse = {
      id,
      updateToken
    };

    return sendSuccess(res, response, 200);
  } catch (error) {
    console.error('Error in POST handler:', error);
    return sendError(res, 422, 'Validation exception');
  }
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
  try {
    const { updateToken } = req.query;
    const body = req.body as PaymentMetadataUpdate;

    // Validate updateToken from query
    if (!updateToken || typeof updateToken !== 'string' || !isValidUUID(updateToken)) {
      return sendError(res, 400, 'Valid updateToken query parameter is required');
    }

    // Validate input
    const validation = validatePaymentMetadataUpdate(body);
    if (!validation.valid) {
      return sendError(res, 400, validation.error || 'Invalid input');
    }

    // Check if metadata exists
    const existingMetadata = await storage.findById(body.id);
    if (!existingMetadata) {
      return sendError(res, 404, 'Payment metadata not found');
    }

    // Validate updateToken
    const isValidToken = await storage.validateUpdateToken(body.id, updateToken);
    if (!isValidToken) {
      return sendError(res, 400, 'Invalid updateToken');
    }

    // Generate new updateToken
    const newUpdateToken = uuidv4();

    // Update metadata
    const updatedMetadata: StoredPaymentMetadata = {
      id: body.id,
      jpt: body.jpt,
      type: body.type,
      updateToken: newUpdateToken,
      podcastGuid: existingMetadata.podcastGuid,
      rssItemGuid: existingMetadata.rssItemGuid
    };

    await storage.update(updatedMetadata);

    // Return response
    const response: PaymentMetadataResponse = {
      id: body.id,
      updateToken: newUpdateToken
    };

    return sendSuccess(res, response, 200);
  } catch (error) {
    console.error('Error in PUT handler:', error);
    return sendError(res, 422, 'Validation exception');
  }
}

