"use client";

import * as React from "react";
import { Card } from "./Card";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: string; label: string; positive: boolean };
  color?: "blue" | "orange" | "emerald" | "rose" | "amber" | "slate";
};

const colorMap = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  rose: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  slate: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "slate",
}: StatCardProps) {
  const c = colorMap[color];
  return (
    <Card variant="default" padding="md" className="border-b-2 border-transparent hover:border-transparent">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg} ${c.text}`}>
          {icon ?? <span className="text-xl">📊</span>}
        </div>
      </div>
      <div className="mb-2">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
      {trend && (
        <p className={`text-xs font-semibold ${trend.positive ? "text-emerald-600" : "text-rose-600"}`}>
          {trend.value} {trend.label}
        </p>
      )}
    </Card>
  );
}