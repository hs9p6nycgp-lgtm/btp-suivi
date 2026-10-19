"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { BarChart3 } from "lucide-react";
import { Card } from "./Card";
import { Skeleton } from "./Skeleton";

// recharts (≈ 100 Ko) n'est téléchargé que si la mini-courbe est affichée.
const StatCardCourbe = dynamic(() => import("./StatCardCourbe"), {
  loading: () => (
    <div className="mt-3">
      <Skeleton variant="rect" height="5rem" />
    </div>
  ),
});

// Point d'une mini-courbe (seulement affichée, pas de règle de calcul)
export type PointeMini = { x: string; y: number };

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: string; label: string; positive: boolean };
  color?: "blue" | "orange" | "emerald" | "rose" | "amber" | "slate";
  miniPoints?: PointeMini[];
  className?: string;
};

const colorMap = {
  blue: {
    tile: "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-500/30",
    bar: "from-blue-400 via-blue-500 to-blue-700",
  },
  orange: {
    tile: "bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-500/30",
    bar: "from-orange-300 via-orange-400 to-orange-600",
  },
  emerald: {
    tile: "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/30",
    bar: "from-emerald-400 via-emerald-500 to-emerald-700",
  },
  rose: {
    tile: "bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-500/30",
    bar: "from-rose-400 via-rose-500 to-rose-700",
  },
  amber: {
    tile: "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30",
    bar: "from-amber-300 via-amber-400 to-amber-600",
  },
  slate: {
    tile: "bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-500/30",
    bar: "from-slate-400 via-slate-500 to-slate-700",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "slate",
  miniPoints,
  className = "",
}: StatCardProps) {
  // Repli volontaire (BUG-016 / T-UI-14) : une couleur inconnue ne doit
  // jamais faire planter une page entière (repli gris neutre).
  const c = colorMap[color] ?? colorMap.slate;
  return (
    <Card variant="default" padding="md" className={`group relative overflow-hidden ${className}`}>
      {/* Liseré supérieur coloré */}
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${c.bar}`} aria-hidden />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110 ${c.tile}`}
        >
          {icon ?? <BarChart3 className="h-5 w-5" />}
        </div>
      </div>
      {/* Chiffres clés en Geist Mono, taille 28 à 36 px */}
      <div className="mb-2">
        <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground md:text-4xl">
          {value}
        </p>
      </div>
      {trend && (
        <p className={`text-xs font-semibold ${trend.positive ? "text-success" : "text-danger"}`}>
          {trend.value} {trend.label}
        </p>
      )}
      {/* Mini-courbe descriptive, purement visuelle */}
      {miniPoints && miniPoints.length > 0 && <StatCardCourbe points={miniPoints} />}
    </Card>
  );
}
