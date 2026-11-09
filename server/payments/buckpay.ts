/**
 * Camada isolada de integração com a BuckPay.
 * Nenhum outro arquivo deve conhecer URL, token ou formato interno da BuckPay.
 */

export interface CreateBuckpayPixInput {
  externalId: string;
  amountCents: number;
  buyer: {
    name: string;
    email: string;
    phone: string; // formato 55DDDNUMERO
  };
  tracking: {
    ref: string;
    src: string;
    sck: string;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_id: string;
    utm_term: string;
    utm_content: string;
  };
  metadata?: Record<string, string>;
}

export interface BuckpayPixResult {
  gatewayId: string;
  status: "pending" | "paid" | "expired" | "failed";
  pixCode: string;
  qrCodeBase64?: string;
  expiresAt: string;
  expiresAtSource: "gateway" | "default";
}

export type NormalizedStatus = "pending" | "paid" | "expired" | "failed";

export function normalizeBuckpayStatus(rawStatus: string | undefined | null): NormalizedStatus {
  if (!rawStatus) return "pending";
  const s = rawStatus.toLowerCase().trim();

  // Status de Sucesso / Pago
  if (["paid", "approved", "completed", "success"].includes(s)) {
    return "paid";
  }

  // Status de Falha / Cancelado / Expirado
  if (["expired", "canceled", "cancelled", "failed", "refused"].includes(s)) {
    return "expired";
  }

  // Status Pendente e desconhecido
  if (["pending", "waiting_payment"].includes(s)) {
    return "pending";
  }

  // Se for desconhecido, loga com segurança e trata como pending
  console.warn(`[BuckPay] Status desconhecido retornado: "${s}". Tratando como pending.`);
  return "pending";
}

function getBuckpayHeaders(): HeadersInit {
  const token = process.env.BUCKPAY_TOKEN || "sk_live_e77fe478f994c90fb5951f6c396adfb6";
  if (!token) {
    throw new Error("BUCKPAY_TOKEN não configurado no servidor.");
  }
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "Buckpay API",
  };
}

function getBaseUrl(): string {
  const url = process.env.BUCKPAY_BASE_URL || "https://api.realtechdev.com.br";
  return url.replace(/\/$/, "");
}

function normalizeQrCodeBase64(rawQr?: string): string | undefined {
  if (!rawQr) return undefined;
  if (rawQr.startsWith("data:image/")) {
    return rawQr;
  }
  return `data:image/png;base64,${rawQr}`;
}

/**
 * Cria cobrança PIX na BuckPay
 */
export async function createBuckpayPix(
  input: CreateBuckpayPixInput,
  isRetry = false
): Promise<BuckpayPixResult> {
  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/v1/transactions`;

  // Sanitização rigorosa do telefone (DDI 55 + DDD + número >= 12 dígitos)
  const phoneDigits = (input.buyer.phone || "").replace(/\D/g, "");
  if (phoneDigits.length < 12) {
    throw new Error("Telefone inválido para envio ao gateway.");
  }

  const payload = {
    payment_method: "pix",
    amount: input.amountCents,
    external_id: input.externalId,
    buyer: {
      name: input.buyer.name,
      email: input.buyer.email,
      phone: phoneDigits,
      // Sem document (validado via probe-buckpay)
    },
    tracking: {
      ref: input.tracking.ref || "",
      src: input.tracking.src || "",
      sck: input.tracking.sck || "",
      utm_source: input.tracking.utm_source || "",
      utm_medium: input.tracking.utm_medium || "",
      utm_campaign: input.tracking.utm_campaign || "",
      utm_id: input.tracking.utm_id || "",
      utm_term: input.tracking.utm_term || "",
      utm_content: input.tracking.utm_content || "",
    },
    metadata: {
      product: process.env.PRODUCT_NAME || "DiagLava - Conserto na Palma da Mão",
      ...(input.metadata || {}),
    },
  };

  const executeFetch = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: getBuckpayHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      return res;
    } finally {
      clearTimeout(timeout);
    }
  };

  let response: Response;
  try {
    response = await executeFetch();
  } catch (err: any) {
    // 1 retry apenas para falha de rede/timeout se permitido
    if (!isRetry) {
      console.warn("[BuckPay] Falha de conexão inicial ao criar PIX. Tentando 1 retry...");
      try {
        response = await executeFetch();
      } catch (retryErr: any) {
        throw new Error("COMMUNICATION_ERROR: Falha de conexão com a BuckPay.");
      }
    } else {
      throw new Error("COMMUNICATION_ERROR: Falha de conexão com a BuckPay.");
    }
  }

  if (response.status >= 500 && !isRetry) {
    console.warn(`[BuckPay] Servidor respondeu ${response.status}. Tentando 1 retry...`);
    try {
      response = await executeFetch();
    } catch {
      throw new Error("COMMUNICATION_ERROR: Falha de conexão com a BuckPay no retry.");
    }
  }

  const rawText = await response.text();
  let json: any = {};
  try {
    json = JSON.parse(rawText);
  } catch {
    console.error("[BuckPay] Resposta não-JSON recebida.");
    throw new Error("GENERATION_ERROR: Resposta inválida do gateway.");
  }

  if (response.status !== 201 && response.status !== 200) {
    // Log seguro sem dados sensíveis
    console.error(`[BuckPay] Erro ${response.status} na criação da transação:`, json?.message || json?.error || "Desconhecido");
    throw new Error("GENERATION_ERROR: O gateway recusou a criação do PIX.");
  }

  const data = json?.data;
  if (!data?.id || !data?.pix?.code) {
    console.error("[BuckPay] Dados de PIX ausentes na resposta 201/200.");
    throw new Error("GENERATION_ERROR: PIX retornado incompleto pelo gateway.");
  }

  // Tratamento de expiração
  const defaultExpirySeconds = parseInt(process.env.PIX_EXPIRY_SECONDS || "900", 10);
  let expiresAt: string;
  let expiresAtSource: "gateway" | "default" = "default";

  if (data.expires_at || data.pix?.expires_at) {
    expiresAt = new Date(data.expires_at || data.pix.expires_at).toISOString();
    expiresAtSource = "gateway";
  } else {
    expiresAt = new Date(Date.now() + defaultExpirySeconds * 1000).toISOString();
    expiresAtSource = "default";
  }

  return {
    gatewayId: data.id,
    status: normalizeBuckpayStatus(data.status),
    pixCode: data.pix.code,
    qrCodeBase64: normalizeQrCodeBase64(data.pix.qrcode_base64),
    expiresAt,
    expiresAtSource,
  };
}

/**
 * Consulta status na BuckPay via external_id
 */
export async function getBuckpayStatusByExternalId(
  externalId: string
): Promise<{ status: NormalizedStatus; rawStatus: string }> {
  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/v1/transactions/external_id/${encodeURIComponent(externalId)}`;

  const headers = getBuckpayHeaders() as Record<string, string>;
  delete headers["Content-Type"];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    throw new Error("COMMUNICATION_ERROR: Falha de conexão ao consultar status.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    console.warn(`[BuckPay] Falha na consulta de status (${response.status}) para external_id ${externalId}`);
    return { status: "pending", rawStatus: `http_${response.status}` };
  }

  const rawText = await response.text();
  let json: any = {};
  try {
    json = JSON.parse(rawText);
  } catch {
    return { status: "pending", rawStatus: "unparseable" };
  }

  const rawStatus = json?.data?.status || "pending";
  return {
    status: normalizeBuckpayStatus(rawStatus),
    rawStatus,
  };
}
