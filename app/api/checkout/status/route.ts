import { NextRequest, NextResponse } from "next/server";
import { getTransactionStore, Transaction } from "@/server/transactions/store";
import { getBuckpayStatusByExternalId } from "@/server/payments/buckpay";
import { checkRateLimit, getClientIp } from "@/server/security/rateLimit";

export const runtime = "nodejs";

// Cache curto no servidor para respeitar a regra de no máximo 1 consulta a cada 3s por transação
const statusCheckCache = new Map<string, { timestamp: number; status: string }>();

function buildRedirectUrl(tx: Transaction): string {
  const baseUpsell = process.env.UPSELL_URL || "https://esquemasplacas.lovable.app/upsell";
  const url = new URL(baseUpsell);

  url.searchParams.set("transaction_id", tx.id);

  const trackingKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_id",
    "utm_term",
    "utm_content",
    "ref",
    "src",
    "sck",
  ];

  for (const key of trackingKeys) {
    const val = tx.tracking?.[key];
    if (val && typeof val === "string" && val.trim() !== "") {
      url.searchParams.set(key, val.trim());
    }
  }

  return url.toString();
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const tid = searchParams.get("tid");

  if (!tid || typeof tid !== "string" || tid.length < 8) {
    return NextResponse.json({ error: "Identificador de transação ausente ou inválido." }, { status: 400 });
  }

  // Rate limit por IP + tid
  const ip = getClientIp(req.headers);
  const rateKey = `rl:status:${ip}:${tid}`;
  if (!checkRateLimit(rateKey, 40, 60000)) {
    return NextResponse.json(
      { error: "Muitas consultas simultâneas. Aguarde." },
      { status: 429 }
    );
  }

  const store = getTransactionStore();
  const tx = await store.getTransaction(tid);

  if (!tx) {
    return NextResponse.json({ error: "Transação não encontrada." }, { status: 404 });
  }

  // 1. Se já está paga no store -> responde imediatamente paid + redirectUrl (idempotente)
  if (tx.status === "paid") {
    const redirectUrl = buildRedirectUrl(tx);
    return NextResponse.json(
      {
        status: "paid",
        expiresAt: tx.expiresAt,
        redirectUrl,
      },
      { status: 200 }
    );
  }

  // 2. Se já expirou pelo tempo
  const now = new Date();
  const expiresAtDate = new Date(tx.expiresAt);
  if (now > expiresAtDate && tx.status === "pending") {
    await store.markStatus(tx.id, "expired");
    return NextResponse.json(
      {
        status: "expired",
        expiresAt: tx.expiresAt,
      },
      { status: 200 }
    );
  }

  // Se já está marcada como expired ou failed
  if (tx.status === "expired" || tx.status === "failed") {
    return NextResponse.json(
      {
        status: tx.status,
        expiresAt: tx.expiresAt,
      },
      { status: 200 }
    );
  }

  // 3. Status é pending: consultar a BuckPay com cache de 3s
  const cacheEntry = statusCheckCache.get(tx.externalId);
  const nowMs = Date.now();

  let buckpayStatus = cacheEntry?.status;

  if (!cacheEntry || nowMs - cacheEntry.timestamp >= 3000) {
    try {
      const result = await getBuckpayStatusByExternalId(tx.externalId);
      buckpayStatus = result.status;
      statusCheckCache.set(tx.externalId, {
        timestamp: nowMs,
        status: result.status,
      });
    } catch (err: any) {
      console.warn("[Status GET] Falha transitória ao consultar BuckPay:", err?.message || err);
      // Mantém pending se falhar a rede temporariamente
      buckpayStatus = "pending";
    }
  }

  // 4. Se a BuckPay respondeu paid, efetua transição atômica
  if (buckpayStatus === "paid") {
    const { paidNow, transaction: updatedTx } = await store.markPaidOnce(tx.id);
    const finalTx = updatedTx || tx;
    const redirectUrl = buildRedirectUrl(finalTx);

    return NextResponse.json(
      {
        status: "paid",
        expiresAt: finalTx.expiresAt,
        redirectUrl,
      },
      { status: 200 }
    );
  }

  if (buckpayStatus === "expired" || buckpayStatus === "failed") {
    await store.markStatus(tx.id, buckpayStatus as any);
    return NextResponse.json(
      {
        status: buckpayStatus,
        expiresAt: tx.expiresAt,
      },
      { status: 200 }
    );
  }

  // Retorno padrão para pending (inclui pixCode e qrCodeBase64 para retomada da sessão após recarregamento)
  return NextResponse.json(
    {
      status: "pending",
      expiresAt: tx.expiresAt,
      amountCents: tx.amountCents,
      pixCode: tx.pixCode,
      qrCodeBase64: tx.qrBase64,
    },
    { status: 200 }
  );
}
