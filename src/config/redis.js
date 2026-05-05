import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false,
  lazyConnect: true,
});

redis.on("error", (err) => {
  // Don't crash if Redis is unavailable — degrade gracefully
  console.warn("Redis error:", err.message);
});

export default redis;
