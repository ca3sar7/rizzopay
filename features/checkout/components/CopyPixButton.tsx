import React, { useState, useRef } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/ui";

interface CopyPixButtonProps {
  pixCode: string;
  disabled?: boolean;
  onCopied?: () => void;
  className?: string;
  codeElementId?: string;
}

export const CopyPixButton: React.FC<CopyPixButtonProps> = ({
  pixCode,
  disabled = false,
  onCopied,
  className = "",
  codeElementId,
}) => {
  const [copied, setCopied] = useState(false);
  const [manualSelectNotice, setManualSelectNotice] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = async () => {
    if (disabled || !pixCode) return;

    let success = false;

    // 1. Tentar navigator.clipboard
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(pixCode);
        success = true;
      } catch {
        success = false;
      }
    }

    // 2. Fallback via document.execCommand('copy')
    if (!success && typeof document !== "undefined") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = pixCode;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      setManualSelectNotice(false);
      if (onCopied) onCopied();

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } else {
      // 3. Ambos falharam: seleciona texto e avisa
      if (codeElementId && typeof document !== "undefined") {
        const inputElem = document.getElementById(codeElementId) as HTMLInputElement;
        if (inputElem) {
          inputElem.focus();
          inputElem.select();
        }
      }
      setManualSelectNotice(true);
    }
  };

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div aria-live="polite" className="sr-only">
        {copied ? "Código PIX copiado com sucesso" : ""}
      </div>

      <Button
        type="button"
        variant={copied ? "success" : "primary"}
        fullWidth
        disabled={disabled}
        onClick={handleCopy}
        icon={copied ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Copy className="w-5 h-5" />}
        className={className}
      >
        {copied ? "Copiado ✓" : "Copiar código PIX"}
      </Button>

      {manualSelectNotice && (
        <p className="text-[12px] text-center text-[#B54708] font-medium animate-in fade-in">
          Toque e segure no código abaixo para copiar manualmente.
        </p>
      )}
    </div>
  );
};
