import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "streak" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold transition-[transform,box-shadow,background-color,color,border-color,opacity] duration-150 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

    const variantStyles = {
      primary:
        "bg-brand-600 text-white shadow-3d-primary hover:bg-brand-500 hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#0f766e]",
      secondary:
        "bg-ai-600 text-white shadow-3d-ai hover:bg-ai-500 hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4338ca]",
      streak:
        "bg-streak-500 text-slate-900 shadow-3d-streak hover:bg-streak-400 hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#d97706]",
      outline:
        "bg-white text-slate-800 border-2 border-slate-200 shadow-3d-neutral hover:bg-slate-50 hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#cbd5e1]",
      ghost:
        "bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200",
      danger:
        "bg-red-500 text-white shadow-[0_4px_0_0_#b91c1c] hover:bg-red-400 hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#b91c1c]",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs font-semibold rounded-lg",
      md: "px-5 py-2.5 text-sm font-bold rounded-xl",
      lg: "px-7 py-3.5 text-base font-extrabold rounded-2xl",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
