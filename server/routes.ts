import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { verifyPassword } from "../lib/auth";
import {
  insertProjectSchema,
  insertTaskStateSchema,
  insertReportSchema,
  insertMessageSchema,
} from "@shared/schema";

// ── Session type augmentation ─────────────────────────────────────────────────

declare module "express-session" {
  interface SessionData {
    user: { username: string; role: string };
  }
}

// ── Auth middleware ───────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── Route registration ────────────────────────────────────────────────────────

export async function registerRoutes(app: Express): Promise<Server> {

  // ── Auth ──────────────────────────────────────────────────────────────────

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      // Fix #1: use timing-safe password verification against the stored hash.
      if (!user || !(await verifyPassword(password, user.password))) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Fix #2: persist identity in a server-side session.
      req.session.user = { username: user.username, role: user.role };

      return res.json({ username: user.username, role: user.role });
    } catch (e) {
      console.error("Login error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true });
    });
  });

  // All routes below require an active session.
  app.use("/api", requireAuth);

  // ── Users ─────────────────────────────────────────────────────────────────

  app.get("/api/users", async (_req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const safe = allUsers.map(u => ({ username: u.username, role: u.role }));
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

      return res.json({ username: user.username, role: user.role });
    } catch (e) {
      console.error("Create user error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/users/:username", async (req: Request, res: Response) => {
    try {
      const username = req.params.username as string;
      if (username.toLowerCase() === "admin" || username.toLowerCase() === "darryl") {
        return res.status(403).json({ error: "Cannot delete default admin accounts" });
      }
      await storage.deleteUser(username);
      return res.json({ success: true });
    } catch (e) {
      console.error("Delete user error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ── Projects ──────────────────────────────────────────────────────────────

  // Fix #3: read role and username from the session, not from query params,
  // to eliminate the role-bypass vulnerability.
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      const { username, role } = req.session.user!;
      const allProjects = await storage.getAllProjects();

      if (role === "admin") {
        return res.json(allProjects);
      }

      const filtered = allProjects.filter(p =>
        (p.assignedMembers as string[])?.includes(username),
      );
      return res.json(filtered);
    } catch (e) {
      console.error("Get projects error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // Fix #8: validate the request body before passing it to storage.
  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const parsed = insertProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const project = await storage.createProject(parsed.data);
      return res.json(project);
    } catch (e) {
      console.error("Create project error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const updated = await storage.updateProject(req.params.id as string, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Project not found" });
      }
      return res.json(updated);
    } catch (e) {
      console.error("Update project error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteProject(req.params.id as string);
      return res.json({ success: true });
    } catch (e) {
      console.error("Delete project error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ── Task States ───────────────────────────────────────────────────────────

  app.get("/api/task-states", async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      if (projectId) {
        return res.json(await storage.getTaskStatesByProjectId(projectId));
      }
      return res.json(await storage.getAllTaskStates());
    } catch (e) {
      console.error("Get task states error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/task-states/bulk", async (req: Request, res: Response) => {
    try {
      const { states } = req.body;
      if (!Array.isArray(states)) {
        return res.status(400).json({ error: "states array required" });
      }
      // Fix #8: validate each state object.
      const validated: any[] = [];
      for (const state of states) {
        const parsed = insertTaskStateSchema.safeParse(state);
        if (!parsed.success) {
          return res.status(400).json({ error: parsed.error.flatten() });
        }
        validated.push(parsed.data);
      }
      const created = await storage.bulkCreateTaskStates(validated);
      return res.json(created);
    } catch (e) {
      console.error("Bulk create task states error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/task-states/:projectId/:uid", async (req: Request, res: Response) => {
    try {
      const updated = await storage.updateTaskState(
        req.params.projectId as string,
        req.params.uid as string,
        req.body,
      );
      if (!updated) {
        return res.status(404).json({ error: "Task state not found" });
      }
      return res.json(updated);
    } catch (e) {
      console.error("Update task state error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ── Reports ───────────────────────────────────────────────────────────────

  app.get("/api/reports", async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      if (projectId) {
        return res.json(await storage.getReportsByProjectId(projectId));
      }
      return res.json(await storage.getAllReports());
    } catch (e) {
      console.error("Get reports error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // Fix #8: validate the report body.
  app.post("/api/reports", async (req: Request, res: Response) => {
    try {
      const parsed = insertReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const report = await storage.createReport(parsed.data);
      return res.json(report);
    } catch (e) {
      console.error("Create report error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/reports/:id", async (req: Request, res: Response) => {
    try {
      const updated = await storage.updateReport(req.params.id as string, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Report not found" });
      }
      return res.json(updated);
    } catch (e) {
      console.error("Update report error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ── Messages ──────────────────────────────────────────────────────────────

  app.get("/api/messages", async (_req: Request, res: Response) => {
    try {
      return res.json(await storage.getAllMessages());
    } catch (e) {
      console.error("Get messages error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // Fix #8: validate the message body.
  app.post("/api/messages", async (req: Request, res: Response) => {
    try {
      const parsed = insertMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const message = await storage.createMessage(parsed.data);
      return res.json(message);
    } catch (e) {
      console.error("Create message error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/messages/:id/read", async (req: Request, res: Response) => {
    try {
      await storage.markMessageRead(req.params.id as string);
      return res.json({ success: true });
    } catch (e) {
      console.error("Mark message read error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
