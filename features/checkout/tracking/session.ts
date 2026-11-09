const SESSION_ID_KEY = "diaglava_session_id";
const TRANSACTION_ID_KEY = "diaglava_active_tid";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "srv_" + Math.random().toString(36).substring(2, 12);
  }

  let sid = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sid) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      sid = crypto.randomUUID();
    } else {
      sid = "sid_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 9);
    }
    sessionStorage.setItem(SESSION_ID_KEY, sid);
  }
  return sid;
}

export function saveActiveTransactionId(tid: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TRANSACTION_ID_KEY, tid);
}

export function getActiveTransactionId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TRANSACTION_ID_KEY);
}

export function clearActiveTransactionId(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TRANSACTION_ID_KEY);
}
