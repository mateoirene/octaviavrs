import { handleMarketRequest } from '../../server/market.mjs';
import { withPublicCache } from '../../server/public-cache.mjs';
import { isGarageSnapshotRead, readGarageSnapshot } from '../../server/garage-public-r2.mjs';
export async function onRequest(context) {
  if (context.env.GARAGE_PUBLIC_R2_READS === '1' && isGarageSnapshotRead(context.request)) {
    return readGarageSnapshot(context.request, context.env.GARAGE_PUBLIC_R2);
  }
  return withPublicCache(context.request, globalThis.caches?.default, () => handleMarketRequest(context.request, context.env, context));
}
