"use client";

import { motion } from "framer-motion";

type QRTileProps = {
  code: string;
};

export function QRTile({ code }: QRTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative flex h-64 w-64 flex-col items-center justify-center rounded-lg border border-evm-steel/50 bg-black/60 p-6 shadow-[0_0_24px_rgba(184,71,63,0.18)]"
    >
      <div className="pointer-events-none absolute inset-4 grid grid-cols-8 grid-rows-8 gap-[2px]">
        {Array.from({ length: 64 }).map((_, index) => (
          <span
            key={index}
            className="h-full w-full rounded-[2px] bg-[rgba(255,255,255,0.08)]"
          />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <span className="text-xs uppercase tracking-[0.24em] text-evm-muted">
          QR PASS
        </span>
        <span className="rounded-md border border-evm-accent/40 bg-evm-accent/10 px-3 py-1 text-sm font-semibold uppercase tracking-[0.2em] text-evm-accent">
          {code}
        </span>
        <p className="text-[0.65rem] uppercase tracking-[0.24em] text-evm-muted">
          Представьте на входе в зону E.V.M.
        </p>
      </div>
    </motion.div>
  );
}

