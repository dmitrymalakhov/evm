"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    aria-orientation={orientation}
    className={cn(
      orientation === "horizontal"
        ? "h-px w-full bg-gradient-to-r from-transparent via-evm-steel/60 to-transparent"
        : "h-full w-px bg-gradient-to-b from-transparent via-evm-steel/60 to-transparent",
      className,
    )}
    {...props}
  />
));
Separator.displayName = "Separator";

export { Separator };

