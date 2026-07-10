import { forwardRef, useEffect, useRef, useState, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    const [shake, setShake] = useState(false);
    const prevError = useRef(error);

    useEffect(() => {
      if (error && error !== prevError.current) setShake(true);
      prevError.current = error;
    }, [error]);

    return (
      <div className="w-full">
        <div className="relative">
          <select
            ref={ref}
            onAnimationEnd={() => setShake(false)}
            className={cn(
              "w-full appearance-none rounded-xl border bg-panel px-4 py-2.5 pe-10 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-brand focus:shadow-[0_0_0_3px_rgb(var(--c-brand)/0.15),0_0_20px_-6px_rgb(var(--c-brand)/0.55)]",
              error ? "border-red-400" : "border-line",
              shake && "fx-shake",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
