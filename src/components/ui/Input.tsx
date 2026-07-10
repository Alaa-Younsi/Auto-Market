import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    const [shake, setShake] = useState(false);
    const prevError = useRef(error);

    useEffect(() => {
      if (error && error !== prevError.current) setShake(true);
      prevError.current = error;
    }, [error]);

    return (
      <div className="w-full">
        <input
          ref={ref}
          onAnimationEnd={() => setShake(false)}
          className={cn(
            "w-full rounded-xl border bg-panel px-4 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-brand focus:shadow-[0_0_0_3px_rgb(var(--c-brand)/0.15),0_0_20px_-6px_rgb(var(--c-brand)/0.55)]",
            error ? "border-red-400" : "border-line",
            shake && "fx-shake",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
