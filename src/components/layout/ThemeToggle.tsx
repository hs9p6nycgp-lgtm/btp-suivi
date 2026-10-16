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
      className="rounded-xl border border-border p-2 text-foreground transition hover:bg-slate-100 dark:hover:bg-white/10"
    >
      {court === "sombre" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
