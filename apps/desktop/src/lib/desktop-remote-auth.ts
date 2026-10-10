import type { DesktopAuthProvider } from '@/global'
import { brandText } from '@/i18n/brand-text'

export interface RemoteAuthProviderShape {
  isPassword: boolean
  providerLabel: string
}

function providerDisplayName(provider: DesktopAuthProvider): string {
  return brandText(provider.displayName || provider.name)
}

export function deriveRemoteAuthProviderShape(
  providers: DesktopAuthProvider[] | null | undefined,
  fallback = 'your identity provider'
): RemoteAuthProviderShape {
  const list = providers ?? []

  if (list.length === 0) {
    return { isPassword: false, providerLabel: fallback }
  }

  return {
    isPassword: list.every(provider => Boolean(provider.supportsPassword)),
    providerLabel: list.map(providerDisplayName).join(' / ')
  }
}
