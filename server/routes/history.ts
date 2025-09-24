// History routes: record user/admin actions and list them for dashboards.
// Imports:
// - RequestHandler: Express handler type
// - HistoryModel: Mongoose model for history entries
import type { RequestHandler } from "express";
import { HistoryModel } from "../models/History";

/**
 * POST /api/history
 * Body: { type: 'generated'|'submitted'|'cleared', userId?, teamMember?, code, country?, comments?, clearanceId?, date? }
 * Creates a new history document. Date defaults to now.
 */
export const addHistory: RequestHandler = async (req, res) => {
  try {
    const { type, userId, teamMember, code, country, comments, clearanceId, date } = req.body || {};
    if (!type || !code) return res.status(400).json({ error: "missing_fields" });
    const doc = await HistoryModel.create({
      type,
      userId: userId || undefined,
      teamMember: teamMember || undefined,
      code: String(code).toUpperCase(),
      country: country || undefined,
      comments: comments || undefined,
      clearanceId: clearanceId || undefined,
      date: date ? new Date(date) : new Date(),
    });
    res.status(201).json({ id: String(doc._id) }); // Return created id for reference
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
};

/**
 * GET /api/history?type=&userId=&limit=
 * Returns history rows filtered by type and/or userId, sorted newest-first.
 */
export const listHistory: RequestHandler = async (req, res) => {
  try {
    const { type, userId, limit } = req.query as { type?: string; userId?: string; limit?: string };
    const q: any = {};
    if (type && ["generated", "submitted", "cleared"].includes(type)) q.type = type;
    if (userId) q.userId = userId;
    const lim = Math.min(Math.max(parseInt(String(limit || "100"), 10) || 100, 1), 500);
    const rows = await HistoryModel.find(q).sort({ date: -1 }).limit(lim).lean();
    res.json({ items: rows });
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
};
