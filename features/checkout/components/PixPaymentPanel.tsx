import React, { useEffect, useRef } from "react";
import { CopyPixButton } from "./CopyPixButton";
import { PixQrCode } from "./PixQrCode";
import { PixInstructions } from "./PixInstructions";
import { PaymentStatusBanner } from "./PaymentStatusBanner";
import { useCountdown } from "../state/useCountdown";
import { Button } from "@/ui";
import { RefreshCw } from "lucide-react";

interface PixPaymentPanelProps {
  amountCents: number;
  pixCode: string;
  qrCodeBase64?: string | null;
  expiresAt: string | null | undefined;
  status: "pixReady" | "copied" | "awaiting" | "approved" | "expired";
  isReconnecting?: boolean;
  onCopied: () => void;
  onExpire: () => void;
  onRenewPix: () => void;
  isRenewing?: boolean;
}

export const PixPaymentPanel: React.FC<PixPaymentPanelProps> = ({
  amountCents,
  pixCode,
  qrCodeBase64,
  expiresAt,
  status,
  isReconnecting = false,
  onCopied,
  onExpire,
  onRenewPix,
  isRenewing = false,
}) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const codeInputId = "pix-copia-cola-input";

  const { formatted, isWarning, isExpired } = useCountdown(expiresAt, onExpire);
  const isActuallyExpired = status === "expired" || isExpired;

  // Gerenciamento de foco acessível ao exibir o PIX (Seção 12)
  useEffect(() => {
    if (headingRef.current) {
      headingRef.current.focus();
    }
  }, []);

  const formattedPrice = (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div
      className={`bg-white rounded-[20px] p-5 sm:p-6 border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-250 ${
        isActuallyExpired ? "opacity-90" : ""
      }`}
    >
      {/* 1. Cabeçalho com Valor e Título */}
      <div className="flex flex-col gap-1">
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="text-[15px] font-medium text-[#6E6E73] outline-none"
        >
          Valor do pagamento
        </h3>
        <div className="text-[32px] font-bold text-[#1D1D1F] tracking-tight leading-none">
          {formattedPrice}
        </div>
      </div>

      {/* 2. Status / Contador Regressivo ou Banner */}
      <PaymentStatusBanner
        status={isActuallyExpired ? "expired" : status === "approved" ? "approved" : "awaiting"}
        countdownText={isActuallyExpired ? undefined : `Pague em até ${formatted}`}
        isWarning={isWarning}
        isReconnecting={isReconnecting}
      />

      {/* Se expirou, botão em destaque para gerar novo */}
      {isActuallyExpired && (
        <Button
          type="button"
          variant="primary"
          fullWidth
          loading={isRenewing}
          onClick={onRenewPix}
          icon={<RefreshCw className="w-5 h-5" />}
        >
          Gerar novo PIX de {formattedPrice}
        </Button>
      )}

      {/* 3. Botão Primário "Copiar código PIX" (Desktop e Inline) */}
      <div className={isActuallyExpired ? "opacity-50 pointer-events-none" : ""}>
        <CopyPixButton
          pixCode={pixCode}
          disabled={isActuallyExpired}
          onCopied={onCopied}
          codeElementId={codeInputId}
        />
      </div>

      {/* 4. Campo somente leitura com o código Copia e Cola */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={codeInputId}
          className="text-[13px] font-medium text-[#6E6E73] select-none"
        >
          Código Pix Copia e Cola
        </label>
        <div className="relative flex items-center">
          <input
            id={codeInputId}
            type="text"
            readOnly
            value={pixCode}
            aria-label="Código Pix Copia e Cola"
            onFocus={(e) => e.target.select()}
            className="w-full h-[46px] px-3.5 rounded-[12px] bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F] text-[13px] font-mono truncate focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 cursor-text select-all"
          />
        </div>
      </div>

      {/* 5. QR Code (Complementar) */}
      <div className={isActuallyExpired ? "opacity-40" : ""}>
        <PixQrCode qrCodeBase64={qrCodeBase64} />
      </div>

      {/* 6. Instruções e Nota */}
      <PixInstructions />
    </div>
  );
};
