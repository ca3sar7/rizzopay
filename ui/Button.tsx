import React from "react";
import { Spinner } from "./Spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "outline" | "ghost";
  size?: "default" | "sm";
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "default",
      fullWidth = false,
      loading = false,
      icon,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 ease-out select-none focus:outline-none focus:ring-4 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

    const variantStyles = {
      primary:
        "bg-[#4F46E5] text-white hover:bg-[#4338CA] active:bg-[#3730A3] focus:ring-[#4F46E5]/25 shadow-sm",
      secondary:
        "bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E5E5EA] active:bg-[#D1D1D6] focus:ring-[#4F46E5]/20",
      success:
        "bg-[#1F9D55] text-white hover:bg-[#198748] active:bg-[#146c3a] focus:ring-[#1F9D55]/25 shadow-sm",
      outline:
        "bg-transparent border border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F5F5F7] focus:ring-[#4F46E5]/20",
      ghost:
        "bg-transparent text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] focus:ring-[#4F46E5]/20",
    };

    const sizeStyles = {
      default: "h-[52px] min-h-[52px] px-6 text-[16px] rounded-[14px]",
      sm: "h-[44px] min-h-[44px] px-4 text-[14px] rounded-[12px]",
    };

    const widthStyles = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Spinner size="sm" className={variant === "primary" || variant === "success" ? "text-white" : "text-[#1D1D1F]"} />
            <span>{children}</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            {icon && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
