import React, { useRef, useEffect } from "react";
import { TextField, Button } from "@/ui";
import { formatPhone } from "../validation/phoneMask";
import { checkEmailSuggestion } from "../validation/emailSuggestion";
import { isValidFullName, isValidBrazilianPhone } from "../validation/customerSchema";
import { ShieldCheck, Lock, Zap, UserCheck } from "lucide-react";

interface CustomerFormProps {
  formData: {
    name: string;
    email: string;
    phone: string;
  };
  fieldErrors: {
    name?: string;
    email?: string;
    phone?: string;
  };
  emailSuggestion?: string | null;
  onFieldChange: (field: "name" | "email" | "phone", value: string) => void;
  onFieldError: (field: "name" | "email" | "phone", error?: string) => void;
  onEmailSuggestion: (suggestion?: string | null) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isSubmitting: boolean;
  isCollapsed?: boolean;
  canSubmit: boolean;
  amountCents?: number;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  formData,
  fieldErrors,
  emailSuggestion,
  onFieldChange,
  onFieldError,
  onEmailSuggestion,
  onSubmit,
  isSubmitting,
  isCollapsed = false,
  canSubmit,
  amountCents = 3700,
}) => {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const formattedPrice = (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const handleNameBlur = () => {
    if (!formData.name) return;
    if (!isValidFullName(formData.name)) {
      onFieldError("name", "Informe seu nome e sobrenome completo.");
    } else {
      onFieldError("name", undefined);
    }
  };

  const handleEmailChange = (val: string) => {
    onFieldChange("email", val);
    const suggestion = checkEmailSuggestion(val);
    if (suggestion) {
      onEmailSuggestion(`Você quis dizer ${suggestion.suggestedDomain}?`);
    } else {
      onEmailSuggestion(null);
    }
  };

  const handleEmailBlur = () => {
    if (!formData.email) return;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
    if (!isEmailValid) {
      onFieldError("email", "Confira o e-mail digitado.");
    } else {
      onFieldError("email", undefined);
    }
  };

  const handlePhoneChange = (val: string) => {
    const formatted = formatPhone(val);
    onFieldChange("phone", formatted);
  };

  const handlePhoneBlur = () => {
    if (!formData.phone) return;
    if (!isValidBrazilianPhone(formData.phone)) {
      onFieldError("phone", "Informe o telefone com DDD válido.");
    } else {
      onFieldError("phone", undefined);
    }
  };

  const handleApplyEmailSuggestion = () => {
    const res = checkEmailSuggestion(formData.email);
    if (res) {
      onFieldChange("email", res.suggestedEmail);
      onEmailSuggestion(null);
      onFieldError("email", undefined);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação ao enviar
    let firstInvalid: HTMLInputElement | null = null;

    if (!isValidFullName(formData.name)) {
      onFieldError("name", "Informe seu nome e sobrenome completo.");
      if (!firstInvalid) firstInvalid = nameInputRef.current;
    }

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
    if (!isEmailValid) {
      onFieldError("email", "Confira o e-mail digitado.");
      if (!firstInvalid) firstInvalid = emailInputRef.current;
    }

    if (!isValidBrazilianPhone(formData.phone)) {
      onFieldError("phone", "Informe o telefone com DDD válido.");
      if (!firstInvalid) firstInvalid = phoneInputRef.current;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    onSubmit();
  };

  // Se o formulário recolheu após gerar o PIX
  if (isCollapsed) {
    return (
      <div className="bg-white rounded-[20px] p-5 border border-[#E5E5EA] shadow-sm flex items-center justify-between text-[14px]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#EAF7EF] text-[#1F9D55] flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-[#1D1D1F] truncate">{formData.name}</span>
            <span className="text-[#6E6E73] text-[13px] truncate">
              {formData.email} · {formData.phone}
            </span>
          </div>
        </div>
        <span
          className="text-[12px] font-medium text-[#6E6E73]/50 select-none cursor-not-allowed pl-2 shrink-0"
          title="Não é possível alterar dados enquanto houver PIX ativo"
        >
          Editar
        </span>
      </div>
    );
  }

  const isNameValid = isValidFullName(formData.name) && !fieldErrors.name;
  const isEmailValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) && !fieldErrors.email;
  const isPhoneValid = isValidBrazilianPhone(formData.phone) && !fieldErrors.phone;

  return (
    <form
      noValidate
      onSubmit={handleFormSubmit}
      className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1 pb-1">
        <h2 className="text-[18px] font-semibold text-[#1D1D1F]">Dados para recebimento</h2>
        <p className="text-[13px] text-[#6E6E73]">
          Informe onde você deseja receber as informações e o acesso ao DiagLava.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Campo 1: Nome Completo */}
        <TextField
          ref={nameInputRef}
          label="Nome completo"
          placeholder="Ex: Carlos Eduardo Silva"
          autoComplete="name"
          autoCapitalize="words"
          value={formData.name}
          disabled={isSubmitting}
          isValid={isNameValid}
          error={fieldErrors.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
          onBlur={handleNameBlur}
        />

        {/* Campo 2: E-mail */}
        <TextField
          ref={emailInputRef}
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          placeholder="seuemail@exemplo.com"
          value={formData.email}
          disabled={isSubmitting}
          isValid={isEmailValid}
          error={fieldErrors.email}
          suggestionText={emailSuggestion || undefined}
          onApplySuggestion={handleApplyEmailSuggestion}
          onChange={(e) => handleEmailChange(e.target.value)}
          onBlur={handleEmailBlur}
        />

        {/* Campo 3: Telefone */}
        <TextField
          ref={phoneInputRef}
          label="Telefone com DDD"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(11) 99999-9999"
          value={formData.phone}
          disabled={isSubmitting}
          isValid={isPhoneValid}
          error={fieldErrors.phone}
          helperText="Para enviarmos o acesso e avisos da sua compra."
          onChange={(e) => handlePhoneChange(e.target.value)}
          onBlur={handlePhoneBlur}
        />
      </div>

      {/* Selos discretos */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E5EA] text-[12px] text-[#6E6E73]">
        <div className="flex items-center gap-1.5 justify-center text-center">
          <Zap className="w-4 h-4 text-[#4F46E5] shrink-0" />
          <span>Acesso imediato</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center text-center">
          <Lock className="w-4 h-4 text-[#1F9D55] shrink-0" />
          <span>Ambiente seguro</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center text-center">
          <ShieldCheck className="w-4 h-4 text-[#4F46E5] shrink-0" />
          <span>Pagamento via PIX</span>
        </div>
      </div>

      {/* Botão de Envio visível no Desktop (No mobile fica no sticky bar) */}
      <div className="hidden md:block pt-1">
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isSubmitting}
          disabled={!canSubmit}
        >
          {isSubmitting ? "Gerando seu PIX..." : `Gerar PIX de ${formattedPrice}`}
        </Button>
      </div>
    </form>
  );
};
