export const hasRoomStorage = () => Boolean(
 process.env.REDIS_URL ||
 ((process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
  (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN))
);
