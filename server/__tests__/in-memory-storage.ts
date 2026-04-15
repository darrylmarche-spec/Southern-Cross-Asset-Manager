/**
 * InMemoryStorage – a fully in-memory implementation of IStorage.
 *
 * Used by:
 *  - storage.test.ts  (contract / behaviour tests, no real DB required)
 *  - routes.test.ts   (injected via vi.mock so route logic can be tested in isolation)
 *
 * Mirrors DatabaseStorage behaviour including password hashing on createUser.
 */

import type { IStorage } from '../storage';
import type { User, InsertUser, Project, TaskState, Report, Message } from '../../shared/schema';
import { hashPassword } from '../../lib/auth';

export class InMemoryStorage implements IStorage {
  private users: User[] = [];
  private projects: Project[] = [];
  private taskStates: TaskState[] = [];
  private reports: Report[] = [];
  private messages: Message[] = [];
  private counter = 0;

  private nextId(): string {
    return String(++this.counter);
  }

  /** Reset all data (call in beforeEach to get a clean slate). */
  reset() {
    this.users = [];
    this.projects = [];
    this.taskStates = [];
    this.reports = [];
    this.messages = [];
    this.counter = 0;
  }

  // ── Users ────────────────────────────────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  // Fix #1: hash the password before storing, matching DatabaseStorage.
  async createUser(insertUser: InsertUser): Promise<User> {
    const existing = await this.getUserByUsername(insertUser.username);
    if (existing) throw new Error(`Username "${insertUser.username}" already exists`);
    const hashed = await hashPassword(insertUser.password);
    const user: User = { id: this.nextId(), role: 'member', ...insertUser, password: hashed };
    this.users.push(user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.users];
  }

  async deleteUser(username: string): Promise<void> {
    this.users = this.users.filter(
      u => u.username.toLowerCase() !== username.toLowerCase(),
    );
  }

  async seedDefaults(): Promise<void> {
    const defaults = [
      { username: 'Davor', password: process.env.SEED_PASSWORD_DAVOR ?? 'change-me', role: 'admin' as const },
      { username: 'Darryl', password: process.env.SEED_PASSWORD_DARRYL ?? 'change-me', role: 'admin' as const },
    ];
    for (const d of defaults) {
      const existing = await this.getUserByUsername(d.username);
      if (!existing) await this.createUser(d);
    }
  }

  // ── Projects ─────────────────────────────────────────────────────────────

  async getAllProjects(): Promise<Project[]> {
    return [...this.projects];
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    return this.projects.find(p => p.id === id);
  }

  async createProject(project: Omit<Project, 'id'>): Promise<Project> {
    const created: Project = { id: this.nextId(), ...project };
    this.projects.push(created);
    return created;
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id'>>): Promise<Project | undefined> {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.projects[idx] = { ...this.projects[idx], ...updates };
    return this.projects[idx];
  }

  async deleteProject(id: string): Promise<void> {
    this.taskStates = this.taskStates.filter(t => t.projectId !== id);
    this.reports = this.reports.filter(r => r.projectId !== id);
    this.messages = this.messages.filter(m => m.projectId !== id);
    this.projects = this.projects.filter(p => p.id !== id);
  }

  // ── Task States ───────────────────────────────────────────────────────────

  async getTaskStatesByProjectId(projectId: string): Promise<TaskState[]> {
    return this.taskStates.filter(t => t.projectId === projectId);
  }

  async getAllTaskStates(): Promise<TaskState[]> {
    return [...this.taskStates];
  }

  async createTaskState(state: Omit<TaskState, 'id'>): Promise<TaskState> {
    const created: TaskState = { id: this.nextId(), ...state };
    this.taskStates.push(created);
    return created;
  }

  async bulkCreateTaskStates(states: Omit<TaskState, 'id'>[]): Promise<TaskState[]> {
    if (states.length === 0) return [];
    return Promise.all(states.map(s => this.createTaskState(s)));
  }

  async updateTaskState(
    projectId: string,
    uid: string,
    updates: Partial<TaskState>,
  ): Promise<TaskState | undefined> {
    const { id: _id, ...safeUpdates } = updates as any;
    const idx = this.taskStates.findIndex(t => t.projectId === projectId && t.uid === uid);
    if (idx === -1) return undefined;
    this.taskStates[idx] = { ...this.taskStates[idx], ...safeUpdates };
    return this.taskStates[idx];
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  async getAllReports(): Promise<Report[]> {
    return [...this.reports];
  }

  async getReportsByProjectId(projectId: string): Promise<Report[]> {
    return this.reports.filter(r => r.projectId === projectId);
  }

  async createReport(report: Omit<Report, 'id'>): Promise<Report> {
    const created: Report = { id: this.nextId(), ...report };
    this.reports.push(created);
    return created;
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report | undefined> {
    const { id: _id, ...safeUpdates } = updates as any;
    const idx = this.reports.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    this.reports[idx] = { ...this.reports[idx], ...safeUpdates };
    return this.reports[idx];
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  async getAllMessages(): Promise<Message[]> {
    return [...this.messages];
  }

  async createMessage(message: Omit<Message, 'id'>): Promise<Message> {
    const created: Message = { id: this.nextId(), ...message };
    this.messages.push(created);
    return created;
  }

  async markMessageRead(id: string): Promise<void> {
    const msg = this.messages.find(m => m.id === id);
    if (msg) msg.read = true;
  }
}
