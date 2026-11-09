import React, { useState } from "react";
import Image from "next/image";
import { QrCode, ChevronDown, ChevronUp } from "lucide-react";

interface PixQrCodeProps {
  qrCodeBase64?: string | null;
  className?: string;
}

export const PixQrCode: React.FC<PixQrCodeProps> = ({ qrCodeBase64, className = "" }) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  if (!qrCodeBase64) return null;

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {/* Botão de toggle visível no mobile */}
      <button
        type="button"
        onClick={() => setIsOpenMobile(!isOpenMobile)}
        className="md:hidden flex items-center justify-center gap-1.5 text-[14px] font-semibold text-[#4F46E5] py-2 px-3 rounded-lg hover:bg-[#F5F5F7] transition-colors"
      >
        <QrCode className="w-4 h-4" />
        <span>{isOpenMobile ? "Ocultar QR Code" : "Ver QR Code para escanear"}</span>
        {isOpenMobile ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Container da imagem do QR Code (sempre visível no desktop, condicional no mobile) */}
      <div
        className={`flex-col items-center justify-center p-3 bg-white border border-[#E5E5EA] rounded-[14px] shadow-sm transition-all duration-200 ${
          isOpenMobile ? "flex mt-2" : "hidden md:flex"
        }`}
      >
        <div className="relative w-[180px] h-[180px]">
          {/* Usamos img tradicional para base64 data-uri seguro sem overhead */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCodeBase64}
            alt="QR Code PIX para pagamento"
            className="w-full h-full object-contain select-none"
          />
        </div>
        <p className="text-[12px] text-[#6E6E73] text-center mt-2">
          Aponte a câmera do aplicativo do seu banco
        </p>
      </div>
    </div>
  );
};
