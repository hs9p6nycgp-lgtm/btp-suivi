"use client";

import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "outlined" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
};

export function Card({
  className = "",
  variant = "default",
  padding = "md",
  children,
  ...props
}: CardProps) {
  const variants = {
    default: "bg-white border border-slate-200 shadow-sm",
    outlined: "bg-transparent border-2 border-slate-300 shadow-none hover:border-orange-500/50",
    elevated: "bg-white border border-slate-100 shadow-lg",
  };

  const paddings = {
    none: "p-0",
    sm: "p-3",
    md: "p-5",
    lg: "p-8",
  };

  return (
    <div
      className={`rounded-2xl ${variants[variant]} ${paddings[padding]} transition-all duration-300 hover:shadow-md ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}