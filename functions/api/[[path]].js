import { handleMarketRequest } from '../../server/market.mjs';
import { withPublicCache } from '../../server/public-cache.mjs';
export async function onRequest(context) {
  return withPublicCache(context.request, globalThis.caches?.default, () => handleMarketRequest(context.request, context.env, context));
}
