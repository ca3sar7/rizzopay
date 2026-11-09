import React, { useState } from "react";
import { CheckoutState } from "../state/checkoutMachine";

interface DevStateToolbarProps {
  currentState: CheckoutState;
  onSelectState: (state: CheckoutState) => void;
}

export const DevStateToolbar: React.FC<DevStateToolbarProps> = ({
  currentState,
  onSelectState,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Desativada rigorosamente em produção
  if (process.env.NODE_ENV === "production") return null;

  const states: { id: CheckoutState; label: string }[] = [
    { id: "idle", label: "1. Inicial/Incompleto" },
    { id: "incomplete", label: "2. Digitando (Incompleto)" },
    { id: "valid", label: "3. Válido (CTA ativo)" },
    { id: "submitting", label: "4. Processando (Spinner)" },
    { id: "pixReady", label: "5. PIX Gerado" },
    { id: "copied", label: "6. Código Copiado ✓" },
    { id: "awaiting", label: "7. Aguardando Pagamento" },
    { id: "approved", label: "8. Aprovado (Sucesso)" },
    { id: "expired", label: "9. Expirado" },
    { id: "generationError", label: "10. Erro de Geração (502)" },
    { id: "communicationError", label: "11. Falha Conexão (503)" },
  ];

  return (
    <aside
      aria-label="Simulador de Estados DEV"
      className="fixed bottom-2 left-2 z-50 bg-[#1D1D1F] text-white p-2.5 rounded-[12px] shadow-2xl text-[12px] opacity-90 hover:opacity-100 transition-opacity border border-white/20 max-w-[320px]"
    >
      <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-white/10">
        <span className="font-mono text-[#1F9D55] font-bold text-[11px] uppercase tracking-wide">
          DEV SIMULATOR (11 Estados)
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-white/60 hover:text-white px-1 font-mono"
        >
          {isOpen ? "▲ fechar" : "▼ abrir"}
        </button>
      </div>

      <div className="flex items-center gap-1.5 font-mono text-[11px]">
        <span className="text-white/60">Atual:</span>
        <span className="text-[#4F46E5] font-bold bg-white/10 px-1.5 py-0.5 rounded">
          {currentState}
        </span>
      </div>

      {isOpen && (
        <div className="flex flex-col gap-1 mt-2 pt-1 border-t border-white/10 max-h-[220px] overflow-y-auto">
          {states.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelectState(st.id)}
              className={`text-left px-2 py-1 rounded transition-colors text-[11px] ${
                currentState === st.id
                  ? "bg-[#4F46E5] text-white font-bold"
                  : "hover:bg-white/10 text-white/80"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
};
