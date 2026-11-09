import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "surface" | "warning" | "error" | "success";
}

export const Card: React.FC<CardProps> = ({
  variant = "default",
  className = "",
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-white border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]",
    surface: "bg-[#F5F5F7] border border-[#E5E5EA]",
    warning: "bg-[#FFFAEB] border border-[#B54708]/20",
    error: "bg-[#FEF3F2] border border-[#D92D20]/20",
    success: "bg-[#EAF7EF] border border-[#1F9D55]/20",
  };

  return (
    <div
      className={`rounded-[20px] p-5 sm:p-6 transition-all duration-200 ease-out ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
