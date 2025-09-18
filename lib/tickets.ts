export interface Ticket {
  id: string
  account_type: "HSV" | "OSV"
  ticket_code: string
  status: "available" | "generated" | "consumed" | "appended"
  generated_by?: string
  generated_at?: string
  consumed_at?: string
  appended_at?: string
  created_at: string
}

export interface PoolStats {
  HSV: {
    available: number
    generated: number
    consumed: number
    appended: number
    total: number
  }
  OSV: {
    available: number
    generated: number
    consumed: number
    appended: number
    total: number
  }
}

export async function generateTicket(userId: string, accountType: "HSV" | "OSV") {
  const response = await fetch("/api/tickets/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, accountType }),
  })

  return response.json()
}

export async function consumeTicket(ticketCode: string, userId: string) {
  const response = await fetch("/api/tickets/consume", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ticketCode, userId }),
  })

  return response.json()
}

export async function appendTicket(ticketCode: string, userId: string) {
  const response = await fetch("/api/tickets/append", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ticketCode, userId }),
  })

  return response.json()
}

export async function clearTickets(userId: string) {
  const response = await fetch("/api/tickets/clear", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  })

  return response.json()
}

export async function getPoolStats(): Promise<{ success: boolean; stats?: PoolStats; error?: string }> {
  const response = await fetch("/api/tickets/pools")
  return response.json()
}
