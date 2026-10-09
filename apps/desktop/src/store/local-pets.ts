import { atom } from 'nanostores'

// Local pet skins read from <userData>/pets/<id>/{pet.json,atlas.png} — a
// client-only alternative to the gateway petdex gallery (PLAN-ENVOY-B).

export interface LocalPetManifest {
  id: string
  displayName?: string
  frameW: number
  frameH: number
  columns: number
  stateRows: Record<string, number>
}

export interface LocalPetRejected {
  id: string
  reason: string
}

// $localPets: the last successful scan. $localPetsRejected: folders that
// failed validation, for a diagnostics view.
export const $localPets = atom<LocalPetManifest[]>([])
export const $localPetsRejected = atom<LocalPetRejected[]>([])

/** Re-scan <userData>/pets/ via the main process. No-ops outside Electron. */
export async function refreshLocalPets(): Promise<void> {
  const api = window.hermesDesktop?.localPets

  if (!api) {
    return
  }

  const { pets, rejected } = await api.list()

  $localPets.set(pets)
  $localPetsRejected.set(rejected)
}

/** Fetch one local pet's atlas as a data URL, or null if it's gone/invalid. */
export async function localPetAtlasDataUrl(id: string): Promise<string | null> {
  const base64 = await window.hermesDesktop?.localPets?.atlas(id)

  return base64 ? `data:image/png;base64,${base64}` : null
}
