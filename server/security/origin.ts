/**
 * Validação de Origin para proteção contra Cross-Site Request Forgery em rotas POST
 */
export function validateRequestOrigin(request: Request): boolean {
  // Em ambiente de teste/dev ou SSR pode não haver origin explícito
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin) {
    // Se não há header origin, verificar referer
    const referer = request.headers.get("referer");
    if (!referer) return true; // Requisição direta do mesmo cliente
    try {
      const refUrl = new URL(referer);
      return refUrl.host === host;
    } catch {
      return false;
    }
  }

  try {
    const originUrl = new URL(origin);
    // Permite localhost em desenvolvimento
    if (process.env.NODE_ENV !== "production") {
      if (originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1") {
        return true;
      }
    }
    return originUrl.host === host;
  } catch {
    return false;
  }
}
