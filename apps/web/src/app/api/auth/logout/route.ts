import { NextResponse } from "next/server"

import { SANDWORM_COOKIE, SESSION_COOKIE } from "@/lib/auth/config"
import { isSameOrigin } from "@/lib/auth/request"

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Not allowed" }, { status: 403 })

  const response = NextResponse.json({ ok: true })
  response.cookies.delete(SESSION_COOKIE)
  response.cookies.delete(SANDWORM_COOKIE)
  return response
}
