import { Metadata } from "next"

import { Partners } from "@/components/Partners/Partners"
import { SignIn } from "@/components/SignIn/SignIn"
import { SiteHeader } from "@/components/SiteHeader/SiteHeader"

export const metadata: Metadata = { title: "Sign in" }

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <SignIn />
      <Partners />
    </div>
  )
}
