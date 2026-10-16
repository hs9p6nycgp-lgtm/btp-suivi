"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";
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
  blue: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  orange: { bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  rose: { bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  slate: { bg: "bg-slate-50 dark:bg-slate-800/40", text: "text-slate-700 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700" },
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
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">{title}</p>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg} ${c.text}`}>
          {icon ?? <BarChart3 className="h-5 w-5" />}
        </div>
      </div>
      {/* Chiffres clés en Geist Mono, taille 28 à 36 px */}
      <div className="mb-2">
        <p className="text-3xl md:text-4xl font-mono font-bold text-foreground">{value}</p>
      </div>
      {trend && (
        <p className={`text-xs font-semibold ${trend.positive ? "text-success" : "text-danger"}`}>
          {trend.value} {trend.label}
        </p>
      )}
    </Card>
  );
}
