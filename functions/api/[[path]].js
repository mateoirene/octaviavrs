import { handleMarketRequest } from '../../server/market.mjs';
export async function onRequest(context) {
  return handleMarketRequest(context.request, context.env, context);
}
