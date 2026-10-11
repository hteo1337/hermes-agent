import brand from '../brand.json'

/** Product naming and attribution; the single source is apps/desktop/brand.json. */
export const BRAND: Readonly<typeof brand> = Object.freeze(brand)
