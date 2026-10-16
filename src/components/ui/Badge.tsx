"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "primary";
};

const variantIcons: Record<string, React.ReactNode> = {
  default: <Info className="h-3.5 w-3.5" />,
  success: <CheckCircle2 className="h-3.5 w-3.5" />,
  warning: <AlertTriangle className="h-3.5 w-3.5" />,
  danger: <XCircle className="h-3.5 w-3.5" />,
  info: <Info className="h-3.5 w-3.5" />,
  primary: <Info className="h-3.5 w-3.5" />,
};

export function Badge({ className = "", variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700 border border-slate-200",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-300",
    warning: "bg-amber-50 text-amber-800 border border-amber-300",
    danger: "bg-rose-50 text-rose-800 border border-rose-300",
    info: "bg-blue-50 text-blue-800 border border-blue-300",
    primary: "bg-primary text-white border border-primary",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${variants[variant]} ${className}`}
      {...props}
    >
      {variantIcons[variant]}
      {children}
    </span>
  );
}
