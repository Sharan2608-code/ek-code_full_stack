// Server entry: configures Express app, connects to DB, and registers API routes.
// Imports:
// - dotenv/config: loads environment variables from .env
// - express: HTTP server framework
// - cors: enables Cross-Origin Resource Sharing
// - path: path utilities for serving static files in production
// - handleDemo: example demo route
// - connectDB: initializes MongoDB connection (non-blocking)
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { handleDemo } from "./routes/demo";
import { connectDB } from "./db";
// User routes: CRUD + admin login
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  adminLogin,
} from "./routes/users";
// Ticket routes: MongoDB-backed ticket pool operations
import {
  listAvailableDb,
  importTickets,
  deleteTickets,
  consumeTicketDb,
  appendTicketDb,
  nextTicketDb,
} from "./routes/tickets-db";
// History routes: record and query user/admin actions
import { addHistory, listHistory } from "./routes/history";

// createServer(): builds and returns an Express app instance configured
// with middleware, DB connection, and API endpoints.
export function createServer() {
  const app = express();

  // Middleware: CORS + JSON/urlencoded body parsing
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize DB connection (non-blocking). Errors are logged.
  connectDB().catch((err) => console.error("[DB] connection failed", err));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Legacy in-memory ticket routes removed; using DB-backed endpoints below

  // User management routes (MongoDB)
  app.get("/api/users", listUsers);
  app.post("/api/users", createUser);
  app.put("/api/users/:id", updateUser);
  app.delete("/api/users/:id", deleteUser);
  app.post("/api/admin/login", adminLogin);

  // Ticket routes backed by MongoDB
  app.get("/api/db/tickets/available", listAvailableDb);
  app.post("/api/db/tickets/import", importTickets);
  app.post("/api/db/tickets/delete", deleteTickets);
  app.post("/api/db/tickets/consume", consumeTicketDb);
  app.post("/api/db/tickets/append", appendTicketDb);
  app.post("/api/db/tickets/next", nextTicketDb);

  // History routes (MongoDB)
  app.get("/api/history", listHistory);
  app.post("/api/history", addHistory);

  // Serve static files in production: Vite-built client assets
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../client")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "../client/index.html"));
    });
  }

  return app;
}

// When NODE_ENV=production and this file is executed directly,
// start listening on the configured port.
if (process.env.NODE_ENV === "production") {
  const port = process.env.PORT || 8080;
  const app = createServer();
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

