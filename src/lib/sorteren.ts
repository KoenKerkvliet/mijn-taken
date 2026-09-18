import type { TaskWithMeta } from './types'

/** Vaste volgorde in elke lijst: eerst wat een datum heeft en het eerst
 *  afloopt, daarna op prioriteit, daarna op aanmaakmoment. */
export function sorteerTaken(taken: TaskWithMeta[]): TaskWithMeta[] {
  return [...taken].sort((a, b) => {
    if (a.due_date !== b.due_date) {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date < b.due_date ? -1 : 1
    }
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.created_at < b.created_at ? -1 : 1
  })
}
