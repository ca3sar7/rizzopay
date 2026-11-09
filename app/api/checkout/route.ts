import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import {
  customerSchema,
  normalizePhoneForGateway,
} from "@/features/checkout/validation/customerSchema";
import { buildBuckpayTracking } from "@/features/checkout/tracking/utm";
import { createBuckpayPix } from "@/server/payments/buckpay";
import { getTransactionStore, Transaction } from "@/server/transactions/store";
import { checkRateLimit, getClientIp } from "@/server/security/rateLimit";
import { validateRequestOrigin } from "@/server/security/origin";

export const runtime = "nodejs";

const checkoutInputSchema = z.object({
  sessionId: z.string().min(5, "sessionId inválido"),
  name: customerSchema.shape.name,
  email: customerSchema.shape.email,
  phone: customerSchema.shape.phone,
  utm: z.record(z.string()).optional(),
  retry: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  // 1. Validar Origin
  if (!validateRequestOrigin(req)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  // 2. Rate limit por IP (máximo 5 criações por minuto)
  const ip = getClientIp(req.headers);
  const rateLimitKey = `rl:checkout:create:${ip}`;
  if (!checkRateLimit(rateLimitKey, 5, 60000)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 1 minuto para tentar novamente." },
      { status: 429 }
    );
  }

  // 3. Validação do corpo com Zod
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const parsed = checkoutInputSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString() || "form";
      fieldErrors[field] = issue.message;
    }
    return NextResponse.json(
      { error: "Dados inválidos", fieldErrors },
      { status: 422 }
    );
  }

  const { sessionId, name, email, phone, utm, retry } = parsed.data;
  const store = getTransactionStore();

  const amountCents = parseInt(process.env.PRODUCT_PRICE_CENTS || "3700", 10);
  const normalizedPhone = normalizePhoneForGateway(phone);
  const trackingObj = buildBuckpayTracking(utm);

  try {
    // 4. Verificar se já existe transação pending e não expirada para o sessionId
    const existingActive = await store.findActiveBySessionId(sessionId);
    if (existingActive) {
      // Se não for um retry forçado e os dados são consistentes, retorna a mesma transação
      if (!retry) {
        return NextResponse.json(
          {
            transactionId: existingActive.id,
            amountCents: existingActive.amountCents,
            pixCode: existingActive.pixCode,
            qrCodeBase64: existingActive.qrBase64,
            expiresAt: existingActive.expiresAt,
            status: existingActive.status,
          },
          { status: 200 }
        );
      }
    }

    // Determinar número da tentativa
    let attempt = 1;
    if (retry && existingActive) {
      attempt = (existingActive.attempt || 1) + 1;
    }

    const externalId = `${sessionId}_${amountCents}_${attempt}`;

    // 5. Chamada isolada à BuckPay
    const buckpayResult = await createBuckpayPix({
      externalId,
      amountCents,
      buyer: {
        name,
        email,
        phone: normalizedPhone,
      },
      tracking: trackingObj,
      metadata: {
        sessionId,
        attempt: String(attempt),
      },
    });

    // 6. Gravar transação no store
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      sessionId,
      attempt,
      externalId,
      gatewayId: buckpayResult.gatewayId,
      status: buckpayResult.status,
      amountCents,
      buyer: { name, email, phone: normalizedPhone },
      tracking: trackingObj as unknown as Record<string, string>,
      pixCode: buckpayResult.pixCode,
      qrBase64: buckpayResult.qrCodeBase64,
      createdAt: new Date().toISOString(),
      expiresAt: buckpayResult.expiresAt,
      expiresAtSource: buckpayResult.expiresAtSource,
    };

    await store.saveTransaction(newTx);

    // 7. Resposta somente com dados seguros
    return NextResponse.json(
      {
        transactionId: newTx.id,
        amountCents: newTx.amountCents,
        pixCode: newTx.pixCode,
        qrCodeBase64: newTx.qrBase64,
        expiresAt: newTx.expiresAt,
        status: newTx.status,
      },
      { status: 201 }
    );
  } catch (err: any) {
    const errMsg = err?.message || "";
    if (errMsg.startsWith("COMMUNICATION_ERROR")) {
      return NextResponse.json(
        {
          error: "Sem conexão com o gateway. Verifique sua internet ou tente novamente.",
          type: "COMMUNICATION_ERROR",
        },
        { status: 503 }
      );
    }

    if (errMsg.startsWith("GENERATION_ERROR")) {
      return NextResponse.json(
        {
          error: "Não foi possível gerar seu PIX. Confira seus dados e tente novamente.",
          type: "GENERATION_ERROR",
        },
        { status: 502 }
      );
    }

    console.error("[Checkout POST] Erro inesperado:", errMsg);
    return NextResponse.json(
      { error: "Erro interno ao processar checkout.", type: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
