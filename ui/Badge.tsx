import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "accent";
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  size = "md",
  icon,
  className = "",
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-[#F5F5F7] text-[#6E6E73] border border-[#E5E5EA]",
    success: "bg-[#EAF7EF] text-[#1F9D55] border border-[#1F9D55]/20",
    warning: "bg-[#FFFAEB] text-[#B54708] border border-[#B54708]/20",
    error: "bg-[#FEF3F2] text-[#D92D20] border border-[#D92D20]/20",
    accent: "bg-[#4F46E5]/10 text-[#4F46E5] border border-[#4F46E5]/20",
  };

  const sizeStyles = {
    sm: "text-[12px] px-2 py-0.5 rounded-full font-medium",
    md: "text-[13px] px-2.5 py-1 rounded-full font-medium",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
