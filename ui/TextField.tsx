import React, { useId } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  isValid?: boolean;
  helperText?: string;
  suggestionText?: string;
  onApplySuggestion?: () => void;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      error,
      isValid,
      helperText,
      suggestionText,
      onApplySuggestion,
      id,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const suggestionId = `${inputId}-suggestion`;

    const hasError = Boolean(error);
    const showValid = Boolean(isValid && !hasError && !disabled);

    const describedBy = [
      hasError ? errorId : null,
      suggestionText ? suggestionId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label
          htmlFor={inputId}
          className="text-[14px] font-medium text-[#1D1D1F] select-none flex items-center justify-between"
        >
          <span>{label}</span>
        </label>

        <div className="relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={hasError ? "true" : "false"}
            aria-describedby={describedBy || undefined}
            className={`w-full h-[52px] px-4 rounded-[14px] text-[16px] text-[#1D1D1F] bg-white border transition-all duration-200 ease-out outline-none placeholder:text-[#6E6E73]/60 disabled:bg-[#F5F5F7] disabled:text-[#6E6E73] disabled:cursor-not-allowed ${
              hasError
                ? "border-[#D92D20] bg-[#FEF3F2] focus:ring-4 focus:ring-[#D92D20]/20"
                : "border-[#E5E5EA] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/25 hover:border-[#D1D1D6]"
            } ${showValid || hasError ? "pr-11" : ""} ${className}`}
            {...props}
          />

          {/* Indicador de Status à direita */}
          {showValid && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-[#1F9D55] animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            </div>
          )}

          {hasError && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-[#D92D20] animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Mensagem de Erro */}
        {hasError && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-[13px] text-[#D92D20] mt-0.5 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        {/* Sugestão de E-mail (ex: Você quis dizer gmail.com?) */}
        {suggestionText && !hasError && (
          <p
            id={suggestionId}
            className="text-[13px] text-[#4F46E5] mt-0.5 animate-in fade-in duration-150"
          >
            <span>{suggestionText} </span>
            {onApplySuggestion && (
              <button
                type="button"
                onClick={onApplySuggestion}
                className="underline font-semibold hover:text-[#4338CA] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 rounded px-1"
              >
                Corrigir
              </button>
            )}
          </p>
        )}

        {/* Texto de Ajuda / Microcopy */}
        {helperText && !hasError && !suggestionText && (
          <p id={helperId} className="text-[13px] text-[#6E6E73] mt-0.5 leading-[18px]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextField.displayName = "TextField";
