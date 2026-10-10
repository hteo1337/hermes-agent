import { computed } from 'nanostores'

import { $gateway } from '@/store/gateway'
import {
  $approvalRequests,
  answerApproval,
  type ApprovalRequest,
  clearApprovalRequest,
  sessionApprovalRequests
} from '@/store/prompts'
import { $sessions } from '@/store/session'
import { $workingSessionIds } from '@/store/session-states'

// Plain JSON: the pop-out overlay has no gateway, so these cross IPC.
export type PetChipKind = 'approval' | 'working'

export interface PetChip {
  command?: string
  key: string
  kind: PetChipKind
  requestId?: string
  sessionId: string
  title: string
}

// Broader grants (session / always) stay in the chat card.
export type PetChipChoice = 'deny' | 'once'

interface SessionLike {
  id: string
  preview?: null | string
  title?: null | string
}

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

export function petChipsFrom(
  working: readonly string[],
  approvals: Record<string, ApprovalRequest | undefined>,
  sessions: readonly SessionLike[]
): PetChip[] {
  const titleOf = (id: string) => {
    const s = sessions.find(item => item.id === id)

    return oneLine(s?.title || s?.preview || '') || 'Session'
  }

  const asks = Object.values(approvals).flatMap(request =>
    request?.requestId && request.sessionId
      ? [
          {
            command: oneLine(request.command || request.description || ''),
            key: `approval:${request.sessionId}:${request.requestId}`,
            kind: 'approval' as const,
            requestId: request.requestId,
            sessionId: request.sessionId,
            title: titleOf(request.sessionId)
          }
        ]
      : []
  )

  const asking = new Set(asks.map(chip => chip.sessionId))

  const running = working
    .filter(id => !asking.has(id))
    .map(id => ({ key: `working:${id}`, kind: 'working' as const, sessionId: id, title: titleOf(id) }))

  return [...asks, ...running]
}

export const $petChips = computed([$workingSessionIds, $approvalRequests, $sessions], petChipsFrom)

// Re-reads the live queue: an overlay payload is never trusted for what is approved.
export async function answerPetChip(sessionId: string, requestId: string, choice: string): Promise<boolean> {
  if (choice !== 'once' && choice !== 'deny') {
    return false
  }

  const request = sessionApprovalRequests(sessionId)
    .get()
    .find(item => item.requestId === requestId)

  const gateway = $gateway.get()

  if (!request || !gateway) {
    return false
  }

  if (!(await answerApproval(gateway, request, choice))) {
    return false
  }

  clearApprovalRequest(sessionId, requestId)

  return true
}
