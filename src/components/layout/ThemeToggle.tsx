"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { t } from "@/lib/i18n";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [court, setCourt] = useState<"clair" | "sombre">("clair");

  useEffect(() => {
    setCourt(resolvedTheme === "dark" ? "sombre" : "clair");
  }, [resolvedTheme]);

  return (
    <button
      type="button"
      onClick={() => setTheme(court === "sombre" ? "light" : "dark")}
      aria-label={t("topbar.theme")}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-surface text-muted shadow-sm transition hover:border-primary-light/50 hover:text-foreground"
    >
      {court === "sombre" ? (
        <Sun className="h-5 w-5 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="h-5 w-5 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
