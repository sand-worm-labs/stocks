// The first run belongs to an account, not to a browser: the cookie says which account has been through it, so someone new signing
// in on a browser another person used still gets it. With no one signed in (sign-in switched off) it is one marker for the browser.
// On its own, away from the cookies, so the middleware can use it.
export const onboardedMarker = (userId?: string) => userId ?? "1"
