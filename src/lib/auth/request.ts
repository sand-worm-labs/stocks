// A request that changes something has to come from this site's own pages, not from another site using the person's cookie
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export const isSecureRequest = (request: Request) =>
  (request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "")) === "https"
