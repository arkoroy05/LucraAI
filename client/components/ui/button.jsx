import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-purple-600 text-white hover:bg-purple-700 shadow-sm",
        destructive:
          "bg-red-500/20 text-red-500 hover:bg-red-500/30",
        outline:
          "border border-white/10 bg-white/5 text-white hover:bg-white/10",
        secondary:
          "bg-white/10 text-white hover:bg-white/20",
        ghost:
          "text-white/60 hover:text-white hover:bg-white/5",
        link: 
          "text-purple-400 underline-offset-4 hover:text-purple-300 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    (<Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />)
  );
}

export { Button, buttonVariants }
