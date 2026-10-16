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
    default: "bg-surface border border-border shadow-sm",
    outlined: "bg-transparent border-2 border-primary/40 shadow-none hover:border-primary",
    elevated: "bg-surface border border-border shadow-lg",
  };

  const paddings = {
    none: "p-0",
    sm: "p-3",
    md: "p-5",
    lg: "p-8",
  };

  return (
    <div
      className={`rounded-xl ${variants[variant]} ${paddings[padding]} transition-all duration-200 hover:shadow-md ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
