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
  primary: "bg-orange-600",
  success: "bg-emerald-600",
  warning: "bg-amber-600",
  danger: "bg-rose-600",
};

export function ProgressBar({ value, label, showValue = true, size = "md", color = "primary" }: ProgressBarProps) {
  const height = size === "sm" ? "h-1.5" : "h-2";
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1.5 text-xs font-semibold text-slate-600">
          <span>{label}</span>
          {showValue && <span>{clamped.toFixed(0)}%</span>}
        </div>
      )}
      <div className={`w-full ${height} rounded-full bg-slate-200 overflow-hidden`}>
        <div className={`h-full ${colorMap[color]} transition-all duration-700 ease-out`} style={{ width: `${clamped}%` }}></div>
      </div>
    </div>
  );
}