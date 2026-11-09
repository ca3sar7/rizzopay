import { useEffect, useRef } from "react";
import { checkCheckoutStatus, StatusApiResponse } from "../api-client/checkoutApi";

interface UsePollingProps {
  transactionId: string | null | undefined;
  enabled: boolean;
  onSuccess: (redirectUrl: string) => void;
  onExpired: () => void;
  onReconnecting: (reconnecting: boolean) => void;
}

export function usePolling({
  transactionId,
  enabled,
  onSuccess,
  onExpired,
  onReconnecting,
}: UsePollingProps) {
  const isPollingRef = useRef(false);
  const stopRef = useRef(false);

  useEffect(() => {
    if (!enabled || !transactionId) {
      isPollingRef.current = false;
      return;
    }

    stopRef.current = false;
    let timerId: NodeJS.Timeout | null = null;

    const pollStatus = async () => {
      if (stopRef.current || !transactionId) return;

      try {
        const res: StatusApiResponse = await checkCheckoutStatus(transactionId);
        onReconnecting(false);

        if (res.status === "paid" && res.redirectUrl) {
          stopRef.current = true;
          onSuccess(res.redirectUrl);
          return;
        }

        if (res.status === "expired" || res.status === "failed") {
          stopRef.current = true;
          onExpired();
          return;
        }
      } catch {
        // Falha de rede não fatal durante polling: exibe "Reconectando..." e segue tentando
        onReconnecting(true);
      }

      if (!stopRef.current && enabled) {
        timerId = setTimeout(pollStatus, 5000);
      }
    };

    // Consulta inicial imediata
    pollStatus();

    // Pausar quando a aba estiver oculta e consultar imediatamente ao voltar ao foco
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!stopRef.current && enabled) {
          if (timerId) clearTimeout(timerId);
          pollStatus();
        }
      } else {
        if (timerId) clearTimeout(timerId);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopRef.current = true;
      if (timerId) clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [transactionId, enabled, onSuccess, onExpired, onReconnecting]);
}
