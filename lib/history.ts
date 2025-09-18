export interface ActivityHistory {
  id: string
  user_id: string
  team_name: string
  account_type: "HSV" | "OSV"
  action: "generate" | "consume" | "append" | "clear"
  ticket_code?: string
  details?: Record<string, any>
  created_at: string
}

export interface ActivityStats {
  totalActivities: number
  byAction: {
    generate: number
    consume: number
    append: number
    clear: number
  }
  byAccountType: {
    HSV: number
    OSV: number
  }
  byTeam: Record<string, number>
  recentActivity: ActivityHistory[]
}

export interface HistoryFilters {
  userId?: string
  teamName?: string
  accountType?: "HSV" | "OSV"
  action?: "generate" | "consume" | "append" | "clear"
  limit?: number
  offset?: number
}

export async function fetchHistory(filters: HistoryFilters = {}) {
  const params = new URLSearchParams()

  if (filters.userId) params.append("userId", filters.userId)
  if (filters.teamName) params.append("teamName", filters.teamName)
  if (filters.accountType) params.append("accountType", filters.accountType)
  if (filters.action) params.append("action", filters.action)
  if (filters.limit) params.append("limit", filters.limit.toString())
  if (filters.offset) params.append("offset", filters.offset.toString())

  const response = await fetch(`/api/history?${params.toString()}`)
  return response.json()
}

export async function fetchActivityStats(): Promise<{
  success: boolean
  stats?: ActivityStats
  error?: string
}> {
  const response = await fetch("/api/history/stats")
  return response.json()
}

export function formatActivityAction(action: string): string {
  switch (action) {
    case "generate":
      return "Generated"
    case "consume":
      return "Consumed"
    case "append":
      return "Appended"
    case "clear":
      return "Cleared"
    default:
      return action
  }
}

export function getActivityColor(action: string): string {
  switch (action) {
    case "generate":
      return "text-blue-600"
    case "consume":
      return "text-green-600"
    case "append":
      return "text-purple-600"
    case "clear":
      return "text-red-600"
    default:
      return "text-gray-600"
  }
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}
