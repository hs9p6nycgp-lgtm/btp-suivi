"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SignOutButton from "@/components/SignOutButton";
import { t, getLangue, setLangue, Langue } from "@/lib/i18n";

const navItems = [
  { href: "/", label: "nav.accueil", icon: "🏠" },
  { href: "/chantiers", label: "nav.chantiers", icon: "🏗️" },
  { href: "/bpu", label: "nav.bpu", icon: "💰" },
  { href: "/calculateurs/devis", label: "nav.devis", icon: "📋" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [langue, setLangueState] = useState<Langue>(getLangue());

  useEffect(() => {
    setLangueState(getLangue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
      {/* Mobile overlay */}
      {isMobile && collapsed === false && (
        <div className="absolute inset-0 bg-black/50 z-39 backdrop-blur-sm" onClick={() => setCollapsed(true)} />
      )}
      <div className="flex flex-col h-full border-r border-slate-200 bg-white">
        {/* Logo */}
        <div className={`h-14 flex items-center justify-center px-4 border-b border-slate-200 ${collapsed ? "justify-center px-0" : "justify-start"}`}>
          {collapsed ? (
            <span className="text-xl font-bold">B</span>
          ) : (
            <span className="text-xl font-bold tracking-tight text-white bg-slate-900 rounded-lg px-2">BTP</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = typeof window !== "undefined" && window.location.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                  isActive
                    ? "bg-orange-50 text-orange-700"
                    : collapsed
                    ? "text-slate-500 hover:bg-slate-50"
                    : "text-slate-600 hover:bg-slate-50"
                } ${collapsed ? "justify-center px-2" : ""}`}
              >
                <span className={`text-lg ${collapsed ? "ml-0" : "ml-1"}`}>{item.icon}</span>
                {!collapsed && <span>{t(item.label)}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Langue et déconnexion */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center justify-between px-2 mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("langue.titre")}</span>
            <button
              onClick={() => {
                const next = langue === "fr" ? "en" : "fr";
                setLangue(next);
                setLangueState(next);
                window.location.reload();
              }}
              className="text-xs text-orange-600 font-medium hover:underline"
            >
              {langue === "fr" ? "🇬🇧 English" : "🇫🇷 Français"}
            </button>
          </div>
          <SignOutButton />
        </div>
      </div>

      {/* Mobile collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`absolute bottom-4 left-2 z-50 p-2 rounded-lg bg-white border border-slate-200 shadow-md hover:bg-slate-50 transition ${collapsed ? "ml-3" : ""}`}
      >
        <span className={`text-slate-600 ${collapsed ? "rotate-180" : ""}`}>›</span>
      </button>
    </aside>
  );
}