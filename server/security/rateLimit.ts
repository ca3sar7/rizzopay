interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryLimits = new Map<string, RateLimitEntry>();

/**
 * Validador de rate-limit em janela deslizante/fixa
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memoryLimits.get(key);

  if (!entry || now > entry.resetAt) {
    memoryLimits.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true; // Permitido
  }

  if (entry.count < maxRequests) {
    entry.count += 1;
    return true; // Permitido
  }

  return false; // Bloqueado (429)
}

/**
 * Extrai IP do cliente a partir dos cabeçalhos da Vercel / proxy
 */
export function getClientIp(headers: Headers): string {
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  return "127.0.0.1";
}
