"use client";

import * as React from "react";

type ProgressBarProps = {
  value: number; // 0-100
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md";
  color?: "primary" | "success" | "warning" | "danger";
};

const colorMap = {
  primary: "bg-gradient-to-r from-action to-action-strong",
  success: "bg-gradient-to-r from-emerald-500 to-emerald-600",
  warning: "bg-gradient-to-r from-amber-400 to-amber-600",
  danger: "bg-gradient-to-r from-rose-500 to-rose-600",
};

export function ProgressBar({ value, label, showValue = true, size = "md", color = "primary" }: ProgressBarProps) {
  const height = size === "sm" ? "h-1.5" : "h-2.5";
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex justify-between text-xs font-semibold text-muted">
          <span>{label}</span>
          {showValue && <span className="tabular-nums">{clamped.toFixed(0)}%</span>}
        </div>
      )}
      <div
        className={`w-full ${height} overflow-hidden rounded-full bg-slate-200/80 shadow-inner dark:bg-slate-700/60`}
      >
        <div
          className={`h-full rounded-full ${colorMap[color]} shadow-sm transition-all duration-500 ease-out`}
          style={{ width: `${clamped}%` }}
        ></div>
      </div>
    </div>
  );
}
