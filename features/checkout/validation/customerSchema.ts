import { z } from "zod";

// Lista oficial de DDDs válidos no Brasil
const VALID_DDDS = new Set([
  // SP
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  // RJ / ES
  "21", "22", "24", "27", "28",
  // MG
  "31", "32", "33", "34", "35", "37", "38",
  // PR / SC
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  // RS
  "51", "53", "54", "55",
  // DF / GO / TO / MT / MS
  "61", "62", "64", "63", "65", "66", "67",
  // BA / SE
  "71", "73", "74", "75", "77", "79",
  // PE / AL / PB / RN
  "81", "87", "82", "83", "84",
  // CE / PI / MA / PA / AP / AM / RR / AC / RO
  "85", "88", "86", "89", "98", "99", "91", "93", "94", "96", "92", "97", "95", "68", "69"
]);

export function cleanPhoneDigits(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function isValidFullName(name: string): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;
  // Cada palavra precisa ter pelo menos 2 letras (aceita acentos unicode)
  return parts.every((part) => /^[\p{L}]{2,}$/u.test(part));
}

export function isValidBrazilianPhone(raw: string): boolean {
  const digits = cleanPhoneDigits(raw);
  if (digits.length !== 10 && digits.length !== 11) return false;

  const ddd = digits.slice(0, 2);
  if (!VALID_DDDS.has(ddd)) return false;

  if (digits.length === 11) {
    // Celular de 11 dígitos precisa começar com o nono dígito 9
    if (digits[2] !== "9") return false;
  }

  // Evitar sequências repetidas inválidas como 11111111111
  const allSame = digits.split("").every((d) => d === digits[0]);
  if (allSame) return false;

  return true;
}

export function normalizePhoneForGateway(raw: string): string {
  const digits = cleanPhoneDigits(raw);
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  return `55${digits}`;
}

export const customerSchema = z.object({
  name: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => isValidFullName(val), {
      message: "Informe seu nome e sobrenome completo.",
    }),
  email: z
    .string()
    .transform((val) => val.trim().toLowerCase())
    .pipe(
      z.string().email({
        message: "Confira o e-mail digitado.",
      })
    ),
  phone: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => isValidBrazilianPhone(val), {
      message: "Informe o telefone com DDD válido.",
    }),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
