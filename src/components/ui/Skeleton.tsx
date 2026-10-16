"use client";

import * as React from "react";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "text" | "circle" | "rect";
  width?: string | number;
  height?: string | number;
};

export function Skeleton({ className = "", variant = "text", width, height, ...props }: SkeletonProps) {
  const base = "animate-pulse bg-slate-200 rounded";
  const styles: Record<string, React.CSSProperties> = {
    text: { height: "1rem", width: width ?? "100%" },
    circle: { width: width ?? "2.5rem", height: height ?? "2.5rem", borderRadius: "9999px" },
    rect: { width: width ?? "100%", height: height ?? "2rem", borderRadius: "0.5rem" },
  };
  return (
    <div className={`${base} ${className}`} style={styles[variant]} {...props} />
  );
}