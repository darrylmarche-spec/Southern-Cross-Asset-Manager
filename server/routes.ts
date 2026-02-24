import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      return res.json({
        username: user.username,
        role: user.role,
      });
    } catch (e) {
      console.error("Login error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/users", async (_req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const safe = allUsers.map(u => ({
        username: u.username,
        role: u.role,
      }));
      return res.json(safe);
    } catch (e) {
      console.error("Get users error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const { username, role } = req.body;
      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const user = await storage.createUser({
        username,
        password: "password123",
        role: role || "member",
      });

      return res.json({
        username: user.username,
        role: user.role,
      });
    } catch (e) {
      console.error("Create user error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/users/:username", async (req: Request, res: Response) => {
    try {
      const username = req.params.username as string;
      const lowerUsername = username.toLowerCase();
      if (lowerUsername === "admin" || lowerUsername === "darryl") {
        return res.status(403).json({ error: "Cannot delete default admin accounts" });
      }

      await storage.deleteUser(username);
      return res.json({ success: true });
    } catch (e) {
      console.error("Delete user error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
