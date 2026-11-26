// A save refused because the strategy was saved by someone else, or by another step, since it was read
export class StoreConflict extends Error {
  constructor() {
    super("The strategy changed since it was read")
  }
}
