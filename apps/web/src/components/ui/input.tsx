"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-md border border-white/10 bg-black/40 px-4 text-sm uppercase tracking-[0.18em] text-foreground shadow-inner shadow-evm-steel/20 outline-none transition-all placeholder:text-evm-muted focus:border-evm-accent/70 focus:ring-2 focus:ring-evm-accent/60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };

