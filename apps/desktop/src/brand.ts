import brand from '../brand.json'

/** Product naming and attribution; the single source is apps/desktop/brand.json. */
export const BRAND: Readonly<typeof brand> = Object.freeze(brand)

export const PRODUCT_NAME = BRAND.name

/** Shared-metrics consent, offers and senders are inert unless brand.json turns this on. */
export const TELEMETRY_ENABLED: boolean = BRAND.telemetry
