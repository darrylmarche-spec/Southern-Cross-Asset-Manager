import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("member"),
});

export const projects = pgTable("projects", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  customer: text("customer").notNull(),
  projectName: text("project_name").notNull(),
  location: text("location").notNull(),
  commissionNumber: text("commission_number").notNull(),
  escalatorType: text("escalator_type").notNull().default("Escalator"),
  dateOfCompletion: text("date_of_completion").default(""),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by").notNull(),
  assignedMembers: jsonb("assigned_members").$type<string[]>().default([]),
});

export const taskStates = pgTable("task_states", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  uid: text("uid").notNull(),
  projectId: text("project_id").notNull(),
  status: text("status").notNull().default("pending"),
  assignedTo: text("assigned_to").default(""),
  dueDate: text("due_date").default(""),
  actDuration: text("act_duration").default(""),
  actLabor: text("act_labor").default(""),
  comments: text("comments").default(""),
  response: text("response").default(""),
  remarks: text("remarks").default(""),
  completedBy: text("completed_by").default(""),
  completedAt: text("completed_at").default(""),
  attachments: jsonb("attachments").$type<any[]>().default([]),
  commentHistory: jsonb("comment_history").$type<any[]>().default([]),
});

export const reports = pgTable("reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  projectId: text("project_id").notNull(),
  submittedBy: text("submitted_by").notNull(),
  submittedAt: text("submitted_at").notNull(),
  type: text("type").notNull().default("generate"),
  content: text("content").default(""),
  notes: text("notes").default(""),
  subject: text("subject").default(""),
  status: text("status").notNull().default("pending"),
});

export const messages = pgTable("messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: text("type").notNull().default("message"),
  projectId: text("project_id").notNull(),
  projectName: text("project_name").notNull(),
  senderUsername: text("sender_username").notNull(),
  subject: text("subject").notNull(),
  body: text("body").default(""),
  attachments: jsonb("attachments").$type<any[]>().default([]),
  sentAt: text("sent_at").notNull(),
  read: boolean("read").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type TaskState = typeof taskStates.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Message = typeof messages.$inferSelect;
