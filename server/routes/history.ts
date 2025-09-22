import type { RequestHandler } from "express";
import { HistoryModel } from "../models/History";

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
    res.status(201).json({ id: String(doc._id) });
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
};

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
