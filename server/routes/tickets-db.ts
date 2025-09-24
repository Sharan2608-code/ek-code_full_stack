// Ticket DB routes: manage Ek-code tickets in MongoDB.
// - listAvailableDb: list all available tickets (with pool breakdown)
// - importTickets: upsert a list of tickets as available
// - deleteTickets: remove tickets that are currently available
// - consumeTicketDb: mark a specific code as used (assigned)
// - appendTicketDb: return a code to available
// - nextTicketDb: atomically get the next available code by preferred pools
import type { RequestHandler } from "express";
import { TicketModel, TicketPool } from "../models/Ticket";

const CODE_RE = /^[A-Z0-9]{10}$/;

/** GET /api/db/tickets/available
 * Response: { available: string[], counts: {HSV,OSV,Common}, byPool: {...} }
 */
export const listAvailableDb: RequestHandler = async (_req, res) => {
  const docs = await TicketModel.find({ status: "available" }).lean();
  const list = docs as any[];
  res.json({
    available: list.map((d: any) => d.code),
    counts: {
      HSV: list.filter((d: any) => d.pool === "HSV").length,
      OSV: list.filter((d: any) => d.pool === "OSV").length,
      Common: list.filter((d: any) => d.pool === "Common").length,
    },
    byPool: {
      HSV: list.filter((d: any) => d.pool === "HSV").map((d: any) => d.code),
      OSV: list.filter((d: any) => d.pool === "OSV").map((d: any) => d.code),
      Common: list.filter((d: any) => d.pool === "Common").map((d: any) => d.code),
    },
  });
};

/** POST /api/db/tickets/import
 * Body: { items: Array<{ code: string; pool: TicketPool }> }
 * Upserts tickets (idempotent) as available. Returns number inserted.
 */
export const importTickets: RequestHandler = async (req, res) => {
  const { items } = (req.body || {}) as { items?: Array<{ code: string; pool: TicketPool }> };
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "no_items" });
  const toInsert = [] as Array<{ code: string; pool: TicketPool; status: "available" | "used" }>;
  for (const it of items) {
    const code = String(it?.code || "").toUpperCase();
    const pool = (it?.pool === "OSV" ? "OSV" : it?.pool === "Common" ? "Common" : "HSV") as TicketPool;
    if (!CODE_RE.test(code)) continue;
    toInsert.push({ code, pool, status: "available" });
  }
  if (!toInsert.length) return res.status(400).json({ error: "no_valid_items" });

  const ops = toInsert.map((t) => ({ updateOne: { filter: { code: t.code }, update: { $setOnInsert: t }, upsert: true } }));
  const result = await TicketModel.bulkWrite(ops, { ordered: false }).catch(() => null);
  const upserts = result ? (result.upsertedCount || 0) : 0;
  res.json({ inserted: upserts });
};

/** POST /api/db/tickets/delete
 * Body: { codes: string[] }
 * Deletes tickets only if they are currently in available state.
 */
export const deleteTickets: RequestHandler = async (req, res) => {
  const { codes } = (req.body || {}) as { codes?: string[] };
  if (!Array.isArray(codes) || codes.length === 0) return res.status(400).json({ error: "no_codes" });
  const list = codes.map((c) => String(c || "").toUpperCase()).filter((c) => CODE_RE.test(c));
  const result = await TicketModel.deleteMany({ code: { $in: list }, status: "available" });
  res.json({ deleted: result.deletedCount || 0 });
};

/** POST /api/db/tickets/consume
 * Body: { code: string, userId?: string }
 * Marks code as used if it was available.
 */
export const consumeTicketDb: RequestHandler = async (req, res) => {
  const { code, userId } = req.body || {};
  const upper = String(code || "").toUpperCase();
  if (!CODE_RE.test(upper)) return res.status(400).json({ error: "invalid_code" });

  const doc = await TicketModel.findOneAndUpdate(
    { code: upper, status: "available" },
    { $set: { status: "used", assignedTo: userId || null } },
    { new: true }
  );
  if (!doc) return res.json({ removed: false, reason: "not_in_available", availableCount: await totalAvailableCountDb() });
  return res.json({ removed: true, availableCount: await totalAvailableCountDb() });
};

/** POST /api/db/tickets/append
 * Body: { code: string }
 * Returns code to available state if known.
 */
export const appendTicketDb: RequestHandler = async (req, res) => {
  const { code } = req.body || {};
  const upper = String(code || "").toUpperCase();
  if (!CODE_RE.test(upper)) return res.status(400).json({ error: "invalid_code" });

  const doc = await TicketModel.findOneAndUpdate(
    { code: upper },
    { $set: { status: "available", assignedTo: null } },
    { new: true }
  );
  if (!doc) return res.json({ added: false, reason: "unknown_code", availableCount: await totalAvailableCountDb() });
  return res.json({ added: true, availableCount: await totalAvailableCountDb() });
};

/** POST /api/db/tickets/next
 * Body: { userType?: TicketPool, userId?: string }
 * Preferred pools: Common first, then user's type (HSV/OSV). Returns { code }.
 */
export const nextTicketDb: RequestHandler = async (req, res) => {
  const { userType, userId } = (req.body || {}) as { userType?: TicketPool; userId?: string };
  const preferred: TicketPool[] = ["Common", userType === "OSV" ? "OSV" : "HSV"];
  for (const pool of preferred) {
    const doc = await TicketModel.findOneAndUpdate(
      { status: "available", pool },
      { $set: { status: "used", assignedTo: userId || null } },
      { new: true, sort: { createdAt: 1 } }
    );
    if (doc) {
      return res.json({ code: doc.code, availableCount: await totalAvailableCountDb() });
    }
  }
  return res.status(404).json({ error: "no_tickets_available" });
};

// Helper: count total available tickets
async function totalAvailableCountDb() {
  return TicketModel.countDocuments({ status: "available" });
}
