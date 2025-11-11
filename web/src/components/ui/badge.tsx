"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
  {
    variants: {
      variant: {
        default: "border-evm-accent/40 bg-evm-accent/20 text-evm-accent",
        outline: "border-evm-steel/40 text-evm-muted",
        success: "border-evm-matrix/40 bg-evm-matrix/10 text-evm-matrix",
        warning: "border-evm-accent-muted/50 bg-evm-accent-muted/15 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

