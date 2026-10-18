"use client";

import * as React from "react";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "text" | "circle" | "rect";
  width?: string | number;
  height?: string | number;
};

export function Skeleton({ className = "", variant = "text", width, height, ...props }: SkeletonProps) {
  const base = "skeleton-shimmer";
  const styles: Record<string, React.CSSProperties> = {
    text: { height: "1rem", width: width ?? "100%", borderRadius: "0.5rem" },
    circle: { width: width ?? "2.5rem", height: height ?? "2.5rem", borderRadius: "9999px" },
    rect: { width: width ?? "100%", height: height ?? "2rem", borderRadius: "0.75rem" },
  };
  return (
    <div className={`${base} ${className}`} style={styles[variant]} {...props} />
  );
}
