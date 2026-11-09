import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastProps {
  type?: "success" | "error" | "info";
  message: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ type = "info", message, onClose }) => {
  const styles = {
    success: "bg-[#EAF7EF] border-[#1F9D55]/30 text-[#1F9D55]",
    error: "bg-[#FEF3F2] border-[#D92D20]/30 text-[#D92D20]",
    info: "bg-[#F5F5F7] border-[#E5E5EA] text-[#1D1D1F]",
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1F9D55]" />,
    error: <AlertCircle className="w-4 h-4 shrink-0 text-[#D92D20]" />,
    info: <Info className="w-4 h-4 shrink-0 text-[#4F46E5]" />,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-[14px] border text-[14px] shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${styles[type]}`}
    >
      <div className="flex items-center gap-2.5">
        {icons[type]}
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar notificação"
          className="text-current opacity-60 hover:opacity-100 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-current/20"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
