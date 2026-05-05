// import redis from "../config/redis.js";
// import { normalizeFilter } from "../utils/normalizeFilter.js";

// const CACHE_TTL = 300; // 5 minutes

// // Build a deterministic cache key from the request
// function buildCacheKey(req) {
//   // Sort query params so ?gender=male&country=NG and ?country=NG&gender=male
//   // produce the same key
//   const sorted = Object.keys(req.query)
//     .sort()
//     .reduce((acc, k) => {
//       acc[k] = req.query[k];
//       return acc;
//     }, {});

//   return `profiles:${req.path}:${JSON.stringify(sorted)}`;
// }

// // Cache middleware — wraps read endpoints
// export function cacheMiddleware(req, res, next) {
//   // Skip cache for non-GET requests
//   if (req.method !== "GET") return next();

//   const key = buildCacheKey(req);
//   req.cacheKey = key;

//   redis
//     .get(key)
//     .then((cached) => {
//       if (cached) {
//         res.setHeader("X-Cache", "HIT");
//         return res.json(JSON.parse(cached));
//       }
//       res.setHeader("X-Cache", "MISS");

//       // Intercept res.json to store the response in cache
//       const originalJson = res.json.bind(res);
//       res.json = (data) => {
//         if (res.statusCode === 200) {
//           redis.setex(key, CACHE_TTL, JSON.stringify(data)).catch(() => {});
//         }
//         return originalJson(data);
//       };

//       next();
//     })
//     .catch(() => {
//       // Redis unavailable — serve without cache
//       next();
//     });
// }

// // Call this after writes to keep cache fresh
// export async function invalidateProfileCache() {
//   try {
//     const keys = await redis.keys("profiles:*");
//     if (keys.length > 0) {
//       await redis.del(...keys);
//     }
//   } catch {}
// }

import redis from "../config/redis.js";
import { normalizeFilter, filterToCacheKey } from "../utils/normalizeFilter.js";

const CACHE_TTL = 300;

export function cacheMiddleware(req, res, next) {
  if (req.method !== "GET") return next();

  // Normalize query params before building cache key
  const normalized = normalizeFilter(req.query);
  const key = `profiles:${req.path}:${filterToCacheKey(normalized)}`;
  req.cacheKey = key;
  req.normalized = normalized; // controllers can use this

  redis
    .get(key)
    .then((cached) => {
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        return res.json(JSON.parse(cached));
      }
      res.setHeader("X-Cache", "MISS");

      const originalJson = res.json.bind(res);
      res.json = (data) => {
        if (res.statusCode === 200) {
          redis.setex(key, CACHE_TTL, JSON.stringify(data)).catch(() => {});
        }
        return originalJson(data);
      };

      next();
    })
    .catch(() => next());
}

export async function invalidateProfileCache() {
  try {
    const keys = await redis.keys("profiles:*");
    if (keys.length > 0) await redis.del(...keys);
  } catch {}
}
