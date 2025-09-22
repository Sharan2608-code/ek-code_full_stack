import type { RequestHandler } from "express";
import { UserModel } from "../models/User";
import bcrypt from "bcryptjs";

export const listUsers: RequestHandler = async (_req, res) => {
  const users = await UserModel.find().sort({ createdAt: -1 }).lean();
  res.json(
    (users as any[]).map((u) => ({ id: String(u._id), teamName: u.teamName, email: u.email, type: u.type }))
  );
};

export const createUser: RequestHandler = async (req, res) => {
  const { teamName, email, password, type } = req.body || {};
  if (!teamName || !email || !password) return res.status(400).json({ error: "missing_fields" });
  const exists = await UserModel.findOne({ email: String(email).toLowerCase().trim() }).lean();
  if (exists) return res.status(409).json({ error: "email_exists" });
  const passwordHash = await bcrypt.hash(String(password), 10);
  const doc = await UserModel.create({ teamName: String(teamName).trim(), email: String(email).trim().toLowerCase(), passwordHash, type: type === "OSV" ? "OSV" : "HSV" });
  res.status(201).json({ id: String(doc._id), teamName: doc.teamName, email: doc.email, type: doc.type });
};

export const updateUser: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { teamName, email, password, type } = req.body || {};
  const update: any = {};
  if (teamName) update.teamName = String(teamName).trim();
  if (email) update.email = String(email).trim().toLowerCase();
  if (typeof type === 'string') update.type = type === "OSV" ? "OSV" : "HSV";
  if (password) update.passwordHash = await bcrypt.hash(String(password), 10);
  const doc = await UserModel.findByIdAndUpdate(id, update, { new: true });
  if (!doc) return res.status(404).json({ error: "not_found" });
  res.json({ id: String(doc._id), teamName: doc.teamName, email: doc.email, type: doc.type });
};

export const deleteUser: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const doc = await UserModel.findByIdAndDelete(id);
  if (!doc) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
};

export const adminLogin: RequestHandler = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "missing_fields" });
  const user = await UserModel.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) return res.status(401).json({ error: "invalid_credentials" });
  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });
  res.json({ id: String(user._id), teamName: user.teamName, email: user.email, type: user.type });
};
