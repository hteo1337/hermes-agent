import { openExternalLink } from '@/lib/external-link'

import { ENDPOINTS, endpointUrl } from '../../../../../endpoints'

export async function openConnectorsAdmin(): Promise<void> {
  const url = endpointUrl(ENDPOINTS.portal, '/connectors')

  if (url) {
    openExternalLink(url)
  }
}
