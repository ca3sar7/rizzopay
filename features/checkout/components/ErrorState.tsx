import React from "react";
import { AlertCircle, WifiOff } from "lucide-react";
import { Button } from "@/ui";

interface ErrorStateProps {
  type: "generationError" | "communicationError";
  message?: string | null;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ type, message, onRetry }) => {
  const isComm = type === "communicationError";

  const defaultMsg = isComm
    ? "Sem conexão com o servidor. Verifique sua internet e tente novamente."
    : "Não foi possível gerar seu PIX. Confira seus dados e tente novamente.";

  return (
    <div
      role="alert"
      className="w-full p-4 rounded-[14px] bg-[#FEF3F2] border border-[#D92D20]/25 flex flex-col gap-3 animate-in fade-in duration-200"
    >
      <div className="flex items-start gap-3 text-[#D92D20]">
        {isComm ? (
          <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        )}
        <div className="flex flex-col">
          <span className="text-[14px] font-bold text-[#D92D20]">
            {isComm ? "Falha de conexão" : "Atenção ao gerar PIX"}
          </span>
          <p className="text-[13px] text-[#D92D20]/90 mt-0.5 leading-snug">
            {message || defaultMsg}
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-[#D92D20]/40 text-[#D92D20] hover:bg-[#D92D20]/10"
        >
          Tentar novamente
        </Button>
      </div>
    </div>
  );
};
