import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { handleDemo } from "./routes/demo";
import { connectDB } from "./db";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  adminLogin,
} from "./routes/users";
import {
  listAvailableDb,
  importTickets,
  deleteTickets,
  consumeTicketDb,
  appendTicketDb,
  nextTicketDb,
} from "./routes/tickets-db";
import { addHistory, listHistory } from "./routes/history";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize DB connection (non-blocking)
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

  // Serve static files in production
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../client")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "../client/index.html"));
    });
  }

  return app;
}

// Start the server directly when running in production
if (process.env.NODE_ENV === "production") {
  const port = process.env.PORT || 8080;
  const app = createServer();
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

