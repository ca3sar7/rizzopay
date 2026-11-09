import { CustomerFormData } from "../validation/customerSchema";

export type CheckoutState =
  | "idle"
  | "incomplete"
  | "valid"
  | "submitting"
  | "pixReady"
  | "copied"
  | "awaiting"
  | "approved"
  | "expired"
  | "generationError"
  | "communicationError";

export interface CheckoutContext {
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
  transactionId?: string | null;
  amountCents: number;
  pixCode?: string | null;
  qrCodeBase64?: string | null;
  expiresAt?: string | null;
  redirectUrl?: string | null;
  isReconnecting?: boolean;
  errorMessage?: string | null;
}

export type CheckoutAction =
  | { type: "SET_FIELD"; field: "name" | "email" | "phone"; value: string }
  | { type: "SET_FIELD_ERROR"; field: "name" | "email" | "phone"; error?: string }
  | { type: "SET_EMAIL_SUGGESTION"; suggestion?: string | null }
  | { type: "VALIDATE_FORM"; isValid: boolean; errors?: { name?: string; email?: string; phone?: string } }
  | { type: "SUBMIT_START" }
  | {
      type: "SUBMIT_SUCCESS";
      payload: {
        transactionId: string;
        amountCents: number;
        pixCode: string;
        qrCodeBase64?: string;
        expiresAt: string;
      };
    }
  | { type: "SUBMIT_ERROR_GENERATION"; message?: string }
  | { type: "SUBMIT_ERROR_COMMUNICATION"; message?: string }
  | { type: "COPY_PIX" }
  | { type: "RESET_COPY" }
  | { type: "START_AWAITING" }
  | { type: "SET_RECONNECTING"; isReconnecting: boolean }
  | { type: "PAYMENT_APPROVED"; redirectUrl: string }
  | { type: "PAYMENT_EXPIRED" }
  | { type: "RETRY_FROM_ERROR" }
  | { type: "RETRY_FROM_EXPIRED" }
  | { type: "RESTORE_SESSION"; payload: { transactionId: string; pixCode: string; qrCodeBase64?: string; expiresAt: string; amountCents?: number } }
  | { type: "DEV_FORCE_STATE"; state: CheckoutState };

export const initialContext: CheckoutContext = {
  formData: {
    name: "",
    email: "",
    phone: "",
  },
  fieldErrors: {},
  emailSuggestion: null,
  transactionId: null,
  amountCents: 3700,
  pixCode: null,
  qrCodeBase64: null,
  expiresAt: null,
  redirectUrl: null,
  isReconnecting: false,
  errorMessage: null,
};

export function checkoutReducer(
  state: { current: CheckoutState; context: CheckoutContext },
  action: CheckoutAction
): { current: CheckoutState; context: CheckoutContext } {
  // Simulação / Override apenas para Dev
  if (action.type === "DEV_FORCE_STATE") {
    return {
      current: action.state,
      context: {
        ...state.context,
        pixCode: state.context.pixCode || "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540537.005802BR5913DiagLava6009Sao Paulo62070503***6304ABCD",
        expiresAt: state.context.expiresAt || new Date(Date.now() + 890 * 1000).toISOString(),
      },
    };
  }

  const { current, context } = state;

  switch (action.type) {
    case "SET_FIELD": {
      const nextFormData = {
        ...context.formData,
        [action.field]: action.field === "email" ? action.value.toLowerCase() : action.value,
      };
      // Limpa erro do campo alterado
      const nextFieldErrors = { ...context.fieldErrors };
      delete nextFieldErrors[action.field];

      return {
        current: current === "idle" ? "incomplete" : current,
        context: {
          ...context,
          formData: nextFormData,
          fieldErrors: nextFieldErrors,
        },
      };
    }

    case "SET_FIELD_ERROR": {
      const nextFieldErrors = { ...context.fieldErrors };
      if (action.error) {
        nextFieldErrors[action.field] = action.error;
      } else {
        delete nextFieldErrors[action.field];
      }
      return {
        current,
        context: {
          ...context,
          fieldErrors: nextFieldErrors,
        },
      };
    }

    case "SET_EMAIL_SUGGESTION": {
      return {
        current,
        context: {
          ...context,
          emailSuggestion: action.suggestion || null,
        },
      };
    }

    case "VALIDATE_FORM": {
      if (current === "submitting" || current === "approved") return state;
      const nextState: CheckoutState = action.isValid ? "valid" : "incomplete";
      return {
        current: nextState,
        context: {
          ...context,
          fieldErrors: action.errors || context.fieldErrors,
        },
      };
    }

    case "SUBMIT_START": {
      if (current === "submitting" || current === "approved") return state;
      return {
        current: "submitting",
        context: {
          ...context,
          errorMessage: null,
          isReconnecting: false,
        },
      };
    }

    case "SUBMIT_SUCCESS": {
      return {
        current: "pixReady",
        context: {
          ...context,
          transactionId: action.payload.transactionId,
          amountCents: action.payload.amountCents,
          pixCode: action.payload.pixCode,
          qrCodeBase64: action.payload.qrCodeBase64 || null,
          expiresAt: action.payload.expiresAt,
          errorMessage: null,
        },
      };
    }

    case "SUBMIT_ERROR_GENERATION": {
      return {
        current: "generationError",
        context: {
          ...context,
          errorMessage:
            action.message || "Não foi possível gerar seu PIX. Confira seus dados e tente novamente.",
        },
      };
    }

    case "SUBMIT_ERROR_COMMUNICATION": {
      return {
        current: "communicationError",
        context: {
          ...context,
          errorMessage:
            action.message || "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
        },
      };
    }

    case "COPY_PIX": {
      if (current === "pixReady" || current === "awaiting") {
        return {
          current: "copied",
          context,
        };
      }
      return state;
    }

    case "RESET_COPY": {
      if (current === "copied") {
        return {
          current: "awaiting",
          context,
        };
      }
      return state;
    }

    case "START_AWAITING": {
      if (current === "pixReady") {
        return {
          current: "awaiting",
          context,
        };
      }
      return state;
    }

    case "SET_RECONNECTING": {
      return {
        current,
        context: {
          ...context,
          isReconnecting: action.isReconnecting,
        },
      };
    }

    case "PAYMENT_APPROVED": {
      return {
        current: "approved",
        context: {
          ...context,
          redirectUrl: action.redirectUrl,
        },
      };
    }

    case "PAYMENT_EXPIRED": {
      return {
        current: "expired",
        context,
      };
    }

    case "RETRY_FROM_ERROR": {
      return {
        current: "valid",
        context: {
          ...context,
          errorMessage: null,
        },
      };
    }

    case "RETRY_FROM_EXPIRED": {
      return {
        current: "submitting",
        context: {
          ...context,
          pixCode: null,
          qrCodeBase64: null,
          expiresAt: null,
        },
      };
    }

    case "RESTORE_SESSION": {
      return {
        current: "awaiting",
        context: {
          ...context,
          transactionId: action.payload.transactionId,
          pixCode: action.payload.pixCode,
          qrCodeBase64: action.payload.qrCodeBase64 || null,
          expiresAt: action.payload.expiresAt,
          amountCents: action.payload.amountCents || context.amountCents,
        },
      };
    }

    default:
      return state;
  }
}
