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

  // --- Projects ---

  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      const username = req.query.username as string | undefined;
      const role = req.query.role as string | undefined;
      const allProjects = await storage.getAllProjects();

      if (role === "admin") {
        return res.json(allProjects);
      }

      if (username) {
        const filtered = allProjects.filter(p =>
          (p.assignedMembers as string[])?.includes(username)
        );
        return res.json(filtered);
      }

      return res.json(allProjects);
    } catch (e) {
      console.error("Get projects error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const project = await storage.createProject(req.body);
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

  // --- Task States ---

  app.get("/api/task-states", async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      if (projectId) {
        const states = await storage.getTaskStatesByProjectId(projectId);
        return res.json(states);
      }
      const all = await storage.getAllTaskStates();
      return res.json(all);
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
      const created = await storage.bulkCreateTaskStates(states);
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
        req.body
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

  // --- Reports ---

  app.get("/api/reports", async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      if (projectId) {
        const rpts = await storage.getReportsByProjectId(projectId);
        return res.json(rpts);
      }
      const all = await storage.getAllReports();
      return res.json(all);
    } catch (e) {
      console.error("Get reports error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/reports", async (req: Request, res: Response) => {
    try {
      const report = await storage.createReport(req.body);
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

  // --- Messages ---

  app.get("/api/messages", async (_req: Request, res: Response) => {
    try {
      const all = await storage.getAllMessages();
      return res.json(all);
    } catch (e) {
      console.error("Get messages error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/messages", async (req: Request, res: Response) => {
    try {
      const message = await storage.createMessage(req.body);
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
