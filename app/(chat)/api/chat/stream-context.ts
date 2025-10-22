import { env } from '@/lib/env';
import { after } from 'next/server';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';

let redisPublisher: any = null;
let redisSubscriber: any = null;

if (env.REDIS_URL) {
  (async () => {
    const redis = await import('redis');
    redisPublisher = redis.createClient({ url: env.REDIS_URL });
    redisSubscriber = redis.createClient({ url: env.REDIS_URL });
    await Promise.all([redisPublisher.connect(), redisSubscriber.connect()]);
  })().catch((error) => {
    console.error('Failed to initialize Redis clients for streams', error);
  });
}

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
        keyPrefix: 'sparka-ai:resumable-stream',
        ...(redisPublisher && redisSubscriber
          ? {
              publisher: redisPublisher,
              subscriber: redisSubscriber,
            }
          : {}),
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export function getRedisSubscriber() {
  return redisSubscriber;
}

export function getRedisPublisher() {
  return redisPublisher;
}
