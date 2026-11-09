import { Redis } from "@upstash/redis";

export interface TransactionBuyer {
  name: string;
  email: string;
  phone: string;
}

export type TransactionStatus = "pending" | "paid" | "expired" | "failed";

export interface Transaction {
  id: string; // Nosso UUID opaco
  sessionId: string;
  attempt: number;
  externalId: string;
  gatewayId: string;
  status: TransactionStatus;
  amountCents: number;
  buyer: TransactionBuyer;
  tracking: Record<string, string>;
  pixCode: string;
  qrBase64?: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  expiresAtSource?: "gateway" | "default";
  redirectedFlag?: boolean;
}

export interface TransactionStore {
  getTransaction(id: string): Promise<Transaction | null>;
  findActiveBySessionId(sessionId: string): Promise<Transaction | null>;
  findByExternalId(externalId: string): Promise<Transaction | null>;
  saveTransaction(tx: Transaction): Promise<Transaction>;
  markPaidOnce(id: string): Promise<{ paidNow: boolean; transaction: Transaction | null }>;
  markStatus(id: string, status: TransactionStatus): Promise<Transaction | null>;
}

// ==========================================
// 1. Implementação em Memória (Apenas Local)
// ==========================================
class MemoryTransactionStore implements TransactionStore {
  private transactions = new Map<string, Transaction>();
  private sessionIndex = new Map<string, string[]>(); // sessionId -> ids
  private externalIndex = new Map<string, string>(); // externalId -> id

  constructor() {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[AVISO CRÍTICO] MemoryTransactionStore instanciado em PRODUÇÃO! Configure UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN."
      );
    } else {
      console.info("[DEV] Usando MemoryTransactionStore para persistência local.");
    }
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    return this.transactions.get(id) || null;
  }

  async findActiveBySessionId(sessionId: string): Promise<Transaction | null> {
    const ids = this.sessionIndex.get(sessionId) || [];
    const now = new Date().toISOString();
    // Procura transação pendente e não expirada mais recente
    for (let i = ids.length - 1; i >= 0; i--) {
      const tx = this.transactions.get(ids[i]);
      if (tx && tx.status === "pending" && tx.expiresAt > now) {
        return tx;
      }
    }
    return null;
  }

  async findByExternalId(externalId: string): Promise<Transaction | null> {
    const id = this.externalIndex.get(externalId);
    if (!id) return null;
    return this.transactions.get(id) || null;
  }

  async saveTransaction(tx: Transaction): Promise<Transaction> {
    this.transactions.set(tx.id, { ...tx });
    this.externalIndex.set(tx.externalId, tx.id);

    const ids = this.sessionIndex.get(tx.sessionId) || [];
    if (!ids.includes(tx.id)) {
      ids.push(tx.id);
      this.sessionIndex.set(tx.sessionId, ids);
    }
    return tx;
  }

  async markPaidOnce(id: string): Promise<{ paidNow: boolean; transaction: Transaction | null }> {
    const tx = this.transactions.get(id);
    if (!tx) return { paidNow: false, transaction: null };

    if (tx.status === "paid") {
      return { paidNow: false, transaction: tx };
    }

    tx.status = "paid";
    tx.paidAt = new Date().toISOString();
    this.transactions.set(id, tx);
    return { paidNow: true, transaction: tx };
  }

  async markStatus(id: string, status: TransactionStatus): Promise<Transaction | null> {
    const tx = this.transactions.get(id);
    if (!tx) return null;
    tx.status = status;
    this.transactions.set(id, tx);
    return tx;
  }
}

// ==========================================
// 2. Implementação Upstash Redis (Produção)
// ==========================================
class UpstashRedisTransactionStore implements TransactionStore {
  private redis: Redis;

  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    const raw = await this.redis.get<Transaction>(`tx:${id}`);
    return raw || null;
  }

  async findActiveBySessionId(sessionId: string): Promise<Transaction | null> {
    const activeId = await this.redis.get<string>(`session_active:${sessionId}`);
    if (!activeId) return null;
    const tx = await this.getTransaction(activeId);
    if (!tx) return null;

    const now = new Date().toISOString();
    if (tx.status === "pending" && tx.expiresAt > now) {
      return tx;
    }
    return null;
  }

  async findByExternalId(externalId: string): Promise<Transaction | null> {
    const txId = await this.redis.get<string>(`ext:${externalId}`);
    if (!txId) return null;
    return this.getTransaction(txId);
  }

  async saveTransaction(tx: Transaction): Promise<Transaction> {
    const ttlSeconds = Math.max(3600, 86400 * 7); // Guarda por 7 dias
    await Promise.all([
      this.redis.set(`tx:${tx.id}`, tx, { ex: ttlSeconds }),
      this.redis.set(`ext:${tx.externalId}`, tx.id, { ex: ttlSeconds }),
      this.redis.set(`session_active:${tx.sessionId}`, tx.id, { ex: 3600 }),
    ]);
    return tx;
  }

  async markPaidOnce(id: string): Promise<{ paidNow: boolean; transaction: Transaction | null }> {
    // Operação atômica via lock / setnx
    const lockKey = `lock:paid:${id}`;
    const acquired = await this.redis.set(lockKey, "1", { nx: true, ex: 60 });

    const tx = await this.getTransaction(id);
    if (!tx) {
      if (acquired) await this.redis.del(lockKey);
      return { paidNow: false, transaction: null };
    }

    if (tx.status === "paid") {
      return { paidNow: false, transaction: tx };
    }

    if (acquired) {
      tx.status = "paid";
      tx.paidAt = new Date().toISOString();
      await this.saveTransaction(tx);
      return { paidNow: true, transaction: tx };
    }

    // Outro processo concorrente já pegou o lock; aguarda brevemente e relê
    await new Promise((r) => setTimeout(r, 150));
    const reloaded = await this.getTransaction(id);
    return { paidNow: false, transaction: reloaded };
  }

  async markStatus(id: string, status: TransactionStatus): Promise<Transaction | null> {
    const tx = await this.getTransaction(id);
    if (!tx) return null;
    tx.status = status;
    await this.saveTransaction(tx);
    return tx;
  }
}

// Singleton global para gerenciar o store
let storeInstance: TransactionStore | null = null;

export function getTransactionStore(): TransactionStore {
  if (storeInstance) return storeInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token && !url.includes("example")) {
    storeInstance = new UpstashRedisTransactionStore(url, token);
  } else {
    storeInstance = new MemoryTransactionStore();
  }

  return storeInstance;
}
