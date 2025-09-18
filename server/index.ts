import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { handleDemo } from "./routes/demo";
import {
  getNextTicket,
  consumeTicket,
  appendTicket,
  listAvailable,
} from "./routes/tickets";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Ticket routes
  app.get("/api/tickets/generate", getNextTicket);
  app.post("/api/tickets/consume", consumeTicket);
  app.post("/api/tickets/append", appendTicket);
  app.get("/api/tickets/available", listAvailable);

  // Serve static files in production
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../client")));
    app.get("*", (req, res) => {
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
