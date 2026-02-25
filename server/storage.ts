import { type User, type InsertUser, type Project, type TaskState, type Report, type Message, users, projects, taskStates, reports, messages } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(username: string): Promise<void>;
  seedDefaults(): Promise<void>;

  getAllProjects(): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | undefined>;
  createProject(project: Omit<Project, "id">): Promise<Project>;
  updateProject(id: string, updates: Partial<Omit<Project, "id">>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  getTaskStatesByProjectId(projectId: string): Promise<TaskState[]>;
  getAllTaskStates(): Promise<TaskState[]>;
  createTaskState(state: Omit<TaskState, "id">): Promise<TaskState>;
  bulkCreateTaskStates(states: Omit<TaskState, "id">[]): Promise<TaskState[]>;
  updateTaskState(projectId: string, uid: string, updates: Partial<TaskState>): Promise<TaskState | undefined>;

  getAllReports(): Promise<Report[]>;
  getReportsByProjectId(projectId: string): Promise<Report[]>;
  createReport(report: Omit<Report, "id">): Promise<Report>;
  updateReport(id: string, updates: Partial<Report>): Promise<Report | undefined>;

  getAllMessages(): Promise<Message[]>;
  createMessage(message: Omit<Message, "id">): Promise<Message>;
  markMessageRead(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const allUsers = await db.select().from(users);
    return allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async deleteUser(username: string): Promise<void> {
    const user = await this.getUserByUsername(username);
    if (user) {
      await db.delete(users).where(eq(users.id, user.id));
    }
  }

  async seedDefaults(): Promise<void> {
    const defaults = [
      { username: "Admin", password: "adminpassword", role: "admin" },
      { username: "Darryl", password: "schindler1", role: "admin" },
    ];

    for (const def of defaults) {
      const existing = await this.getUserByUsername(def.username);
      if (!existing) {
        await this.createUser(def);
      }
    }
  }

  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects);
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: Omit<Project, "id">): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: string, updates: Partial<Omit<Project, "id">>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(taskStates).where(eq(taskStates.projectId, id));
    await db.delete(reports).where(eq(reports.projectId, id));
    await db.delete(messages).where(eq(messages.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getTaskStatesByProjectId(projectId: string): Promise<TaskState[]> {
    return db.select().from(taskStates).where(eq(taskStates.projectId, projectId));
  }

  async getAllTaskStates(): Promise<TaskState[]> {
    return db.select().from(taskStates);
  }

  async createTaskState(state: Omit<TaskState, "id">): Promise<TaskState> {
    const [created] = await db.insert(taskStates).values(state).returning();
    return created;
  }

  async bulkCreateTaskStates(states: Omit<TaskState, "id">[]): Promise<TaskState[]> {
    if (states.length === 0) return [];
    const created = await db.insert(taskStates).values(states).returning();
    return created;
  }

  async updateTaskState(projectId: string, uid: string, updates: Partial<TaskState>): Promise<TaskState | undefined> {
    const { id: _id, ...safeUpdates } = updates as any;
    const [updated] = await db
      .update(taskStates)
      .set(safeUpdates)
      .where(and(eq(taskStates.projectId, projectId), eq(taskStates.uid, uid)))
      .returning();
    return updated;
  }

  async getAllReports(): Promise<Report[]> {
    return db.select().from(reports);
  }

  async getReportsByProjectId(projectId: string): Promise<Report[]> {
    return db.select().from(reports).where(eq(reports.projectId, projectId));
  }

  async createReport(report: Omit<Report, "id">): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report | undefined> {
    const { id: _id, ...safeUpdates } = updates as any;
    const [updated] = await db.update(reports).set(safeUpdates).where(eq(reports.id, id)).returning();
    return updated;
  }

  async getAllMessages(): Promise<Message[]> {
    return db.select().from(messages);
  }

  async createMessage(message: Omit<Message, "id">): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async markMessageRead(id: string): Promise<void> {
    await db.update(messages).set({ read: true }).where(eq(messages.id, id));
  }
}

export const storage = new DatabaseStorage();
