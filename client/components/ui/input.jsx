import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-xl bg-white/5 px-4 py-2 text-sm ring-offset-background",
        "placeholder:text-muted-foreground/50 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-purple-500/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "border border-white/10 backdrop-blur-xl shadow-[0_0_1px_1px_rgba(255,255,255,0.1)]",
        "transition-all duration-200 ease-out",
        "hover:bg-white/[0.07] focus:bg-white/[0.09]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input } 