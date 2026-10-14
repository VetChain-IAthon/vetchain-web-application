import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-muted",
      "focus:border-brand focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-brand",
      "aria-[invalid=true]:border-brand-strong disabled:bg-canvas disabled:text-ink-muted",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
