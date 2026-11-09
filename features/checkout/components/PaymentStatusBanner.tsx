import React from "react";
import { CheckCircle2, Clock, AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Spinner } from "@/ui";

interface PaymentStatusBannerProps {
  status: "awaiting" | "approved" | "expired";
  countdownText?: string;
  isWarning?: boolean;
  isReconnecting?: boolean;
}

export const PaymentStatusBanner: React.FC<PaymentStatusBannerProps> = ({
  status,
  countdownText,
  isWarning = false,
  isReconnecting = false,
}) => {
  if (status === "approved") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full p-4 rounded-[14px] bg-[#EAF7EF] border border-[#1F9D55]/30 flex items-center justify-center gap-3 text-[#1F9D55] animate-in fade-in zoom-in-95 duration-200"
      >
        <CheckCircle2 className="w-6 h-6 stroke-[2.5] shrink-0 animate-bounce" />
        <span className="text-[16px] font-bold">Pagamento confirmado!</span>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full p-4 rounded-[14px] bg-[#FEF3F2] border border-[#D92D20]/30 flex items-center gap-3 text-[#D92D20] animate-in fade-in duration-200"
      >
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div className="flex flex-col">
          <span className="text-[14px] font-bold">Este código PIX expirou</span>
          <span className="text-[13px] text-[#D92D20]/80">
            Gere um novo código abaixo para finalizar seu pedido com segurança.
          </span>
        </div>
      </div>
    );
  }

  // Status: awaiting (ou pixReady)
  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full p-3.5 rounded-[14px] border flex flex-col gap-1 transition-colors duration-200 ${
        isWarning
          ? "bg-[#FFFAEB] border-[#B54708]/30 text-[#B54708]"
          : "bg-[#F5F5F7] border-[#E5E5EA] text-[#1D1D1F]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isReconnecting ? (
            <WifiOff className="w-4 h-4 text-[#B54708] animate-pulse shrink-0" />
          ) : (
            <Spinner size="sm" className="text-[#4F46E5] shrink-0" />
          )}
          <span className="text-[13.5px] font-medium">
            {isReconnecting
              ? "Reconectando ao servidor..."
              : "Aguardando confirmação do pagamento..."}
          </span>
        </div>

        {countdownText && (
          <div
            className={`flex items-center gap-1 text-[13px] font-semibold px-2 py-0.5 rounded-md ${
              isWarning ? "bg-[#B54708]/10 text-[#B54708]" : "bg-white text-[#1D1D1F] border border-[#E5E5EA]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{countdownText}</span>
          </div>
        )}
      </div>
    </div>
  );
};
