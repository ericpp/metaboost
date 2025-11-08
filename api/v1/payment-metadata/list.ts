import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../../lib/storage.js';
import type { PaymentMetadata } from '../../../lib/types.js';
import { sendError, sendSuccess } from '../../../lib/utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed');
  }

  try {
    const { limit = '100', offset = '0' } = req.query;

    // Validate pagination parameters
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return sendError(res, 400, 'Invalid limit parameter (must be 1-1000)');
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      return sendError(res, 400, 'Invalid offset parameter (must be >= 0)');
    }

    // Get payments and total count
    const [payments, totalCount] = await Promise.all([
      storage.findAll(limitNum, offsetNum),
      storage.getTotalCount()
    ]);

    // Return only public fields (without updateToken)
    const response: PaymentMetadata[] = payments.map(item => ({
      id: item.id,
      type: item.type,
      metadata: item.metadata,
      signature: item.signature,
      podcastGuid: item.podcastGuid,
      rssItemGuid: item.rssItemGuid,
      createdAt: item.createdAt
    }));

    // Return paginated response
    return res.status(200).json({
      data: response,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: totalCount,
        hasMore: offsetNum + limitNum < totalCount
      }
    });
  } catch (error) {
    console.error('Error in list handler:', error);
    return sendError(res, 500, 'Internal server error');
  }
}
