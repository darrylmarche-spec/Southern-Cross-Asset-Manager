import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, boolean, unique, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Enum types ────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["admin", "member"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "completed"]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "reviewed"]);
export const reportTypeEnum = pgEnum("report_type", ["generate", "manual"]);
export const messageTypeEnum = pgEnum("message_type", ["message", "parts_request"]);

// ── Tables ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("member"),
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

export const taskStates = pgTable(
  "task_states",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    uid: text("uid").notNull(),
    projectId: text("project_id").notNull(),
    status: taskStatusEnum("status").notNull().default("pending"),
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
  },
  (table) => ({
    projectUidUnique: unique("task_states_project_uid_unique").on(
      table.projectId,
      table.uid,
    ),
  }),
);

export const reports = pgTable("reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  projectId: text("project_id").notNull(),
  submittedBy: text("submitted_by").notNull(),
  submittedAt: text("submitted_at").notNull(),
  type: reportTypeEnum("type").notNull().default("generate"),
  content: text("content").default(""),
  notes: text("notes").default(""),
  subject: text("subject").default(""),
  status: reportStatusEnum("status").notNull().default("pending"),
});

export const messages = pgTable("messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: messageTypeEnum("type").notNull().default("message"),
  projectId: text("project_id").notNull(),
  projectName: text("project_name").notNull(),
  senderUsername: text("sender_username").notNull(),
  subject: text("subject").notNull(),
  body: text("body").default(""),
  attachments: jsonb("attachments").$type<any[]>().default([]),
  sentAt: text("sent_at").notNull(),
  read: boolean("read").notNull().default(false),
});

// ── Zod insert schemas ────────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });

export const insertTaskStateSchema = createInsertSchema(taskStates).omit({ id: true });

export const insertReportSchema = createInsertSchema(reports).omit({ id: true });

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });

// ── TypeScript types ──────────────────────────────────────────────────────────

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type TaskState = typeof taskStates.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Message = typeof messages.$inferSelect;
