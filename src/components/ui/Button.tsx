import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "accent" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-dark shadow-glow border border-transparent",
  secondary: "bg-panel-2 text-ink hover:bg-line border border-line",
  outline: "bg-transparent text-brand border border-brand hover:bg-brand/10",
  ghost: "bg-transparent text-ink hover:bg-panel-2 border border-transparent",
  accent:
    "bg-accent text-white hover:brightness-110 shadow-glow-green border border-transparent",
  danger: "bg-transparent text-red-500 border border-red-500 hover:bg-red-500/10",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-sm px-3.5 py-2 rounded-lg",
  md: "text-sm px-5 py-2.5 rounded-xl",
  lg: "text-base px-7 py-3.5 rounded-xl",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string
) {
  return cn(
    "fx-sweep inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => {
    return (
      <button ref={ref} className={buttonClasses(variant, size, className)} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
