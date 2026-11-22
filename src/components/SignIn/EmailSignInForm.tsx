import { buttonVariants } from "@/components/Button/Button"

export function EmailSignInForm() {
  return (
    <form className="flex w-full flex-col gap-2">
      <label htmlFor="email" className="sr-only">
        Email
      </label>
      <input
        id="email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="you@company.com"
        className="border-border bg-base-100 text-ink-100 placeholder:text-placeholder-muted focus:border-primary focus:ring-primary dark:border-border-tertiary dark:bg-base-400 w-full rounded-full border px-5 py-3 text-sm font-medium outline-none focus:ring-1"
      />
      <button type="submit" className={buttonVariants({ intent: "dark", size: "md", className: "w-full" })}>
        Email me a sign-in link
      </button>
    </form>
  )
}
