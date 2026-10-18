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
    default:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10",
    success:
      "bg-emerald-50 text-emerald-700 border-emerald-600/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/20",
    warning:
      "bg-amber-50 text-amber-700 border-amber-600/25 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/20",
    danger:
      "bg-rose-50 text-rose-700 border-rose-600/25 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/20",
    info: "bg-blue-50 text-blue-700 border-blue-600/25 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/20",
    primary: "bg-primary text-white border-primary shadow-sm shadow-primary/30",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm shadow-black/[0.02] ${variants[variant]} ${className}`}
      {...props}
    >
      {variantIcons[variant]}
      {children}
    </span>
  );
}
