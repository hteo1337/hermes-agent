import brand from './brand.json'

export interface DesktopEndpoints {
  portal: string
  hubUrl: string
  docsUrl: string
  updateFeedUrl: string
  modelCatalogUrl: string
}

export const ENDPOINTS: Readonly<DesktopEndpoints> = Object.freeze(brand.endpoints)
export const UPDATE_REPOSITORY: string = brand.updateRepository

export function endpointUrl(base: string, suffix: string): string {
  return base ? `${base.replace(/\/+$/, '')}${suffix}` : ''
}
