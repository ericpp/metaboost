import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../../lib/storage.js';
import type { PaymentMetadata } from '../../../lib/types.js';
import { sendError, sendSuccess, isValidUUID } from '../../../lib/utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  if (req.method === 'DELETE') {
    return handleDelete(req, res);
  }

  return sendError(res, 405, 'Method not allowed');
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query;

    // Validate ID
    if (!id || typeof id !== 'string') {
      return sendError(res, 400, 'Invalid ID supplied');
    }

    if (!isValidUUID(id)) {
      return sendError(res, 400, 'Invalid ID supplied');
    }

    // Find metadata
    const metadata = await storage.findById(id);

    if (!metadata) {
      return sendError(res, 404, 'Payment metadata not found');
    }

    // Return only public fields (without updateToken)
    const response: PaymentMetadata = {
      id: metadata.id,
      jpt: metadata.jpt,
      type: metadata.type,
      podcastGuid: metadata.podcastGuid,
      rssItemGuid: metadata.rssItemGuid
    };

    return sendSuccess(res, response, 200);
  } catch (error) {
    console.error('Error in GET handler:', error);
    return sendError(res, 500, 'Internal server error');
  }
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  try {
    const { id, updateToken } = req.query;

    // Validate ID
    if (!id || typeof id !== 'string') {
      return sendError(res, 400, 'Invalid payment-metadata id');
    }

    if (!isValidUUID(id)) {
      return sendError(res, 400, 'Invalid payment-metadata id');
    }

    // Validate updateToken
    if (!updateToken || typeof updateToken !== 'string' || !isValidUUID(updateToken)) {
      return sendError(res, 400, 'Valid updateToken query parameter is required');
    }

    // Check if metadata exists
    const metadata = await storage.findById(id);
    if (!metadata) {
      return sendError(res, 404, 'Payment metadata not found');
    }

    // Validate updateToken
    const isValidToken = await storage.validateUpdateToken(id, updateToken);
    if (!isValidToken) {
      return sendError(res, 400, 'Invalid updateToken');
    }

    // Delete metadata
    await storage.delete(id);

    return res.status(201).json({ message: 'Payment metadata deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE handler:', error);
    return sendError(res, 500, 'Internal server error');
  }
}

