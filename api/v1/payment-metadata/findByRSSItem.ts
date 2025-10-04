import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../../lib/storage.js';
import type { PaymentMetadata } from '../../../lib/types.js';
import { sendError, sendSuccess } from '../../../lib/utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed');
  }

  try {
    const { podcastGuid, rssItemGuid } = req.query;

    // Validate required parameters
    if (!podcastGuid || typeof podcastGuid !== 'string') {
      return sendError(res, 400, 'podcastGuid query parameter is required');
    }

    if (!rssItemGuid || typeof rssItemGuid !== 'string') {
      return sendError(res, 400, 'rssItemGuid query parameter is required');
    }

    // Find metadata
    const results = await storage.findByRSSItem(podcastGuid, rssItemGuid);

    if (results.length === 0) {
      return sendError(res, 404, 'RSS Item not found');
    }

    // Return only public fields (without updateToken)
    const response: PaymentMetadata[] = results.map(item => ({
      id: item.id,
      jpt: item.jpt,
      type: item.type,
      podcastGuid: item.podcastGuid,
      rssItemGuid: item.rssItemGuid
    }));

    return sendSuccess(res, response, 200);
  } catch (error) {
    console.error('Error in findByRSSItem handler:', error);
    return sendError(res, 500, 'Internal server error');
  }
}

