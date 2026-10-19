"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Courbes « prévu / réalisé » de l'accueil. Fichier séparé volontairement :
// recharts (≈ 100 Ko) n'est téléchargé qu'à l'affichage de cette section.

type PointPlanRealise = { x: string; planifiee: number | null; realisee: number | null };

export default function CourbePlanRealise({
  donnees,
  langue,
}: {
  donnees: PointPlanRealise[];
  langue: "fr" | "en";
}) {
  return (
    <>
      {/* Courbe du plan prévu : avancement en % */}
      <div className="mb-6 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={donnees} margin={{ top: 10, left: 10, right: 20, bottom: 10 }}>
            <XAxis dataKey="x" tick={{ fontSize: 11 }} stroke="var(--border)" />
            <YAxis
              domain={[0, 100]}
              unit="%"
              tick={{ fontSize: 11 }}
              stroke="var(--border)"
              label={{ value: "Avancement", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(valeur) => [
                `${Number(valeur).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}%`,
                "Avancement",
              ]}
            />
            <Line type="monotone" dataKey="planifiee" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Courbe des dépenses réelles : cumul des montants FCFA */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted">Dépenses réelles</h3>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={donnees} margin={{ top: 10, left: 10, right: 20, bottom: 10 }}>
              <XAxis dataKey="x" tick={{ fontSize: 11 }} stroke="var(--border)" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="var(--border)"
                tickFormatter={(valeur) => `${Number(valeur) / 1000} k`}
              />
              <Tooltip
                formatter={(valeur) => [
                  `${Number(valeur).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} FCFA`,
                  "Dépenses",
                ]}
              />
              <Line type="monotone" dataKey="realisee" stroke="var(--action)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
