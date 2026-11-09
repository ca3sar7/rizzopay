import React from "react";
import { Button } from "@/ui";
import { CopyPixButton } from "./CopyPixButton";
import { RefreshCw } from "lucide-react";

interface StickyActionBarProps {
  mode: "form" | "pix" | "expired";
  amountCents?: number;
  canSubmit?: boolean;
  isSubmitting?: boolean;
  onSubmit?: () => void;
  pixCode?: string | null;
  onCopied?: () => void;
  onRenewPix?: () => void;
  isRenewing?: boolean;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  mode,
  amountCents = 3700,
  canSubmit = false,
  isSubmitting = false,
  onSubmit,
  pixCode,
  onCopied,
  onRenewPix,
  isRenewing = false,
}) => {
  const formattedPrice = (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E5EA] px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] transition-transform duration-200">
      <div className="max-w-[440px] mx-auto w-full">
        {mode === "form" && (
          <Button
            type="button"
            variant="primary"
            fullWidth
            loading={isSubmitting}
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            {isSubmitting ? "Gerando seu PIX..." : `Gerar PIX de ${formattedPrice}`}
          </Button>
        )}

        {mode === "pix" && pixCode && (
          <CopyPixButton
            pixCode={pixCode}
            onCopied={onCopied}
          />
        )}

        {mode === "expired" && (
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
      </div>
    </div>
  );
};
