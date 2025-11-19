"use client";

import { useEffect, useState, useMemo } from "react";

import { formatTimer } from "@/lib/utils";

type TimerProps = {
  target: string | number | Date;
  label?: string;
};

export function Timer({ target, label }: TimerProps) {
  const targetDate = useMemo(() => {
    console.log("[Timer] Raw target received:", target, "type:", typeof target);
    if (!target) {
      console.warn("Timer: No target provided");
      return Date.now() + 86_400_000; // Default to 24 hours from now
    }
    const date = new Date(target);
    const timestamp = date.getTime();
    // Check if date is valid
    if (isNaN(timestamp)) {
      console.warn("Timer: Invalid target date", target, "parsed as:", date, "Invalid Date:", date.toString());
      return Date.now() + 86_400_000; // Default to 24 hours from now
    }
    const now = Date.now();
    const diff = timestamp - now;
    // Always log for debugging
    console.log("[Timer] target:", target, "timestamp:", timestamp, "now:", now, "diff (ms):", diff, "diff (hours):", Math.round(diff / 3600000), "formatted target:", new Date(timestamp).toLocaleString("ru-RU"), "formatted now:", new Date(now).toLocaleString("ru-RU"));
    return timestamp;
  }, [target]);
  
  const [remaining, setRemaining] = useState(() => {
    const diff = targetDate - Date.now();
    const result = Math.max(diff, 0);
    console.log("[Timer] Initial remaining calculation - targetDate:", targetDate, "now:", Date.now(), "diff:", diff, "result:", result, "formatted:", formatTimer(result));
    return result;
  });

  // Update timer every second
  useEffect(() => {
    console.log("[Timer] Setting up interval with targetDate:", targetDate, "formatted:", new Date(targetDate).toLocaleString("ru-RU"));
    
    // Update function that calculates remaining time
    let tickCount = 0;
    const update = () => {
      tickCount++;
      const now = Date.now();
      const diff = targetDate - now;
      const newRemaining = Math.max(diff, 0);
      
      // Log every tick for first 5 ticks, then every 10 seconds
      if (tickCount <= 5 || newRemaining % 10000 < 1000) {
        console.log(`[Timer] Tick #${tickCount} - targetDate:`, targetDate, "now:", now, "diff:", diff, "remaining:", newRemaining, "formatted:", formatTimer(newRemaining));
      }
      
      setRemaining(newRemaining);
    };
    
    // Update immediately when targetDate changes
    update();
    
    // Then update every second
    const id = window.setInterval(update, 1000);
    console.log("[Timer] Interval started, ID:", id);
    
    return () => {
      console.log("[Timer] Clearing interval, ID:", id);
      window.clearInterval(id);
    };
  }, [targetDate]);

  const formatted = formatTimer(remaining);
  // Log render to see if component is re-rendering
  console.log("[Timer] Render - remaining:", remaining, "formatted:", formatted, "targetDate:", targetDate);
  
  return (
    <div className="space-y-1">
      {label ? (
        <p className="text-xs uppercase tracking-[0.25em] text-evm-muted">
          {label}
        </p>
      ) : null}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-mono text-evm-matrix tracking-[0.18em]">
          {formatted}
        </span>
        <span className="text-xs uppercase tracking-[0.3em] text-evm-muted">
          до события
        </span>
      </div>
    </div>
  );
}

