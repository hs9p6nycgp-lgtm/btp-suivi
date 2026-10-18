"use client";

import * as React from "react";

type PageHeaderProps = {
  /** Petite ligne au-dessus du titre (ex : « Portefeuille ») */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Icône affichée dans une tuile dégradée à gauche du titre */
  icon?: React.ReactNode;
  /** Boutons ou liens alignés à droite */
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`anim-fade-up mb-6 flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div className="flex items-start gap-3">
        {icon && (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-deep text-white shadow-md shadow-primary/25">
            {icon}
          </span>
        )}
        <div>
          {eyebrow && (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}
