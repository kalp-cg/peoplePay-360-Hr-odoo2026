import api from '../api/client';

const cache = new Map();
const TTL = 30000; // 30 seconds cache

export async function fetchCachedMetadata(endpoint) {
  const now = Date.now();
  const cached = cache.get(endpoint);
  if (cached && now - cached.timestamp < TTL) {
    return cached.data;
  }

  const promise = api.get(endpoint).then((res) => {
    cache.set(endpoint, { timestamp: Date.now(), data: res.data });
    return res.data;
  }).catch(err => {
    cache.delete(endpoint);
    throw err;
  });

  return promise;
}

export function invalidateMetadataCache(endpoint) {
  if (endpoint) {
    cache.delete(endpoint);
  } else {
    cache.clear();
  }
}
