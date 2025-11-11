"use client";

import { motion } from "framer-motion";

type ProgressBarProps = {
  value: number;
  label?: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <div className="space-y-2">
      {label ? (
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-evm-muted">
          <span>{label}</span>
          <span>{clamped}%</span>
        </div>
      ) : null}
      <div className="relative h-3 w-full overflow-hidden rounded-full border border-evm-steel/40 bg-black/40">
        <motion.div
          className="absolute inset-y-0 left-0 origin-left border-r border-evm-accent/70 bg-gradient-to-r from-evm-accent/80 via-evm-accent to-evm-accent/80 shadow-[0_0_18px_rgba(184,71,63,0.45)]"
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

