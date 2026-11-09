const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.com.br": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmali.com": "hotmail.com",
  "homail.com": "hotmail.com",
  "otlook.com": "outlook.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "yaho.com": "yahoo.com",
  "yhaoo.com": "yahoo.com",
  "yahoo.com.br": "yahoo.com.br",
  "iclud.com": "icloud.com",
  "iclou.com": "icloud.com",
};

export interface EmailSuggestionResult {
  suggestedEmail: string;
  suggestedDomain: string;
}

export function checkEmailSuggestion(email: string): EmailSuggestionResult | null {
  if (!email || !email.includes("@")) return null;

  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return null;

  const [localPart, domain] = parts;
  if (!localPart || !domain) return null;

  const correction = DOMAIN_TYPOS[domain];
  if (correction && correction !== domain) {
    return {
      suggestedEmail: `${localPart}@${correction}`,
      suggestedDomain: correction,
    };
  }

  return null;
}
