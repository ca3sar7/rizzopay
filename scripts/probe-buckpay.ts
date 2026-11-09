import fs from "node:fs";
import path from "node:path";

function loadEnvFile(envPath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return env;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

async function runProbe() {
  const envFromDisk = loadEnvFile(path.resolve(process.cwd(), ".env"));
  const token = process.env.BUCKPAY_TOKEN || envFromDisk.BUCKPAY_TOKEN;
  const baseUrl = (process.env.BUCKPAY_BASE_URL || envFromDisk.BUCKPAY_BASE_URL || "https://api.realtechdev.com.br").replace(/\/$/, "");

  if (!token) {
    console.error("ERRO: BUCKPAY_TOKEN não configurado no .env");
    process.exit(1);
  }

  const probeExternalId = `probe_${Date.now()}_3700_1`;
  const payload = {
    payment_method: "pix",
    amount: 3700,
    external_id: probeExternalId,
    buyer: {
      name: "Probe Teste Sem Documento",
      email: "probe.teste@exemplo.com.br",
      phone: "5511999998888"
      // NOTA: chave "document" propositalmente omitida para validar aceitação da API BuckPay
    },
    tracking: {
      ref: "",
      src: "",
      sck: "",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_id: "",
      utm_term: "",
      utm_content: ""
    },
    metadata: {
      product: "DiagLava - Conserto na Palma da Mão",
      probe: "document_field_verification"
    }
  };

  console.log("Iniciando requisição de teste para BuckPay (sem campo document)...");
  console.log(`Endpoint: ${baseUrl}/v1/transactions`);
  console.log(`External ID: ${probeExternalId}`);

  try {
    const response = await fetch(`${baseUrl}/v1/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
        "User-Agent": "Buckpay API"
      },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const rawText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    console.log(`HTTP Status: ${status}`);

    if (status === 201 || (status === 200 && data?.data?.id)) {
      console.log("SUCESSO: BuckPay aceitou a transação SEM a chave document!");
      console.log("Transaction ID retornado:", data?.data?.id);
      console.log("Status retornado:", data?.data?.status);
      console.log("PIX gerado com sucesso:", !!data?.data?.pix?.code);
    } else {
      console.log("RESPOSTA DE REJEIÇÃO / ERRO:");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.error("Erro na chamada de rede:", err?.message || err);
  }
}

runProbe();
