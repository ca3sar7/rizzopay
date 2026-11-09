import React from "react";
import { Info } from "lucide-react";

export const PixInstructions: React.FC = () => {
  const steps = [
    <>Clique em <strong>Copiar código PIX</strong>.</>,
    <>Abra o aplicativo do seu banco.</>,
    <>Entre na área <strong>PIX</strong>.</>,
    <>Selecione a opção <strong>Pix Copia e Cola</strong>.</>,
    <>Cole o código copiado.</>,
    <>Confira os dados e confirme o pagamento.</>,
  ];

  return (
    <div className="w-full flex flex-col gap-3 pt-3 border-t border-[#E5E5EA]">
      <h4 className="text-[14px] font-semibold text-[#1D1D1F]">Como pagar:</h4>

      <ol className="flex flex-col gap-2.5 text-[14px] text-[#1D1D1F]">
        {steps.map((text, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] text-[#6E6E73] text-[12px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="leading-[20px]">{text}</span>
          </li>
        ))}
      </ol>

      <div className="mt-2 p-3 bg-[#F5F5F7] rounded-[14px] flex items-start gap-2.5 text-[13px] text-[#6E6E73] leading-[18px]">
        <Info className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
        <span>
          Assim que o pagamento for confirmado, você será levado automaticamente ao próximo passo. Não feche esta página.
        </span>
      </div>
    </div>
  );
};
