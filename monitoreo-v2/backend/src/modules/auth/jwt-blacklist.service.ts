import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * JWT access token blacklist backed by Redis.
 * When REDIS_URL is not set, falls back to in-memory Set (single-instance only).
 *
 * Tokens are blacklisted on logout and password change.
 * TTL matches the access token lifetime (15 min) — no need to store longer.
 */
@Injectable()
export class JwtBlacklistService implements OnModuleDestroy {
  private readonly logger = new Logger(JwtBlacklistService.name);
  private readonly redis: Redis | null;
  private readonly memoryStore = new Set<string>();
  private static readonly PREFIX = 'jwt:bl:';
  private static readonly TTL_SECONDS = 15 * 60; // match access token TTL

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 2, lazyConnect: true });
      this.redis.connect().catch((err) => {
        this.logger.warn(`Redis connect failed (blacklist will use memory): ${err.message}`);
      });
    } else {
      this.redis = null;
      this.logger.warn('REDIS_URL not set — JWT blacklist using in-memory store (single instance only)');
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit();
  }

  /**
   * Blacklist a JWT by its unique identifier (jti or sub+iat combo).
   */
  async add(tokenKey: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.setex(`${JwtBlacklistService.PREFIX}${tokenKey}`, JwtBlacklistService.TTL_SECONDS, '1');
        return;
      } catch {
        // fallback to memory on Redis failure
      }
    }
    this.memoryStore.add(tokenKey);
    // Auto-cleanup after TTL
    setTimeout(() => this.memoryStore.delete(tokenKey), JwtBlacklistService.TTL_SECONDS * 1000);
  }

  /**
   * Check if a token is blacklisted.
   */
  async isBlacklisted(tokenKey: string): Promise<boolean> {
    if (this.redis) {
      try {
        return (await this.redis.exists(`${JwtBlacklistService.PREFIX}${tokenKey}`)) === 1;
      } catch {
        // fallback to memory
      }
    }
    return this.memoryStore.has(tokenKey);
  }

  /**
   * Blacklist all tokens for a user issued before now.
   * Uses user:<userId> key with current timestamp — any token with iat < this value is rejected.
   */
  async blacklistUser(userId: string): Promise<void> {
    const key = `${JwtBlacklistService.PREFIX}user:${userId}`;
    const now = Math.floor(Date.now() / 1000);
    if (this.redis) {
      try {
        // TTL = refresh token max lifetime (7 days) to cover all outstanding access tokens
        await this.redis.setex(key, 7 * 24 * 3600, String(now));
        return;
      } catch {
        // fallback
      }
    }
    this.memoryStore.add(`user:${userId}:${now}`);
  }

  /**
   * Check if a user's tokens issued at `iat` are blacklisted.
   */
  async isUserBlacklisted(userId: string, iat: number): Promise<boolean> {
    const key = `${JwtBlacklistService.PREFIX}user:${userId}`;
    if (this.redis) {
      try {
        const val = await this.redis.get(key);
        if (val && iat <= Number(val)) return true;
        return false;
      } catch {
        // fallback
      }
    }
    // Memory fallback: check any entry matching this user
    for (const entry of this.memoryStore) {
      if (entry.startsWith(`user:${userId}:`)) {
        const ts = Number(entry.split(':')[2]);
        if (iat <= ts) return true;
      }
    }
    return false;
  }
}
