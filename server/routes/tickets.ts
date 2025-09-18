import type { RequestHandler } from "express"

export type Region = "NA" | "EU" | "FE"

const NA: string[] = ["4F7G9K1M2P", "B8N2Z3Q5X1", "9V3W1J7L6T"]
const EU: string[] = ["C5D8H2P0R7", "X1M4A8B9L3", "P7R2V4C5Q8"]
const FE: string[] = ["2L9X5F0N3Z", "J6K1V3B8P0", "W0T7Z5Q2Y8", "M3N9C1A7L4"]

const initialByRegion: Record<Region, string[]> = { NA, EU, FE }
const regionByCode = new Map<string, Region>()
Object.entries(initialByRegion).forEach(([r, list]) => list.forEach((c) => regionByCode.set(c, r as Region)))

// In-memory available pools per region
const availableByRegion: Record<Region, Set<string>> = {
  NA: new Set(NA),
  EU: new Set(EU),
  FE: new Set(FE),
}

// Track which region a consumed code belongs to
const usedRegionByCode = new Map<string, Region>()

const CODE_RE = /^[A-Z0-9]{10}$/
const isRegion = (x: unknown): x is Region => x === "NA" || x === "EU" || x === "FE"

export const getNextTicket: RequestHandler = (req, res) => {
  const region = String(req.query.region || "").toUpperCase()
  const userType = String(req.query.type || "HSV").toUpperCase()

  if (!isRegion(region)) return res.status(400).json({ error: "invalid_region" })
  if (userType !== "HSV" && userType !== "OSV") {
    return res.status(400).json({ error: "invalid_user_type" })
  }

  let availableTickets: string[] = []
  try {
    const ticketsData = JSON.parse(process.env.TICKETS_DATA || "{}")
    if (ticketsData[userType] && ticketsData[userType].available) {
      availableTickets = ticketsData[userType].available
    }
  } catch {
    const pool = availableByRegion[region]
    const iter = pool.values()
    const first = iter.next()
    if (first.done) return res.status(404).json({ error: "no_tickets_available" })
    return res.json({ code: first.value, availableCount: pool.size })
  }

  if (availableTickets.length === 0) {
    return res.status(404).json({ error: "no_tickets_available" })
  }

  const code = availableTickets[0]
  return res.json({ code, availableCount: availableTickets.length })
}

export const consumeTicket: RequestHandler = (req, res) => {
  const code = String(req.body?.code ?? "").toUpperCase()
  const userType = String(req.body?.userType || "HSV").toUpperCase()

  if (!CODE_RE.test(code)) return res.status(400).json({ error: "invalid_code" })

  let region: Region | undefined
  ;(Object.keys(availableByRegion) as Region[]).some((r) => {
    if (availableByRegion[r].has(code)) {
      region = r
      return true
    }
    return false
  })

  if (!region) {
    return res.json({ removed: false, reason: "not_in_available", availableCount: totalAvailableCount() })
  }

  availableByRegion[region].delete(code)
  usedRegionByCode.set(code, region)

  console.log(`[v0] Code ${code} consumed by user type: ${userType}`)

  return res.json({ removed: true, availableCount: totalAvailableCount() })
}

export const appendTicket: RequestHandler = (req, res) => {
  const code = String(req.body?.code ?? "").toUpperCase()
  if (!CODE_RE.test(code)) return res.status(400).json({ error: "invalid_code" })

  if (isInAnyAvailable(code)) {
    return res.json({ added: false, reason: "already_available", availableCount: totalAvailableCount() })
  }

  const region = usedRegionByCode.get(code) ?? regionByCode.get(code)
  if (!region) {
    return res.json({ added: false, reason: "unknown_code", availableCount: totalAvailableCount() })
  }

  availableByRegion[region].add(code)
  usedRegionByCode.delete(code)
  return res.json({ added: true, availableCount: totalAvailableCount() })
}

export const listAvailable: RequestHandler = (_req, res) => {
  return res.json({
    available: [
      ...Array.from(availableByRegion.NA),
      ...Array.from(availableByRegion.EU),
      ...Array.from(availableByRegion.FE),
    ],
  })
}

function isInAnyAvailable(code: string) {
  return availableByRegion.NA.has(code) || availableByRegion.EU.has(code) || availableByRegion.FE.has(code)
}

function totalAvailableCount() {
  return availableByRegion.NA.size + availableByRegion.EU.size + availableByRegion.FE.size
}
