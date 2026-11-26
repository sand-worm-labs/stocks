// The cookies the first run leaves in the browser. The web app writes them; sign-in reads `done` to say whether the person has been through it.
export const ONBOARDING_COOKIES = {
  done: "sw_onboarded",
  welcome: "sw_welcome",
  name: "sw_name",
  interests: "sw_interests",
} as const
