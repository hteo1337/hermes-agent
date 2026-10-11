import { useState } from 'react'

import type { PetChip, PetChipChoice } from '@/store/pet-chips'

const MAX_VISIBLE = 3
const REARM_MS = 6000

const surface = {
  alignItems: 'center',
  background: 'var(--ui-bg-elevated)',
  border: '1px solid var(--ui-stroke-secondary)',
  borderRadius: 10,
  boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
  color: 'var(--foreground)',
  display: 'flex',
  fontSize: 11,
  gap: 6,
  lineHeight: 1.2,
  maxWidth: 232,
  padding: '5px 8px'
} as const

const button = (primary: boolean) =>
  ({
    background: primary ? 'var(--primary)' : 'transparent',
    border: '1px solid var(--ui-stroke-secondary)',
    borderRadius: 6,
    color: primary ? 'var(--primary-foreground)' : 'var(--foreground)',
    cursor: 'pointer',
    fontSize: 11,
    padding: '2px 7px'
  }) as const

const stop = (e: React.SyntheticEvent) => e.stopPropagation()

interface PetChipsProps {
  chips: readonly PetChip[]
  // Resolves false (or rejects) when the answer did not land, so the buttons re-arm.
  onAnswer: (chip: PetChip, choice: PetChipChoice) => Promise<boolean> | void
  side?: 'left' | 'right'
}

export function PetChips({ chips, onAnswer, side }: PetChipsProps) {
  const [answered, setAnswered] = useState<ReadonlySet<string>>(new Set())

  if (!chips.length) {
    return null
  }

  const shown = chips.slice(0, MAX_VISIBLE)
  const hidden = chips.length - shown.length

  const answer = (chip: PetChip, choice: PetChipChoice) => {
    const settle = (keep: boolean) =>
      setAnswered(prev => {
        const next = new Set(prev)

        if (keep) {
          next.add(chip.key)
        } else {
          next.delete(chip.key)
        }

        return next
      })

    settle(true)
    // The overlay gets no reply, so re-arm if the chip is still here after a while.
    setTimeout(() => settle(false), REARM_MS)
    void Promise.resolve(onAnswer(chip, choice))
      .then(ok => ok === false && settle(false))
      .catch(() => settle(false))
  }

  return (
    <div
      aria-label="Tasks"
      onPointerDown={stop}
      onPointerUp={stop}
      role="group"
      style={{
        alignItems: side === 'left' ? 'flex-start' : side === 'right' ? 'flex-end' : 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}
    >
      {shown.map(chip =>
        chip.kind === 'approval' ? (
          <div key={chip.key} role="alertdialog" style={surface} title={`${chip.title}\n${chip.command ?? ''}`}>
            <span
              style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >{`Run ${chip.command || 'a command'}?`}</span>
            <button
              aria-label={`Deny: ${chip.command ?? ''}`}
              disabled={answered.has(chip.key)}
              onClick={() => answer(chip, 'deny')}
              style={button(false)}
              type="button"
            >
              Deny
            </button>
            <button
              aria-label={`Allow once: ${chip.command ?? ''}`}
              disabled={answered.has(chip.key)}
              onClick={() => answer(chip, 'once')}
              style={button(true)}
              type="button"
            >
              Allow
            </button>
          </div>
        ) : (
          <div key={chip.key} style={surface} title={chip.title}>
            <span aria-hidden style={{ background: 'var(--primary)', borderRadius: 999, height: 6, width: 6 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chip.title}</span>
          </div>
        )
      )}
      {hidden > 0 && <div style={{ ...surface, padding: '3px 8px' }}>{`+${hidden} more`}</div>}
    </div>
  )
}
