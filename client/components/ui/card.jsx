import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  ...props
}) {
  return (
    (<div
      data-slot="card"
      className={cn(
        "rounded-xl border bg-[#1a0936]/50 text-white",
        "hover:bg-[#1a0936]/60 transition-all duration-200",
        "backdrop-blur-sm shadow-lg",
        className
      )}
      {...props} />)
  );
}

function CardHeader({
  className,
  ...props
}) {
  return (
    (<div
      data-slot="card-header"
      className={cn(
        "flex flex-col space-y-1.5 p-6",
        className
      )}
      {...props} />)
  );
}

function CardTitle({
  className,
  ...props
}) {
  return (
    (<h3
      data-slot="card-title"
      className={cn("text-xl font-semibold leading-none tracking-tight", className)}
      {...props} />)
  );
}

function CardDescription({
  className,
  ...props
}) {
  return (
    (<p
      data-slot="card-description"
      className={cn("text-sm text-white/60", className)}
      {...props} />)
  );
}

function CardAction({
  className,
  ...props
}) {
  return (
    (<div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props} />)
  );
}

function CardContent({
  className,
  ...props
}) {
  return (
    (<div
      data-slot="card-content"
      className={cn("p-6 pt-0", className)}
      {...props} />)
  );
}

function CardFooter({
  className,
  ...props
}) {
  return (
    (<div
      data-slot="card-footer"
      className={cn(
        "flex items-center p-6 pt-0",
        className
      )}
      {...props} />)
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
