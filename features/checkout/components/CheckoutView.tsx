"use client";

import React, { useReducer, useEffect, useCallback, useState } from "react";
import Image from "next/image";
import { Stepper, Toast } from "@/ui";
import { OrderSummary } from "./OrderSummary";
import { CustomerForm } from "./CustomerForm";
import { PixPaymentPanel } from "./PixPaymentPanel";
import { StickyActionBar } from "./StickyActionBar";
import { ErrorState } from "./ErrorState";
import {
  checkoutReducer,
  initialContext,
  CheckoutState,
} from "../state/checkoutMachine";
import { usePolling } from "../state/usePolling";
import {
  captureTrackingParams,
  RawTrackingParams,
} from "../tracking/utm";
import {
  getOrCreateSessionId,
  saveActiveTransactionId,
  getActiveTransactionId,
  clearActiveTransactionId,
} from "../tracking/session";
import {
  createCheckoutPix,
  checkCheckoutStatus,
  ApiError,
} from "../api-client/checkoutApi";
import { triggerPaymentSuccessRedirect } from "../redirect/redirectHandler";
import {
  isValidFullName,
  isValidBrazilianPhone,
} from "../validation/customerSchema";

interface CheckoutViewProps {
  initialUtm?: RawTrackingParams;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({ initialUtm }) => {
  const [state, dispatch] = useReducer(checkoutReducer, {
    current: "idle",
    context: initialContext,
  });
  const [isRenewing, setIsRenewing] = useState(false);

  const { current, context } = state;

  // 1. Captura e persistência de UTMs e Session ID
  useEffect(() => {
    captureTrackingParams();
    getOrCreateSessionId();
  }, []);

  // 2. Retomada ao recarregar a página (Seção 9)
  useEffect(() => {
    const savedTid = getActiveTransactionId();
    if (!savedTid) return;

    checkCheckoutStatus(savedTid)
      .then((res) => {
        if (res.status === "paid" && res.redirectUrl) {
          dispatch({ type: "PAYMENT_APPROVED", redirectUrl: res.redirectUrl });
          triggerPaymentSuccessRedirect(res.redirectUrl);
          clearActiveTransactionId();
        } else if (res.status === "expired" || res.status === "failed") {
          dispatch({ type: "PAYMENT_EXPIRED" });
        } else if (res.status === "pending" && res.pixCode) {
          dispatch({
            type: "RESTORE_SESSION",
            payload: {
              transactionId: savedTid,
              pixCode: res.pixCode,
              qrCodeBase64: res.qrCodeBase64,
              expiresAt: res.expiresAt,
              amountCents: res.amountCents,
            },
          });
        }
      })
      .catch((err) => {
        console.warn("[Checkout] Falha ao verificar transação salva anterior:", err);
      });
  }, []);

  // Validação dinâmica do formulário
  const isFormValid =
    isValidFullName(context.formData.name) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(context.formData.email.trim()) &&
    isValidBrazilianPhone(context.formData.phone);

  useEffect(() => {
    if (current === "idle" || current === "incomplete" || current === "valid") {
      dispatch({ type: "VALIDATE_FORM", isValid: isFormValid });
    }
  }, [context.formData.name, context.formData.email, context.formData.phone, isFormValid, current]);

  // 3. Submissão / Criação do PIX
  const handleGeneratePix = useCallback(
    async (isRetry = false) => {
      if (current === "submitting" || current === "approved") return;

      const sid = getOrCreateSessionId();
      const utms = captureTrackingParams();

      if (isRetry) {
        setIsRenewing(true);
      }
      dispatch({ type: isRetry ? "RETRY_FROM_EXPIRED" : "SUBMIT_START" });

      try {
        const response = await createCheckoutPix({
          sessionId: sid,
          name: context.formData.name,
          email: context.formData.email,
          phone: context.formData.phone,
          utm: utms,
          retry: isRetry,
        });

        saveActiveTransactionId(response.transactionId);

        dispatch({
          type: "SUBMIT_SUCCESS",
          payload: {
            transactionId: response.transactionId,
            amountCents: response.amountCents,
            pixCode: response.pixCode,
            qrCodeBase64: response.qrCodeBase64,
            expiresAt: response.expiresAt,
          },
        });
      } catch (err: any) {
        const apiError = err as ApiError;
        if (apiError.type === "COMMUNICATION_ERROR") {
          dispatch({
            type: "SUBMIT_ERROR_COMMUNICATION",
            message: apiError.message,
          });
        } else if (apiError.type === "GENERATION_ERROR") {
          dispatch({
            type: "SUBMIT_ERROR_GENERATION",
            message: apiError.message,
          });
        } else if (apiError.fieldErrors) {
          for (const [field, message] of Object.entries(apiError.fieldErrors)) {
            dispatch({
              type: "SET_FIELD_ERROR",
              field: field as "name" | "email" | "phone",
              error: message,
            });
          }
          dispatch({ type: "VALIDATE_FORM", isValid: false });
        } else {
          dispatch({
            type: "SUBMIT_ERROR_GENERATION",
            message: apiError.message || "Erro inesperado. Tente novamente.",
          });
        }
      } finally {
        setIsRenewing(false);
      }
    },
    [current, context.formData]
  );

  // 4. Polling de status durante espera de pagamento
  const isPollingEnabled =
    current === "pixReady" || current === "copied" || current === "awaiting";

  usePolling({
    transactionId: context.transactionId,
    enabled: isPollingEnabled,
    onSuccess: (redirectUrl) => {
      dispatch({ type: "PAYMENT_APPROVED", redirectUrl });
      clearActiveTransactionId();
      triggerPaymentSuccessRedirect(redirectUrl);
    },
    onExpired: () => {
      dispatch({ type: "PAYMENT_EXPIRED" });
    },
    onReconnecting: (reconnecting) => {
      dispatch({ type: "SET_RECONNECTING", isReconnecting: reconnecting });
    },
  });

  // Determinação do passo atual para o Stepper
  let currentStep: 1 | 2 | 3 = 1;
  if (
    current === "pixReady" ||
    current === "copied" ||
    current === "awaiting" ||
    current === "expired"
  ) {
    currentStep = 2;
  } else if (current === "approved") {
    currentStep = 3;
  }

  const isPixVisible =
    Boolean(context.pixCode) &&
    (current === "pixReady" ||
      current === "copied" ||
      current === "awaiting" ||
      current === "approved" ||
      current === "expired");

  const hasFormError = current === "generationError" || current === "communicationError";

  return (
    <main className="min-h-screen w-full flex flex-col items-center py-4 sm:py-8 px-4 pb-28 md:pb-12 bg-[#F5F5F7]">
      <div className="w-full max-w-[440px] md:max-w-[960px] flex flex-col gap-5">
        {/* 1. Banner Superior (Mobile & Desktop) */}
        <header className="w-full rounded-[20px] overflow-hidden bg-white border border-[#E5E5EA] shadow-sm">
          <div className="relative w-full h-[140px] sm:h-[160px] md:h-[220px]">
            <Image
              src="/images/banner.png"
              alt="Banner Promocional DiagLava"
              priority
              fill
              sizes="(max-width: 768px) 100vw, 960px"
              className="object-cover"
            />
          </div>
        </header>

        {/* 2. Mini-indicador de 3 passos */}
        <section aria-label="Etapas da compra" className="w-full px-1">
          <Stepper currentStep={currentStep} />
        </section>

        {/* Layout em Grid / Colunas (Mobile 1 col, Desktop 2 col) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Coluna Esquerda: Formulário / Painel PIX (~560px no desktop) */}
          <div className="w-full md:col-span-7 lg:col-span-7 flex flex-col gap-5">
            {/* Se houver erro de geração ou falha de comunicação */}
            {hasFormError && (
              <ErrorState
                type={current as "generationError" | "communicationError"}
                message={context.errorMessage}
                onRetry={() => {
                  dispatch({ type: "RETRY_FROM_ERROR" });
                  handleGeneratePix();
                }}
              />
            )}

            {/* Painel PIX ou Formulário do Cliente */}
            {isPixVisible ? (
              <>
                <CustomerForm
                  formData={context.formData}
                  fieldErrors={context.fieldErrors}
                  emailSuggestion={context.emailSuggestion}
                  onFieldChange={(field, val) =>
                    dispatch({ type: "SET_FIELD", field, value: val })
                  }
                  onFieldError={(field, err) =>
                    dispatch({ type: "SET_FIELD_ERROR", field, error: err })
                  }
                  onEmailSuggestion={(sug) =>
                    dispatch({ type: "SET_EMAIL_SUGGESTION", suggestion: sug })
                  }
                  onSubmit={() => {}}
                  isSubmitting={false}
                  isCollapsed={true}
                  canSubmit={false}
                  amountCents={context.amountCents}
                />

                <PixPaymentPanel
                  amountCents={context.amountCents}
                  pixCode={context.pixCode!}
                  qrCodeBase64={context.qrCodeBase64}
                  expiresAt={context.expiresAt}
                  status={
                    current === "pixReady" ||
                    current === "copied" ||
                    current === "awaiting" ||
                    current === "approved" ||
                    current === "expired"
                      ? current
                      : "pixReady"
                  }
                  isReconnecting={context.isReconnecting}
                  onCopied={() => {
                    dispatch({ type: "COPY_PIX" });
                    setTimeout(() => {
                      dispatch({ type: "RESET_COPY" });
                    }, 2000);
                  }}
                  onExpire={() => dispatch({ type: "PAYMENT_EXPIRED" })}
                  onRenewPix={() => handleGeneratePix(true)}
                  isRenewing={isRenewing}
                />
              </>
            ) : (
              <CustomerForm
                formData={context.formData}
                fieldErrors={context.fieldErrors}
                emailSuggestion={context.emailSuggestion}
                onFieldChange={(field, val) =>
                  dispatch({ type: "SET_FIELD", field, value: val })
                }
                onFieldError={(field, err) =>
                  dispatch({ type: "SET_FIELD_ERROR", field, error: err })
                }
                onEmailSuggestion={(sug) =>
                  dispatch({ type: "SET_EMAIL_SUGGESTION", suggestion: sug })
                }
                onSubmit={() => handleGeneratePix(false)}
                isSubmitting={current === "submitting"}
                isCollapsed={false}
                canSubmit={isFormValid && current !== "submitting"}
                amountCents={context.amountCents}
              />
            )}
          </div>

          {/* Coluna Direita: Resumo do pedido (Sticky no desktop ~360px) */}
          <aside className="w-full md:col-span-5 lg:col-span-5 md:sticky md:top-6 flex flex-col gap-4">
            <OrderSummary amountCents={context.amountCents} />
          </aside>
        </div>
      </div>

      {/* Botão Fixo na Base (Sticky Action Bar - Mobile apenas) */}
      <StickyActionBar
        mode={
          current === "expired"
            ? "expired"
            : isPixVisible
            ? "pix"
            : "form"
        }
        amountCents={context.amountCents}
        canSubmit={isFormValid && current !== "submitting"}
        isSubmitting={current === "submitting"}
        onSubmit={() => handleGeneratePix(false)}
        pixCode={context.pixCode}
        onCopied={() => {
          dispatch({ type: "COPY_PIX" });
          setTimeout(() => {
            dispatch({ type: "RESET_COPY" });
          }, 2000);
        }}
        onRenewPix={() => handleGeneratePix(true)}
        isRenewing={isRenewing}
      />
    </main>
  );
};
