import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { loadConfig } from '../../config';

@Injectable()
export class RedisStore implements OnModuleInit, OnModuleDestroy {
  private readonly client = new Redis(loadConfig().REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') await this.client.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async put<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async remove(key: string): Promise<void> {
    await this.client.del(key);
  }

  async consume(key: string): Promise<boolean> {
    return (await this.client.del(key)) === 1;
  }

  async addToSet(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.sadd(key, value);
    await this.client.expire(key, ttlSeconds);
  }

  async members(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async removeFromSet(key: string, value: string): Promise<void> {
    await this.client.srem(key, value);
  }
}
