import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}

/* The knob is anchored with `start-0.5`: a bare `absolute` span inside a
   <button> inherits the button's centered text alignment as its static
   position, which pushed it out of the track. */
export function Toggle({ checked, onChange, disabled, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-accent" : "bg-line"
      )}
      {...rest}
    >
      <span
        className={cn(
          "absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
