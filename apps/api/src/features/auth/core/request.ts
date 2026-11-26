import type { IncomingHttpHeaders } from "node:http"

// A header sent twice arrives as a list; the first is the one that counts
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

// Behind a proxy (the web app passes the browser's requests on) the request's own host is this server's, so the forwarded one says where
// the person's browser is
const hostOf = (headers: IncomingHttpHeaders) => first(headers["x-forwarded-host"]) ?? headers.host

const protocolOf = (headers: IncomingHttpHeaders) => first(headers["x-forwarded-proto"])?.split(",")[0] ?? "http"

// A request that changes something has to come from this site's own pages, not from another site using the person's cookie
export function isSameOrigin(headers: IncomingHttpHeaders) {
  const { origin } = headers
  const host = hostOf(headers)
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export const isSecureRequest = (headers: IncomingHttpHeaders) => protocolOf(headers) === "https"

// Where the app is, as a person's browser and an agent reach it
export const appOrigin = (headers: IncomingHttpHeaders) => `${protocolOf(headers)}://${hostOf(headers)}`
