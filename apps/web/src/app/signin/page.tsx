import { Metadata } from "next"

import { SignIn } from "@/components/SignIn/SignIn"

export const metadata: Metadata = { title: "Sign in" }

export default function SignInPage() {
  return <SignIn />
}
