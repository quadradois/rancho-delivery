import { logger } from '../config/logger';

export interface CachedMessage {
  origem: 'HUMANO' | 'IA';
  texto: string;
}

const TTL_PADRAO = 6 * 60 * 60; // 6 horas em segundos

// Tentativa de carregar ioredis dinamicamente (pode não estar instalado)
let Redis: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Redis = require('ioredis');
} catch {
  // ioredis não disponível — usar Map fallback
}

class ConversationCache {
  private redis: any = null;
  private map = new Map<string, { msgs: CachedMessage[]; expireAt: number }>();
  private pronto = false;

  constructor() {
    this.conectar();
  }

  private conectar() {
    if (!Redis) {
      logger.info('cache.ts: ioredis não disponível, usando Map em memória');
      this.pronto = true;
      return;
    }

    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 2000,
      });

      this.redis.on('ready', () => {
        logger.info('cache.ts: Redis conectado');
        this.pronto = true;
      });

      this.redis.on('error', (err: Error) => {
        if (this.pronto) {
          logger.warn('cache.ts: Redis erro — fallback para Map:', err.message);
        }
        this.redis = null;
      });

      this.redis.connect().catch(() => {
        this.redis = null;
        this.pronto = true;
      });
    } catch {
      this.redis = null;
      this.pronto = true;
    }
  }

  async getHistory(key: string): Promise<CachedMessage[]> {
    if (this.redis) {
      try {
        const raw = await this.redis.get(`conv:${key}`);
        if (raw) return JSON.parse(raw) as CachedMessage[];
        return [];
      } catch {
        // fallthrough para Map
      }
    }

    const entry = this.map.get(key);
    if (!entry || Date.now() > entry.expireAt) {
      this.map.delete(key);
      return [];
    }
    return entry.msgs;
  }

  async setHistory(key: string, msgs: CachedMessage[], ttl = TTL_PADRAO): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.set(`conv:${key}`, JSON.stringify(msgs), 'EX', ttl);
        return;
      } catch {
        // fallthrough para Map
      }
    }

    this.map.set(key, { msgs, expireAt: Date.now() + ttl * 1000 });
    // Limpeza passiva: remover entradas expiradas quando o map fica grande
    if (this.map.size > 500) {
      const agora = Date.now();
      for (const [k, v] of this.map) {
        if (agora > v.expireAt) this.map.delete(k);
      }
    }
  }

  async clearHistory(key: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(`conv:${key}`);
      } catch { /* noop */ }
    }
    this.map.delete(key);
  }

  estaUsandoRedis(): boolean {
    return this.redis !== null;
  }
}

export const conversationCache = new ConversationCache();
