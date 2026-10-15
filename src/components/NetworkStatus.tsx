"use client";

import { createClient } from "@/lib/supabase/client";
import { queueAll, queueRemove } from "@/lib/offline/storage";
import { useEffect, useState } from "react";

async function flushQueue() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const supabase = createClient();
  const ops = await queueAll();
  for (const op of ops) {
    try {
      if (op.operation === "insert") {
        const { error } = await supabase
          .from(op.table)
          .insert(op.payload as { [key: string]: unknown });
        if (error) throw error;
      } else if (op.operation === "update") {
        const id = (op.payload as { id?: string })?.id;
        if (!id) throw new Error("update sans id");
        const { error } = await supabase
          .from(op.table)
          .update(op.payload as { [key: string]: unknown })
          .eq("id", id);
        if (error) throw error;
      } else if (op.operation === "delete") {
        const id = (op.payload as { id?: string })?.id;
        if (!id) throw new Error("delete sans id");
        const { error } = await supabase.from(op.table).delete().eq("id", id);
        if (error) throw error;
      }
      if (op.id !== undefined) await queueRemove(op.id);
    } catch {
      // on garde dans la file pour un prochain essai
      break;
    }
  }
}

export default function NetworkStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const updateStatus = async () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) await flushQueue();
      const ops = await queueAll();
      setPending(ops.length);
    };
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    const timer = window.setInterval(updateStatus, 15000);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
      window.clearInterval(timer);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-full px-4 py-2 text-sm font-semibold shadow-lg ${
        online ? "bg-warning text-white" : "bg-danger text-white"
      }`}
    >
      {online ? `${pending} action(s) en attente` : "Hors connexion"}
    </div>
  );
}