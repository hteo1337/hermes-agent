/**
 * Bot Mode has to keep linking against an OLDER desktop SDK.
 *
 * `ConnectorsTab`, `ToolsetConfigPanel` and `CapabilitiesView` are capability exports: the
 * shell that hosts the plugin may predate any of them. Every use site is
 * therefore guarded, and the plugin module graph must evaluate — and still
 * hand back a registrable plugin — when all three are missing. A bare
 * top-level use of one of them turns a missing export into a blank Bots pane
 * on an older build, which is exactly the failure this pins.
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('@hermes/plugin-sdk', async importOriginal => ({
  ...(await importOriginal<typeof import('@hermes/plugin-sdk')>()),
  ConnectorsTab: undefined,
  CapabilitiesView: undefined,
  ToolsetConfigPanel: undefined
}))

const plugin = (await import('./plugin')).default
const { CapabilitiesView, capabilitiesViewRoutesConnections } = await import('./profile-config')

describe('an SDK without the optional capability exports', () => {
  it('still links Bot Mode into a registrable plugin', () => {
    expect(plugin.id).toBe('hermes-bots')
    expect(typeof plugin.register).toBe('function')
  })

  it('leaves the CapabilitiesView connection-routing capability off', () => {
    // `capabilitiesViewRoutesConnections` gates whether a source-scoped bot may open
    // the Capabilities tab at all — with no CapabilitiesView it must read false, not
    // throw on the missing export.
    expect(CapabilitiesView).toBeUndefined()
    expect(capabilitiesViewRoutesConnections).toBe(false)
  })
})
