import "dotenv/config";
import IORedis from "ioredis";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export interface QueueConnectionOptions {
  url: string;
  maxRetriesPerRequest: null;
}

/**
 * BullMQ's Queue/Worker construct and own their Redis connections from these options -- do not
 * pass a shared ioredis instance to multiple BullMQ components (each needs blocking-command
 * control that a shared instance would contend on).
 */
export function getQueueConnectionOptions(): QueueConnectionOptions {
  return { url: requireEnv("REDIS_URL"), maxRetriesPerRequest: null };
}

/**
 * A standalone Redis connection for direct pub/sub (cross-process run cancellation,
 * `queue.tokens.ts`'s `runCancelChannel`) -- deliberately separate from any BullMQ-managed
 * connection, since a subscriber connection cannot issue other commands.
 */
export function createRedisConnection(): IORedis {
  return new IORedis(requireEnv("REDIS_URL"), { maxRetriesPerRequest: null });
}
