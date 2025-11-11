"use client";

import { useEffect, useState } from "react";

import { formatTimer } from "@/lib/utils";

type TimerProps = {
  target: string | number | Date;
  label?: string;
};

export function Timer({ target, label }: TimerProps) {
  const targetDate = new Date(target).getTime();
  const [remaining, setRemaining] = useState(() =>
    Math.max(targetDate - Date.now(), 0),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining(Math.max(targetDate - Date.now(), 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [targetDate]);

  return (
    <div className="space-y-1">
      {label ? (
        <p className="text-xs uppercase tracking-[0.25em] text-evm-muted">
          {label}
        </p>
      ) : null}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-mono text-evm-matrix tracking-[0.18em]">
          {formatTimer(remaining)}
        </span>
        <span className="text-xs uppercase tracking-[0.3em] text-evm-muted">
          до закрытия
        </span>
      </div>
    </div>
  );
}

