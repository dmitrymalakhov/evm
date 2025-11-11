"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[140px] w-full rounded-md border border-white/10 bg-black/40 px-4 py-3 text-sm leading-relaxed text-foreground outline-none transition-all placeholder:text-evm-muted focus:border-evm-accent/70 focus:ring-2 focus:ring-evm-accent/60",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };

