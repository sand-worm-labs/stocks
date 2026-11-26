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

// Where this app is, as a person's browser and an agent reach it. Behind a proxy the request's own address is the proxy's, so the forwarded
// host and protocol say where it really is.
export function appOrigin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "")
  return `${protocol}://${host}`
}
