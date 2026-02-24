import { type User, type InsertUser, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(username: string): Promise<void>;
  seedDefaults(): Promise<void>;
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
}

export const storage = new DatabaseStorage();
