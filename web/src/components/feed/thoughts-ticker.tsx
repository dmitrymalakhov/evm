"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

import { useFeedStore } from "@/store/use-feed-store";
import { formatRelative } from "@/lib/utils";

export function ThoughtsTicker() {
  const { thoughts, load } = useFeedStore();

  useEffect(() => {
    void load();
  }, [load]);

  if (thoughts.length === 0) {
    return (
      <div className="rounded-md border border-evm-steel/40 bg-black/40 px-4 py-3 text-xs uppercase tracking-[0.2em] text-evm-muted">
        Нет анонимных мыслей. Матрица слушает тишину.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-md border border-evm-steel/40 bg-black/40">
      <motion.div
        animate={{
          x: ["0%", "-100%"],
        }}
        transition={{
          repeat: Infinity,
          repeatType: "loop",
          duration: thoughts.length * 8,
          ease: "linear",
        }}
        className="flex min-w-max gap-8 px-6 py-3 text-xs uppercase tracking-[0.32em] text-evm-muted"
      >
        {thoughts.map((thought) => (
          <span key={thought.id} className="flex items-center gap-3">
            <span className="rounded-full bg-evm-accent/70 px-2 py-0.5 text-[0.6rem] text-background shadow-[0_0_6px_rgba(184,71,63,0.5)]">
              {formatRelative(thought.createdAt)}
            </span>
            <span>{thought.text}</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

