// The domain a source is from, taken from its link, or from its name when the name is one ("nasdaq.com")
export function sourceDomain(name: string, url?: string) {
  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "")
    } catch {
      // A link that isn't one: fall through to the name
    }
  }
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(name) ? name.toLowerCase() : undefined
}

// The site's own icon. With `fallback_opts` a site that has none answers 404 instead of a stand-in globe, so a missing logo is seen as
// missing and the page can draw its own mark instead.
export const faviconUrl = (domain: string) =>
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(`https://${domain}`)}&size=64`
