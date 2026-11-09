import React from "react";
import { Check } from "lucide-react";

export interface StepperProps {
  currentStep: 1 | 2 | 3;
}

export const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, label: "Seus dados" },
    { number: 2, label: "Pagar com PIX" },
    { number: 3, label: "Acesso" },
  ];

  return (
    <nav aria-label="Progresso da compra" className="w-full select-none py-1">
      <ol className="flex items-center justify-between gap-2">
        {steps.map((step, idx) => {
          const isDone = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isPending = currentStep < step.number;

          return (
            <React.Fragment key={step.number}>
              <li
                className={`flex items-center gap-1.5 sm:gap-2 text-[13px] font-medium transition-colors duration-200 ${
                  isCurrent
                    ? "text-[#4F46E5] font-semibold"
                    : isDone
                    ? "text-[#1F9D55]"
                    : "text-[#6E6E73]/70"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-200 ${
                    isCurrent
                      ? "bg-[#4F46E5] text-white shadow-sm"
                      : isDone
                      ? "bg-[#EAF7EF] text-[#1F9D55] border border-[#1F9D55]/30"
                      : "bg-[#E5E5EA] text-[#6E6E73]"
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : step.number}
                </span>
                <span className="truncate">{step.label}</span>
              </li>

              {idx < steps.length - 1 && (
                <li
                  aria-hidden="true"
                  className={`flex-1 h-[2px] rounded-full mx-1 transition-colors duration-200 ${
                    currentStep > step.number ? "bg-[#1F9D55]" : "bg-[#E5E5EA]"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
