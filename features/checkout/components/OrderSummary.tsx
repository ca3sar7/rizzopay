import React from "react";
import Image from "next/image";
import { ShieldCheck, Zap } from "lucide-react";

interface OrderSummaryProps {
  amountCents?: number;
  compact?: boolean;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({ amountCents = 3700, compact = false }) => {
  const formattedPrice = (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
        <h2 className="text-[17px] font-semibold text-[#1D1D1F]">Resumo do pedido</h2>
        <span className="text-[12px] font-medium text-[#1F9D55] bg-[#EAF7EF] px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Zap className="w-3 h-3 fill-current" />
          Acesso digital imediato
        </span>
      </div>

      <div className="flex items-center gap-3.5">
        <div className="relative w-[72px] h-[72px] rounded-[14px] overflow-hidden border border-[#E5E5EA] bg-[#F5F5F7] shrink-0">
          <Image
            src="/images/product.png"
            alt="Capa do infoproduto DiagLava"
            fill
            sizes="72px"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-[#1D1D1F] leading-tight truncate">
            DiagLava - Conserto na Palma da Mão
          </h3>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[20px] font-bold text-[#1D1D1F] tracking-tight">
              {formattedPrice}
            </span>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="pt-3 border-t border-[#E5E5EA] flex items-center justify-between text-[14px]">
          <span className="text-[#6E6E73]">Total a pagar</span>
          <span className="text-[18px] font-bold text-[#4F46E5]">{formattedPrice}</span>
        </div>
      )}
    </div>
  );
};
