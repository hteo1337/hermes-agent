import { channelPublicBase } from './channel-protocol'

import type { UpdaterStatusWire } from './index'

export function noFeedStatus(feedUrl: string): UpdaterStatusWire | null {
  if (resolveFeedBaseUrl(feedUrl)) {
    return null
  }

  return { supported: false, reason: 'no-update-feed', message: 'Updates are managed outside the app' }
}

/** A branded generic feed must be HTTPS or loopback and canonical. */
export function resolveFeedBaseUrl(configured: string): string {
  const value: string = configured.trim()

  if (!value) {
    return ''
  }

  channelPublicBase(value)

  return value
}
