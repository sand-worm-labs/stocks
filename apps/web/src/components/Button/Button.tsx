import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  [
    "justify-center",
    "inline-flex",
    "items-center",
    "rounded-full",
    "text-center",
    "border",
    "transition-colors",
    "delay-50",
  ],
  {
    variants: {
      intent: {
        primary: ["bg-primary", "border-primary", "text-primary-foreground", "hover:enabled:bg-primary-710"],
        outline: [
          "bg-inputBg",
          "text-ink-100",
          "border-border",
          "hover:border-primary",
          "hover:bg-border-secondary",
          "dark:bg-transparent",
          "dark:border-border-tertiary",
        ],
        create: [
          "rounded-xl",
          "bg-primary",
          "border-transparent",
          "text-white",
          "hover:bg-primary-300",
          "dark:bg-create-project-tint/16",
          "dark:border-border-tertiary",
          "dark:shadow-[0px_2px_2px_-1px_rgba(0,0,0,0.12),0px_4px_4px_-2px_rgba(0,0,0,0.12)]",
        ],
        dark: [
          "bg-base-400",
          "text-white",
          "border-transparent",
          "hover:opacity-85",
          "dark:bg-white",
          "dark:text-black",
        ],
        danger: ["bg-red-600", "text-white", "border-transparent", "hover:opacity-85"],
        secondary: [
          "bg-transparent",
          "border-primary",
          "text-primary",
          "hover:enabled:bg-primary",
          "hover:enabled:text-primary-foreground",
        ],
      },
      size: {
        compact: ["gap-2", "text-sm", "py-2", "px-6"],
        md: ["min-h-12", "text-sm", "font-medium", "py-3", "px-4"],
        sm: ["min-w-20", "h-full", "min-h-10", "text-sm", "py-1.5", "px-4"],
        lg: ["min-w-32", "h-full", "min-h-12", "text-lg", "py-2.5", "px-6"],
      },
      underline: { true: ["underline"], false: [] },
    },
    defaultVariants: {
      intent: "primary",
      size: "lg",
    },
  }
)
