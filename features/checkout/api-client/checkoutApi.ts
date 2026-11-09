import { RawTrackingParams } from "../tracking/utm";

export interface CreateCheckoutInput {
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  utm?: RawTrackingParams;
  retry?: boolean;
}

export interface CheckoutApiResponse {
  transactionId: string;
  amountCents: number;
  pixCode: string;
  qrCodeBase64?: string;
  expiresAt: string;
  status: "pending" | "paid" | "expired" | "failed";
}

export interface StatusApiResponse {
  status: "pending" | "paid" | "expired" | "failed";
  expiresAt: string;
  redirectUrl?: string;
  amountCents?: number;
  pixCode?: string;
  qrCodeBase64?: string;
}

export interface ApiError {
  type: "COMMUNICATION_ERROR" | "GENERATION_ERROR" | "VALIDATION_ERROR" | "RATE_LIMIT" | "UNKNOWN";
  message: string;
  fieldErrors?: Record<string, string>;
}

export async function createCheckoutPix(input: CreateCheckoutInput): Promise<CheckoutApiResponse> {
  let response: Response;
  try {
    response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch {
    const err: ApiError = {
      type: "COMMUNICATION_ERROR",
      message: "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
    };
    throw err;
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 429) {
    const err: ApiError = {
      type: "RATE_LIMIT",
      message: data.error || "Muitas tentativas. Aguarde um instante.",
    };
    throw err;
  }

  if (response.status === 422) {
    const err: ApiError = {
      type: "VALIDATION_ERROR",
      message: "Por favor, confira os dados informados.",
      fieldErrors: data.fieldErrors,
    };
    throw err;
  }

  if (response.status === 502 || data.type === "GENERATION_ERROR") {
    const err: ApiError = {
      type: "GENERATION_ERROR",
      message: "Não foi possível gerar seu PIX. Confira seus dados e tente novamente.",
    };
    throw err;
  }

  if (response.status === 503 || data.type === "COMMUNICATION_ERROR") {
    const err: ApiError = {
      type: "COMMUNICATION_ERROR",
      message: "Sem conexão com o gateway. Verifique sua conexão e tente novamente.",
    };
    throw err;
  }

  if (!response.ok) {
    const err: ApiError = {
      type: "UNKNOWN",
      message: data.error || "Ocorreu um erro ao gerar o pagamento. Tente novamente.",
    };
    throw err;
  }

  return data as CheckoutApiResponse;
}

export async function checkCheckoutStatus(transactionId: string): Promise<StatusApiResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/checkout/status?tid=${encodeURIComponent(transactionId)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    const err: ApiError = {
      type: "COMMUNICATION_ERROR",
      message: "Falha temporária ao consultar status.",
    };
    throw err;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Erro ao consultar status");
  }

  return data as StatusApiResponse;
}
