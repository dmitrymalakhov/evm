import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md border border-transparent px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matrix focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-evm-accent text-background shadow-[0_0_12px_rgba(184,71,63,0.45)] hover:bg-evm-accent/90",
        secondary:
          "bg-evm-steel/50 text-foreground border border-evm-steel/40 hover:bg-evm-steel/60",
        ghost:
          "bg-transparent text-foreground hover:bg-white/5 border border-white/5",
        outline:
          "bg-transparent text-foreground border border-evm-accent/40 hover:bg-evm-accent/10",
        destructive:
          "bg-red-700 text-white shadow-[0_0_14px_rgba(161,32,32,0.5)] hover:bg-red-600",
      },
      size: {
        default: "h-10 min-w-[120px]",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

