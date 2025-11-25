"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ConsoleFrameProps = React.HTMLAttributes<HTMLDivElement> & {
  glow?: "accent" | "matrix" | "none";
};

export function ConsoleFrame({
  glow = "accent",
  className,
  children,
  ...props
}: ConsoleFrameProps) {
  return (
    <div
      className={cn(
        "crt-frame relative border border-evm-steel/40 bg-evm-panel/80 p-6 backdrop-blur-sm",
        glow === "accent" && "shadow-[0_0_24px_rgba(184,71,63,0.3)]",
        glow === "matrix" && "shadow-[0_0_24px_rgba(8,200,112,0.28)]",
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(184,71,63,0.15),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(8,200,112,0.12),transparent_40%)] opacity-80 mix-blend-screen" />
      <div className="relative">{children}</div>
    </div>
  );
}

