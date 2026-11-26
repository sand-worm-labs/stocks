import { settings } from "@/config/settings"

export const SANDWORM_WEB_URL = () => settings().sandworm.webUrl

// A notebook link has to lead to Sandworm. A result comes from an agent, and a link in it must not be able to send a person elsewhere.
export function isSandwormLink(url: string) {
  try {
    return new URL(url).origin === new URL(SANDWORM_WEB_URL()).origin
  } catch {
    return false
  }
}
