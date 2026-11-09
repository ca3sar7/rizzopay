export interface RawTrackingParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_id?: string;
  utm_term?: string;
  utm_content?: string;
  ref?: string;
  src?: string;
  sck?: string;
  xcod?: string;
}

export interface BuckpayTracking {
  ref: string;
  src: string;
  sck: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_id: string;
  utm_term: string;
  utm_content: string;
}

const STORAGE_KEY = "diaglava_utm_tracking";
const COOKIE_NAME = "diaglava_utm_tracking";

function sanitizeString(val: unknown, maxLen = 200): string {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, maxLen);
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function captureTrackingParams(searchParams?: URLSearchParams | null): RawTrackingParams {
  if (typeof window === "undefined") return {};

  const keys: (keyof RawTrackingParams)[] = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_id",
    "utm_term",
    "utm_content",
    "ref",
    "src",
    "sck",
    "xcod",
  ];

  // 1. Carregar persistência anterior (sessionStorage + cookie reserva)
  let saved: RawTrackingParams = {};
  try {
    const rawSession = sessionStorage.getItem(STORAGE_KEY);
    if (rawSession) {
      saved = JSON.parse(rawSession);
    } else {
      const rawCookie = getCookie(COOKIE_NAME);
      if (rawCookie) saved = JSON.parse(rawCookie);
    }
  } catch {
    saved = {};
  }

  // 2. Extrair da query string atual
  const params = searchParams || new URLSearchParams(window.location.search);
  const current: RawTrackingParams = {};

  for (const k of keys) {
    const queryVal = params.get(k);
    if (queryVal && queryVal.trim()) {
      current[k] = sanitizeString(queryVal);
    } else if (saved[k]) {
      // Preservar valor anterior se a query atual não tiver
      current[k] = saved[k];
    } else {
      current[k] = "";
    }
  }

  // 3. Salvar de volta
  try {
    const serialized = JSON.stringify(current);
    sessionStorage.setItem(STORAGE_KEY, serialized);
    setCookie(COOKIE_NAME, serialized, 7);
  } catch {
    // Silently ignore storage quota errors
  }

  return current;
}

/**
 * Converte parâmetros crus para o formato obrigatório da BuckPay (9 chaves).
 * Mapeamento da Seção 6.1:
 * - ref = ref || utm_source
 * - src = src || utm_source
 * - sck = sck || xcod
 * - demais utm_* diretas
 */
export function buildBuckpayTracking(params?: RawTrackingParams | null): BuckpayTracking {
  const p = params || {};
  const utm_source = sanitizeString(p.utm_source);
  const ref = sanitizeString(p.ref) || utm_source;
  const src = sanitizeString(p.src) || utm_source;
  const sck = sanitizeString(p.sck) || sanitizeString(p.xcod);

  return {
    ref,
    src,
    sck,
    utm_source,
    utm_medium: sanitizeString(p.utm_medium),
    utm_campaign: sanitizeString(p.utm_campaign),
    utm_id: sanitizeString(p.utm_id),
    utm_term: sanitizeString(p.utm_term),
    utm_content: sanitizeString(p.utm_content),
  };
}
