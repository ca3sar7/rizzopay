/**
 * Módulo de Redirecionamento Pós-Pagamento
 * Regra: Só dispara quando o backend retornar status: "paid" com redirectUrl válido.
 * Utiliza flag de guarda estrita contra duplo redirecionamento e window.location.replace().
 */

let isRedirecting = false;

export function triggerPaymentSuccessRedirect(redirectUrl: string, onFeedback?: () => void): boolean {
  if (isRedirecting) {
    return false;
  }

  if (!redirectUrl || typeof redirectUrl !== "string") {
    console.error("Tentativa de redirecionamento com redirectUrl inválido:", redirectUrl);
    return false;
  }

  isRedirecting = true;

  if (onFeedback) {
    onFeedback();
  }

  // Feedback visual de no máximo 600ms enquanto executa o replace
  setTimeout(() => {
    try {
      window.location.replace(redirectUrl);
    } catch (e) {
      // Fallback
      window.location.href = redirectUrl;
    }
  }, 500);

  return true;
}

export function resetRedirectGuard(): void {
  isRedirecting = false;
}
