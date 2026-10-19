"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis } from "recharts";
import type { PointeMini } from "./StatCard";

// Mini-courbe descriptive des cartes de statistiques (purement visuelle).
// Fichier séparé volontairement : recharts (≈ 100 Ko) n'est téléchargé que
// lorsque cette courbe est réellement affichée sur la page.
export default function StatCardCourbe({ points }: { points: PointeMini[] }) {
  return (
    <div className="mt-3 h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, left: 0, right: 6, bottom: 0 }}>
          <XAxis dataKey="x" tick={{ fontSize: 10 }} stroke="var(--border)" />
          <YAxis hide domain={[0, "auto"]} />
          <Line type="monotone" dataKey="y" stroke="var(--action)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
