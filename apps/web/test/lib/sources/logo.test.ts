import { describe, expect, it } from "vitest"

import { faviconUrl, sourceDomain } from "@/lib/sources/logo"

describe("sourceDomain", () => {
  it("takes the domain from the link, without www", () => {
    expect(sourceDomain("Nasdaq", "https://www.nasdaq.com/articles/x")).toBe("nasdaq.com")
  })

  it("takes the name when it is a domain and there is no link", () => {
    expect(sourceDomain("sec.gov")).toBe("sec.gov")
  })

  it("has none for a plain name with no link", () => {
    expect(sourceDomain("Yahoo Finance")).toBeUndefined()
  })
})

describe("faviconUrl", () => {
  it("asks for a 404 when the site has no icon", () => {
    expect(faviconUrl("sec.gov")).toContain("fallback_opts=TYPE,SIZE,URL")
    expect(faviconUrl("sec.gov")).toContain(encodeURIComponent("https://sec.gov"))
  })
})
