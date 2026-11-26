import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

// False while the page is being made on the server and while it is first drawn in the browser, true after. For what the server can't know,
// like which theme the browser is in, so the first drawing is the same in both and the real thing follows.
export const useMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
