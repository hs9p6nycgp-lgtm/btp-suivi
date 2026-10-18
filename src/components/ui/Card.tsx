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
    default: "bg-surface border border-border/80 shadow-soft hover:shadow-soft-lg",
    outlined: "bg-transparent border-2 border-primary/30 shadow-none hover:border-primary/60",
    elevated: "bg-surface border border-border/70 shadow-soft-lg",
  };

  const paddings = {
    none: "p-0",
    sm: "p-3",
    md: "p-5",
    lg: "p-8",
  };

  return (
    <div
      className={`rounded-2xl ${variants[variant]} ${paddings[padding]} transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
