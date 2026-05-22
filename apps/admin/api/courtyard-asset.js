import {
  fetchCourtyardAsset,
  fetchOpenSeaCourtyardAsset,
  parseCourtyardAssetId,
  parseOpenSeaCourtyardListing,
} from '../server/lib/courtyard.js';

export default async function handler(request, response) {
  try {
    const input = request.query?.url || request.query?.assetId;
    let assetId;
    try {
      assetId = parseCourtyardAssetId(input);
    } catch (parseError) {
      if (String(input ?? '').includes('courtyard.io/asset/')) throw parseError;
      parseOpenSeaCourtyardListing(input);
      const asset = await fetchOpenSeaCourtyardAsset({ input });
      response.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
      response.status(200).json(asset);
      return;
    }
    const asset = await fetchCourtyardAsset(assetId);
    response.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    response.status(200).json(asset);
    return;
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'Unable to resolve Courtyard asset' });
  }
}
